import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Headphones, Loader2, Mic, Music2, Pause, Play, SkipForward, Sparkles } from 'lucide-react';

const ROOT_FREQUENCIES: Record<string, number> = {
  C: 65.41, D: 73.42, E: 82.41, F: 87.31, G: 98, A: 110, B: 123.47,
};

type RoomState = 'idle' | 'count-in' | 'playing';

function chordRoot(chord: string) {
  return chord.charAt(0).toUpperCase();
}

function playTone(context: AudioContext, frequency: number, volume: number, duration: number, type: OscillatorType = 'sine') {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.02);
}

function playCountClick(context: AudioContext, accented: boolean) {
  playTone(context, accented ? 1046.5 : 783.99, accented ? 0.18 : 0.11, 0.08);
}

function playBandBeat(context: AudioContext, chord: string, accented: boolean) {
  const root = ROOT_FREQUENCIES[chordRoot(chord)] || 98;
  playTone(context, root, accented ? 0.14 : 0.075, accented ? 0.28 : 0.17, 'triangle');
  playTone(context, accented ? 92 : 520, accented ? 0.07 : 0.025, accented ? 0.1 : 0.035, accented ? 'sine' : 'square');
}

export default function FollowMeLiveRoom({ chords, tempo }: { chords: string[]; tempo: number }) {
  const [roomState, setRoomState] = useState<RoomState>('idle');
  const [starting, setStarting] = useState(false);
  const [activeChordIndex, setActiveChordIndex] = useState(0);
  const [signalLevel, setSignalLevel] = useState(0);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countInBeat, setCountInBeat] = useState(0);
  const [bandBeat, setBandBeat] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const countTimerRef = useRef<number | null>(null);
  const bandTimerRef = useRef<number | null>(null);
  const microphoneActiveRef = useRef(false);
  const playingRef = useRef(false);
  const cooldownRef = useRef(0);
  const startedAtRef = useRef(0);
  const baselineRef = useRef(0.005);
  const frameRef = useRef(0);
  const activeChordRef = useRef(0);
  const bandBeatRef = useRef(0);
  const chordsRef = useRef(chords);

  const progressionKey = chords.join('|');
  const currentChord = chords[activeChordIndex];
  const nextChord = chords[(activeChordIndex + 1) % chords.length];

  const clearTimers = () => {
    if (countTimerRef.current !== null) window.clearTimeout(countTimerRef.current);
    if (bandTimerRef.current !== null) window.clearInterval(bandTimerRef.current);
    countTimerRef.current = null;
    bandTimerRef.current = null;
  };

  const stopLiveRoom = () => {
    clearTimers();
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    microphoneActiveRef.current = false;
    playingRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    contextRef.current?.close();
    contextRef.current = null;
    setRoomState('idle');
    setCountInBeat(0);
    setBandBeat(0);
    setSignalLevel(0);
  };

  const moveBand = (source: 'signal' | 'manual') => {
    const route = chordsRef.current;
    const nextIndex = (activeChordRef.current + 1) % route.length;
    activeChordRef.current = nextIndex;
    setActiveChordIndex(nextIndex);
    const next = route[nextIndex];
    if (contextRef.current) playBandBeat(contextRef.current, next, true);
    setLastMove(source === 'signal' ? `Your change was heard — the band moved to ${next}.` : `The band has moved to ${next}.`);
  };

  const analyse = () => {
    const analyser = analyserRef.current;
    if (!analyser || !microphoneActiveRef.current) return;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let index = 0; index < data.length; index += 1) {
      const sample = (data[index] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / data.length);
    const baseline = baselineRef.current;
    const threshold = Math.max(0.035, baseline * 3.4);
    const now = Date.now();
    const warmedUp = now - startedAtRef.current > 750;
    if (playingRef.current && warmedUp && rms > threshold && now - cooldownRef.current > 850) {
      cooldownRef.current = now;
      baselineRef.current = Math.min(rms, 0.04);
      moveBand('signal');
    } else if (rms < threshold * 0.7) {
      baselineRef.current = baseline * 0.98 + rms * 0.02;
    }
    frameRef.current += 1;
    if (frameRef.current % 3 === 0) setSignalLevel(Math.min(1, rms / 0.12));
    rafRef.current = window.requestAnimationFrame(analyse);
  };

  const startBand = () => {
    const context = contextRef.current;
    if (!context) return;
    setRoomState('playing');
    playingRef.current = true;
    startedAtRef.current = Date.now();
    bandBeatRef.current = 0;
    setBandBeat(0);
    setLastMove(`The band is on ${chordsRef.current[0]}. Play a clear change when you are ready to move on.`);
    const bandTick = () => {
      const currentBeat = bandBeatRef.current;
      playBandBeat(context, chordsRef.current[activeChordRef.current], currentBeat === 0);
      setBandBeat(currentBeat);
      bandBeatRef.current = (currentBeat + 1) % 4;
    };
    bandTick();
    bandTimerRef.current = window.setInterval(bandTick, 60000 / tempo);
  };

  const beginCountIn = () => {
    const context = contextRef.current;
    if (!context) return;
    setRoomState('count-in');
    let beatNumber = 0;
    const count = () => {
      beatNumber += 1;
      setCountInBeat(beatNumber);
      playCountClick(context, beatNumber === 1);
      if (beatNumber === 4) {
        countTimerRef.current = window.setTimeout(startBand, 60000 / tempo);
      } else {
        countTimerRef.current = window.setTimeout(count, 60000 / tempo);
      }
    };
    count();
  };

  const startLiveRoom = async () => {
    setStarting(true);
    setError(null);
    setLastMove(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const context = new window.AudioContext();
      if (context.state === 'suspended') await context.resume();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);
      streamRef.current = stream;
      contextRef.current = context;
      analyserRef.current = analyser;
      baselineRef.current = 0.005;
      cooldownRef.current = 0;
      startedAtRef.current = 0;
      activeChordRef.current = 0;
      setActiveChordIndex(0);
      microphoneActiveRef.current = true;
      window.requestAnimationFrame(analyse);
      beginCountIn();
    } catch (captureError: unknown) {
      setError(captureError instanceof Error ? captureError.message : 'Microphone access could not start. Check your browser permissions and try again.');
      stopLiveRoom();
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => () => {
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    if (countTimerRef.current !== null) window.clearTimeout(countTimerRef.current);
    if (bandTimerRef.current !== null) window.clearInterval(bandTimerRef.current);
    microphoneActiveRef.current = false;
    playingRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    analyserRef.current?.disconnect();
    contextRef.current?.close();
  }, []);
  useEffect(() => {
    chordsRef.current = chords;
    activeChordRef.current = 0;
    setActiveChordIndex(0);
    setLastMove(null);
  }, [chords, progressionKey]);

  const isRunning = roomState !== 'idle';
  const statusLabel = roomState === 'count-in' ? 'Get ready — count-in is running' : roomState === 'playing' ? 'The room is following your changes locally' : 'Microphone is off';

  return (
    <section className="mt-6 rounded-2xl overflow-hidden border border-violet-200 bg-gradient-to-br from-ink-900 via-violet-950 to-sage-950 text-white shadow-soft">
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.16em] font-semibold text-sage-200">Private responsive practice</p><h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold">Follow Me Live Room</h2><p className="mt-2 max-w-xl text-sm text-white/70">Take a four-beat count-in, then keep the band with you. Play a fresh change and the bass moves to the next chord in your route.</p></div><div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0"><Music2 className="w-6 h-6 text-sage-200" /></div></div>

        <div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-white/55 font-semibold">The live route</p><p className="mt-1 text-sm text-white/75">The band knows this route, but it waits for your next clear guitar change.</p></div><span className="rounded-full bg-sage-200/15 px-3 py-1 text-xs font-semibold text-sage-100">{tempo} bpm pace</span></div><div className="mt-4 flex flex-wrap gap-1.5">{chords.map((chord, index) => <span key={`${chord}-${index}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${index === activeChordIndex && roomState === 'playing' ? 'border-sage-200 bg-sage-200 text-ink-900' : 'border-white/15 bg-white/5 text-white/70'}`}>{index + 1}. {chord}</span>)}</div></div>

        {roomState === 'count-in' ? <div className="mt-5 rounded-xl border border-amber-200/35 bg-amber-200/10 p-5 text-center"><p className="text-xs uppercase tracking-[0.14em] font-semibold text-amber-100">Count in</p><div className="mt-3 flex justify-center gap-2">{[1, 2, 3, 4].map((beat) => <span key={beat} className={`w-12 h-12 rounded-xl flex items-center justify-center font-display text-2xl font-semibold transition ${beat === countInBeat ? 'bg-amber-200 text-ink-900 scale-110' : beat < countInBeat ? 'bg-amber-100/25 text-amber-100' : 'bg-white/5 text-white/40'}`}>{beat}</span>)}</div><p className="mt-4 text-sm text-amber-50/90">Get your first chord ready. The band begins on <strong>{chords[0]}</strong> after beat four.</p></div> : <><div className="mt-5 grid sm:grid-cols-[1fr,auto,1fr] items-center gap-4"><div className="rounded-xl border border-white/15 bg-white/5 p-4 text-center"><p className="text-[11px] uppercase tracking-[0.13em] text-white/50">The band is on</p><p className="mt-1 font-display text-5xl font-semibold">{currentChord}</p><div className="mt-3 flex justify-center gap-1.5" aria-label={`Band beat ${bandBeat + 1} of 4`}>{[0, 1, 2, 3].map((beat) => <span key={beat} className={`h-2.5 w-2.5 rounded-full ${roomState === 'playing' && beat === bandBeat ? 'bg-sage-200 scale-125' : 'bg-white/20'}`} />)}</div></div><div className="hidden sm:block text-2xl text-sage-200">→</div><div className="rounded-xl border border-white/10 bg-black/10 p-4 text-center"><p className="text-[11px] uppercase tracking-[0.13em] text-white/50">Show this next</p><p className="mt-1 font-display text-5xl font-semibold text-sage-200">{nextChord}</p><p className="mt-3 text-xs text-white/60">The screen and band update together when you move.</p></div></div>

        <div className="mt-5 rounded-xl border border-white/15 bg-black/15 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Mic className={`w-5 h-5 ${roomState === 'playing' ? 'text-rose-300 animate-pulse' : 'text-white/60'}`} /><span className="text-sm font-semibold">{statusLabel}</span></div><span className="text-xs text-white/55">No audio is recorded or sent anywhere</span></div><div className="mt-3 h-2.5 rounded-full bg-white/10 overflow-hidden"><div className={`h-full rounded-full transition-all ${roomState === 'playing' ? 'bg-gradient-to-r from-sage-300 via-sky-300 to-violet-300' : 'bg-white/20'}`} style={{ width: `${Math.max(4, signalLevel * 100)}%` }} /></div><p className="mt-2 text-xs text-white/60">A clear strum or picked change advances the chord route. The app listens for a change signal, not whether the chord is perfect.</p></div>
        </>}

        {lastMove && <div className="mt-4 rounded-xl border border-sage-200/25 bg-sage-200/10 px-4 py-3 text-sm text-sage-100 flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /><span>{lastMove}</span></div>}
        {error && <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}

        <div className="mt-5 grid sm:grid-cols-2 gap-3"><button type="button" onClick={isRunning ? stopLiveRoom : startLiveRoom} className="rounded-xl bg-sage-200 text-ink-900 px-4 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-sage-100 transition" disabled={starting}>{starting ? <><Loader2 className="w-5 h-5 animate-spin" /> Starting private mic…</> : isRunning ? <><Pause className="w-5 h-5" /> Stop Live Room</> : <><Play className="w-5 h-5" /> Start with a 4-beat count-in</>}</button><button type="button" onClick={() => moveBand('manual')} disabled={roomState !== 'playing'} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-white/15 transition disabled:cursor-not-allowed disabled:opacity-40"><SkipForward className="w-5 h-5" /> Need a nudge? Move on</button></div>

        <div className="mt-4 rounded-xl border border-sky-200/15 bg-sky-200/10 px-4 py-3 text-xs leading-relaxed text-sky-100 flex items-start gap-2"><Headphones className="w-4 h-4 mt-0.5 shrink-0" /><span><strong>For the cleanest response, use headphones or keep the device volume low.</strong> The microphone processes live sound only in this browser to notice a new change signal; it never creates a recording.</span></div>
      </div>
    </section>
  );
}

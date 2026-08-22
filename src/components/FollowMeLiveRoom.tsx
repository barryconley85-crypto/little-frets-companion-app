import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Headphones, Loader2, Mic, Music2, Pause, Play, SkipForward, Sparkles } from 'lucide-react';

const ROOT_FREQUENCIES: Record<string, number> = {
  C: 65.41, D: 73.42, E: 82.41, F: 87.31, G: 98, A: 110, B: 123.47,
};

type RoomState = 'idle' | 'count-in' | 'playing';
type StyleId = 'campfire' | 'indie' | 'pop' | 'blues' | 'soul' | 'rock';
type LiveStyle = { id: StyleId; title: string; detail: string; tempoGuide: string; accent: string };

const LIVE_STYLES: LiveStyle[] = [
  { id: 'campfire', title: 'Campfire', detail: 'Warm acoustic pulse', tempoGuide: '60–95 bpm', accent: 'border-amber-200 bg-amber-50 text-amber-950' },
  { id: 'indie', title: 'Indie', detail: 'Soft kick, snare, and bass', tempoGuide: '75–120 bpm', accent: 'border-violet-200 bg-violet-50 text-violet-950' },
  { id: 'pop', title: 'Pop', detail: 'Bright, steady four-on-the-floor', tempoGuide: '90–135 bpm', accent: 'border-sky-200 bg-sky-50 text-sky-950' },
  { id: 'blues', title: 'Blues Club', detail: 'Root-and-fifth shuffle feel', tempoGuide: '65–115 bpm', accent: 'border-rose-200 bg-rose-50 text-rose-950' },
  { id: 'soul', title: 'Soul', detail: 'Rounded bass and pocket drums', tempoGuide: '65–105 bpm', accent: 'border-sage-200 bg-sage-50 text-sage-950' },
  { id: 'rock', title: 'Rock Stage', detail: 'Big kick, snare, and driving bass', tempoGuide: '95–150 bpm', accent: 'border-orange-200 bg-orange-50 text-orange-950' },
];

function chordRoot(chord: string) {
  return chord.charAt(0).toUpperCase();
}

function playTone(context: AudioContext, output: AudioNode, frequency: number, volume: number, duration: number, type: OscillatorType = 'sine') {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain).connect(output);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.02);
}

function playCountClick(context: AudioContext, output: AudioNode, accented: boolean) {
  playTone(context, output, accented ? 1046.5 : 783.99, accented ? 0.3 : 0.2, 0.085);
}

function playNoise(context: AudioContext, output: AudioNode, volume: number, duration: number, highPass: number) {
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
  const values = buffer.getChannelData(0);
  for (let index = 0; index < values.length; index += 1) values[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = 'highpass';
  filter.frequency.value = highPass;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(output);
  source.start();
}

function playKick(context: AudioContext, output: AudioNode, volume = 0.16) {
  playTone(context, output, 92, volume, 0.13, 'sine');
}

function playSnare(context: AudioContext, output: AudioNode, volume = 0.095) {
  playNoise(context, output, volume, 0.11, 1250);
}

function playHat(context: AudioContext, output: AudioNode, volume = 0.035) {
  playNoise(context, output, volume, 0.045, 5000);
}

function playBandBeat(context: AudioContext, output: AudioNode, chord: string, beat: number, style: LiveStyle, accented = false) {
  const root = ROOT_FREQUENCIES[chordRoot(chord)] || 98;
  const onBackbeat = beat === 1 || beat === 3;
  const bass = (frequency: number, volume: number, duration: number, wave: OscillatorType = 'triangle') => {
    playTone(context, output, frequency, volume, duration, wave);
    playTone(context, output, frequency * 2, volume * 0.22, duration * 0.72, 'sine');
  };

  if (style.id === 'campfire') {
    if (beat === 0 || beat === 2 || accented) bass(root, 0.21, 0.28, 'triangle');
    if (beat === 0) playKick(context, output, 0.07);
    if (onBackbeat) playHat(context, output, 0.018);
    return;
  }
  if (style.id === 'indie') {
    bass(root, beat === 0 || accented ? 0.23 : 0.14, 0.22, 'triangle');
    if (beat === 0 || beat === 2) playKick(context, output, 0.14);
    if (onBackbeat) playSnare(context, output, 0.075);
    playHat(context, output, 0.028);
    return;
  }
  if (style.id === 'pop') {
    bass(root, 0.18, 0.2, 'sine');
    playKick(context, output, 0.17);
    if (onBackbeat) playSnare(context, output, 0.105);
    playHat(context, output, 0.042);
    return;
  }
  if (style.id === 'blues') {
    bass(beat === 1 || beat === 3 ? root * 1.5 : root, beat === 0 || accented ? 0.24 : 0.15, 0.26, 'triangle');
    if (beat === 0 || beat === 2) playKick(context, output, 0.11);
    if (onBackbeat) playSnare(context, output, 0.06);
    playHat(context, output, 0.02);
    return;
  }
  if (style.id === 'soul') {
    bass(beat === 2 ? root * 2 : root, beat === 0 || accented ? 0.21 : 0.13, 0.24, 'sine');
    if (beat === 0) playKick(context, output, 0.1);
    if (onBackbeat) playSnare(context, output, 0.05);
    playHat(context, output, 0.023);
    return;
  }
  bass(root, beat === 0 || accented ? 0.27 : 0.18, 0.23, 'sawtooth');
  if (beat === 0 || beat === 2) playKick(context, output, 0.2);
  if (onBackbeat) playSnare(context, output, 0.12);
  playHat(context, output, 0.045);
}

export default function FollowMeLiveRoom({ chords, tempo }: { chords: string[]; tempo: number }) {
  const [roomState, setRoomState] = useState<RoomState>('idle');
  const [styleId, setStyleId] = useState<StyleId>('indie');
  const [backingVolume, setBackingVolume] = useState(85);
  const [responseMode, setResponseMode] = useState<'responsive' | 'balanced' | 'calm'>('responsive');
  const [starting, setStarting] = useState(false);
  const [activeChordIndex, setActiveChordIndex] = useState(0);
  const [signalLevel, setSignalLevel] = useState(0);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countInBeat, setCountInBeat] = useState(0);
  const [bandBeat, setBandBeat] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
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
  const selectedStyle = LIVE_STYLES.find((style) => style.id === styleId) || LIVE_STYLES[0];
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
    masterGainRef.current?.disconnect();
    masterGainRef.current = null;
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
    if (contextRef.current && masterGainRef.current) playBandBeat(contextRef.current, masterGainRef.current, next, 0, selectedStyle, true);
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
    const sensitivity = responseMode === 'responsive' ? { floor: 0.016, multiplier: 1.65, cooldown: 470 } : responseMode === 'balanced' ? { floor: 0.024, multiplier: 2.25, cooldown: 650 } : { floor: 0.034, multiplier: 3.1, cooldown: 850 };
    const threshold = Math.max(sensitivity.floor, baseline * sensitivity.multiplier);
    const now = Date.now();
    const warmedUp = now - startedAtRef.current > 500;
    if (playingRef.current && warmedUp && rms > threshold && now - cooldownRef.current > sensitivity.cooldown) {
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
    const master = masterGainRef.current;
    if (!context || !master) return;
    setRoomState('playing');
    playingRef.current = true;
    startedAtRef.current = Date.now();
    bandBeatRef.current = 0;
    setBandBeat(0);
    setLastMove(`The band is on ${chordsRef.current[0]}. Play a clear change when you are ready to move on.`);
    const bandTick = () => {
      const currentBeat = bandBeatRef.current;
      playBandBeat(context, master, chordsRef.current[activeChordRef.current], currentBeat, selectedStyle);
      setBandBeat(currentBeat);
      bandBeatRef.current = (currentBeat + 1) % 4;
    };
    bandTick();
    bandTimerRef.current = window.setInterval(bandTick, 60000 / tempo);
  };

  const beginCountIn = () => {
    const context = contextRef.current;
    const master = masterGainRef.current;
    if (!context || !master) return;
    setRoomState('count-in');
    let beatNumber = 0;
    const count = () => {
      beatNumber += 1;
      setCountInBeat(beatNumber);
      playCountClick(context, master, beatNumber === 1);
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
      const master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.42;
      master.gain.value = backingVolume / 100;
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.12;
      source.connect(analyser);
      master.connect(compressor).connect(context.destination);
      streamRef.current = stream;
      contextRef.current = context;
      masterGainRef.current = master;
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
    masterGainRef.current?.disconnect();
    contextRef.current?.close();
  }, []);
  useEffect(() => {
    if (masterGainRef.current && contextRef.current) masterGainRef.current.gain.setTargetAtTime(backingVolume / 100, contextRef.current.currentTime, 0.02);
  }, [backingVolume]);
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
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.16em] font-semibold text-sage-200">Private responsive practice</p><h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold">Follow Me Live Room</h2><p className="mt-2 max-w-xl text-sm text-white/70">Take a four-beat count-in, then play with a local {selectedStyle.title.toLowerCase()} backing. Make a fresh change and the bass moves to the next chord in your route.</p></div><div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0"><Music2 className="w-6 h-6 text-sage-200" /></div></div>

        <div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-white/55 font-semibold">Choose your play-along style</p><p className="mt-1 text-sm text-white/75">Every style follows your chord route; choose the one that makes you want to keep playing.</p></div><span className="text-xs text-white/55">Stop the room to switch styles</span></div><div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">{LIVE_STYLES.map((style) => <button key={style.id} type="button" disabled={roomState !== 'idle'} onClick={() => setStyleId(style.id)} className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${styleId === style.id ? style.accent : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}`}><span className="block text-sm font-semibold">{style.title}</span><span className="mt-0.5 block text-[11px] leading-snug opacity-75">{style.detail}</span><span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.08em] opacity-65">{style.tempoGuide}</span></button>)}</div></div>

        <div className="mt-4 grid sm:grid-cols-2 gap-3"><div className="rounded-xl border border-white/15 bg-white/10 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">Backing volume</span><span className="text-sm font-semibold text-sage-200">{backingVolume}%</span></div><input aria-label="Live Room backing volume" type="range" min="35" max="100" step="5" value={backingVolume} onChange={(event) => setBackingVolume(Number(event.target.value))} className="mt-4 w-full accent-sage-300" /><p className="mt-2 text-xs text-white/60">Raise this if you can only hear a click. Start around 85% with headphones.</p></div><div className="rounded-xl border border-white/15 bg-white/10 p-4"><p className="text-sm font-semibold">Change response</p><div className="mt-3 grid grid-cols-3 gap-1.5">{([{ id: 'responsive', label: 'Responsive' }, { id: 'balanced', label: 'Balanced' }, { id: 'calm', label: 'Calm' }] as const).map((option) => <button key={option.id} type="button" onClick={() => setResponseMode(option.id)} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${responseMode === option.id ? 'bg-sage-200 text-ink-900' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>{option.label}</button>)}</div><p className="mt-2 text-xs text-white/60">Start Responsive if your strums are not moving the band; choose Calm if room noise causes jumps.</p></div></div>

        <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-white/55 font-semibold">The live route</p><p className="mt-1 text-sm text-white/75">The band knows this route, but it waits for your next clear guitar change.</p></div><span className="rounded-full bg-sage-200/15 px-3 py-1 text-xs font-semibold text-sage-100">{tempo} bpm pace</span></div><div className="mt-4 flex flex-wrap gap-1.5">{chords.map((chord, index) => <span key={`${chord}-${index}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${index === activeChordIndex && roomState === 'playing' ? 'border-sage-200 bg-sage-200 text-ink-900' : 'border-white/15 bg-white/5 text-white/70'}`}>{index + 1}. {chord}</span>)}</div></div>

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

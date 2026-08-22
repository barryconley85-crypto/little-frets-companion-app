import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Headphones, Loader2, Mic, Music2, Pause, Play, SkipForward, Sparkles } from 'lucide-react';

const ROOT_FREQUENCIES: Record<string, number> = {
  C: 65.41, D: 73.42, E: 82.41, F: 87.31, G: 98, A: 110, B: 123.47,
};

function chordRoot(chord: string) {
  return chord.charAt(0).toUpperCase();
}

function playBassCue(context: AudioContext, chord: string) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = ROOT_FREQUENCIES[chordRoot(chord)] || 98;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.35);
}

export default function FollowMeLiveRoom({ chords, tempo }: { chords: string[]; tempo: number }) {
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [activeChordIndex, setActiveChordIndex] = useState(0);
  const [signalLevel, setSignalLevel] = useState(0);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const listeningRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const cooldownRef = useRef(0);
  const startedAtRef = useRef(0);
  const baselineRef = useRef(0.005);
  const frameRef = useRef(0);
  const activeChordRef = useRef(0);

  const progressionKey = chords.join('|');
  const currentChord = chords[activeChordIndex];
  const nextChord = chords[(activeChordIndex + 1) % chords.length];

  const stopListening = () => {
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    contextRef.current?.close();
    contextRef.current = null;
    listeningRef.current = false;
    setListening(false);
    setSignalLevel(0);
  };

  const moveBand = (source: 'signal' | 'manual') => {
    const nextIndex = (activeChordRef.current + 1) % chords.length;
    activeChordRef.current = nextIndex;
    setActiveChordIndex(nextIndex);
    const next = chords[nextIndex];
    if (contextRef.current) playBassCue(contextRef.current, next);
    setLastMove(source === 'signal' ? `Fresh guitar change heard — the bass moved to ${next}.` : `You moved the band to ${next}.`);
  };

  const analyse = () => {
    const analyser = analyserRef.current;
    if (!analyser || !listeningRef.current) return;
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
    const warmedUp = now - startedAtRef.current > 900;
    if (warmedUp && rms > threshold && now - cooldownRef.current > 900) {
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

  const startListening = async () => {
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
      startedAtRef.current = Date.now();
      activeChordRef.current = activeChordIndex;
      listeningRef.current = true;
      setListening(true);
      playBassCue(context, chords[activeChordIndex]);
      window.requestAnimationFrame(analyse);
    } catch (captureError: unknown) {
      setError(captureError instanceof Error ? captureError.message : 'Microphone access could not start. Check your browser permissions and try again.');
      stopListening();
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => () => { stopListening(); }, []);
  useEffect(() => {
    activeChordRef.current = 0;
    setActiveChordIndex(0);
    setLastMove(null);
  }, [progressionKey]);

  return (
    <section className="mt-6 rounded-2xl overflow-hidden border border-violet-200 bg-gradient-to-br from-ink-900 via-violet-950 to-sage-950 text-white shadow-soft">
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.16em] font-semibold text-sage-200">Private responsive practice</p><h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold">Follow Me Live Room</h2><p className="mt-2 max-w-xl text-sm text-white/70">The band already knows your chord route. Play a clear new guitar change and the bass follows to the next chord.</p></div><div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0"><Music2 className="w-6 h-6 text-sage-200" /></div></div>

        <div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-white/55 font-semibold">The live route</p><p className="mt-1 text-sm text-white/75">The band waits for your change signal; it does not judge or identify the chord.</p></div><span className="rounded-full bg-sage-200/15 px-3 py-1 text-xs font-semibold text-sage-100">{tempo} bpm pace</span></div><div className="mt-4 flex flex-wrap gap-1.5">{chords.map((chord, index) => <span key={`${chord}-${index}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${index === activeChordIndex ? 'border-sage-200 bg-sage-200 text-ink-900' : 'border-white/15 bg-white/5 text-white/70'}`}>{index + 1}. {chord}</span>)}</div></div>

        <div className="mt-5 grid sm:grid-cols-[1fr,auto,1fr] items-center gap-4"><div className="rounded-xl border border-white/15 bg-white/5 p-4 text-center"><p className="text-[11px] uppercase tracking-[0.13em] text-white/50">The band is on</p><p className="mt-1 font-display text-5xl font-semibold">{currentChord}</p></div><div className="hidden sm:block text-2xl text-sage-200">→</div><div className="rounded-xl border border-white/10 bg-black/10 p-4 text-center"><p className="text-[11px] uppercase tracking-[0.13em] text-white/50">Listening for a move to</p><p className="mt-1 font-display text-5xl font-semibold text-sage-200">{nextChord}</p></div></div>

        <div className="mt-5 rounded-xl border border-white/15 bg-black/15 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Mic className={`w-5 h-5 ${listening ? 'text-rose-300 animate-pulse' : 'text-white/60'}`} /><span className="text-sm font-semibold">{listening ? 'Listening locally for a fresh guitar change' : 'Microphone is off'}</span></div><span className="text-xs text-white/55">No audio is recorded or sent anywhere</span></div><div className="mt-3 h-2.5 rounded-full bg-white/10 overflow-hidden"><div className={`h-full rounded-full transition-all ${listening ? 'bg-gradient-to-r from-sage-300 via-sky-300 to-violet-300' : 'bg-white/20'}`} style={{ width: `${Math.max(4, signalLevel * 100)}%` }} /></div><p className="mt-2 text-xs text-white/60">A clear strum or picked change can advance the band. Hold the current chord and the band stays with you.</p></div>

        {lastMove && <div className="mt-4 rounded-xl border border-sage-200/25 bg-sage-200/10 px-4 py-3 text-sm text-sage-100 flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /><span>{lastMove}</span></div>}
        {error && <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}

        <div className="mt-5 grid sm:grid-cols-2 gap-3"><button type="button" onClick={listening ? stopListening : startListening} className="rounded-xl bg-sage-200 text-ink-900 px-4 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-sage-100 transition" disabled={starting}>{starting ? <><Loader2 className="w-5 h-5 animate-spin" /> Starting private mic…</> : listening ? <><Pause className="w-5 h-5" /> Stop Follow Me mode</> : <><Play className="w-5 h-5" /> Start Follow Me mode</>}</button><button type="button" onClick={() => moveBand('manual')} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-white/15 transition"><SkipForward className="w-5 h-5" /> Move band to next chord</button></div>

        <div className="mt-4 rounded-xl border border-sky-200/15 bg-sky-200/10 px-4 py-3 text-xs leading-relaxed text-sky-100 flex items-start gap-2"><Headphones className="w-4 h-4 mt-0.5 shrink-0" /><span><strong>For the cleanest response, use headphones or keep the device volume low.</strong> The microphone processes live sound only in this browser to notice a new change signal; it never creates a recording.</span></div>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import { Mic, MicOff, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import {
  centsFromFrequency,
  closestGuitarString,
  getPitchReading,
  GuitarString,
  PitchReading,
  STANDARD_GUITAR_TUNING,
} from '../lib/pitch';

const FRAME_SIZE = 4096;

type TunerStatus = 'idle' | 'listening' | 'error';
type TuningChoice = 'auto' | GuitarString['id'];

function averageReading(readings: PitchReading[]): PitchReading | null {
  if (readings.length === 0) return null;
  const frequencies = readings.map((reading) => reading.frequency).sort((left, right) => left - right);
  const middle = frequencies[Math.floor(frequencies.length / 2)];
  const sample = readings[readings.length - 1];
  return { ...sample, frequency: middle, cents: (Math.log2(middle / 440) * 12 + 69 - Math.round(Math.log2(middle / 440) * 12 + 69)) * 100 };
}

export default function GuitarTuner() {
  const [status, setStatus] = useState<TunerStatus>('idle');
  const [choice, setChoice] = useState<TuningChoice>('auto');
  const [reading, setReading] = useState<PitchReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const readingsRef = useRef<PitchReading[]>([]);
  const lastPaintRef = useRef(0);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== 'closed') void context.close();
    readingsRef.current = [];
    setReading(null);
    setStatus('idle');
  }, []);

  useEffect(() => () => { stopListening(); }, [stopListening]);

  const startListening = async () => {
    setError(null);
    stopListening();
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx || !navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support microphone tuning. Try a current mobile browser.');
      setStatus('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const context = new AudioCtx();
      await context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = FRAME_SIZE;
      analyser.smoothingTimeConstant = 0.05;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      const detector = PitchDetector.forFloat32Array(FRAME_SIZE);
      detector.clarityThreshold = 0.72;
      contextRef.current = context;
      streamRef.current = stream;
      activeRef.current = true;
      setStatus('listening');

      const analyse = (time: number) => {
        if (!activeRef.current) return;
        analyser.getFloatTimeDomainData(samples);
        const nextReading = getPitchReading(samples, context.sampleRate, detector);
        if (nextReading) {
          readingsRef.current = [...readingsRef.current.slice(-5), nextReading];
          if (time - lastPaintRef.current > 75) {
            setReading(averageReading(readingsRef.current));
            lastPaintRef.current = time;
          }
        } else if (time - lastPaintRef.current > 220) {
          readingsRef.current = [];
          setReading(null);
          lastPaintRef.current = time;
        }
        frameRef.current = requestAnimationFrame(analyse);
      };
      frameRef.current = requestAnimationFrame(analyse);
    } catch (captureError: unknown) {
      setStatus('error');
      setError(captureError instanceof Error ? captureError.message : 'Microphone access could not be started.');
      stopListening();
    }
  };

  const selectedString = choice === 'auto' ? (reading ? closestGuitarString(reading.frequency) : STANDARD_GUITAR_TUNING[0]) : STANDARD_GUITAR_TUNING.find((string) => string.id === choice) || STANDARD_GUITAR_TUNING[0];
  const cents = reading ? centsFromFrequency(reading.frequency, selectedString.frequency) : 0;
  const absoluteCents = Math.abs(cents);
  const tuningState = !reading ? 'waiting' : absoluteCents <= 5 ? 'in' : absoluteCents <= 14 ? 'close' : cents < 0 ? 'flat' : 'sharp';
  const needle = Math.min(100, Math.max(0, 50 + (cents / 45) * 50));

  return (
    <div className="space-y-5">
      <section className="growth-hero">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="growth-eyebrow">Private on-device tool</p><h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Guitar Tuner</h1><p className="mt-2 max-w-xl text-white/75 text-sm sm:text-base">Tune one string at a time. The microphone signal stays in this browser and is never saved or shared.</p></div><div className="growth-hero-mark" aria-hidden="true"><SlidersHorizontal className="w-7 h-7" /></div></div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="font-display text-xl font-semibold text-ink-800">Standard tuning</h2><p className="text-sm text-ink-500 mt-0.5">E A D G B E</p></div><span className="text-xs font-semibold text-sage-700 rounded-full bg-sage-50 border border-sage-100 px-2.5 py-1">No audio leaves your device</span></div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">{STANDARD_GUITAR_TUNING.map((string) => { const selected = selectedString.id === string.id; return <button key={string.id} type="button" aria-pressed={choice === string.id} onClick={() => setChoice(string.id)} className={`rounded-xl border px-2 py-3 text-center transition ${selected && choice !== 'auto' ? 'border-sage-500 bg-sage-50 text-sage-800' : 'border-ink-200 bg-white text-ink-600 hover:border-sage-300'}`}><span className="block font-display text-lg font-semibold">{string.shortLabel}</span><span className="block text-[10px] mt-0.5">{string.id}</span></button>; })}</div>
        <button type="button" onClick={() => setChoice('auto')} className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${choice === 'auto' ? 'border-sage-500 bg-sage-50 text-sage-800' : 'border-ink-200 text-ink-600 hover:border-sage-300'}`}>Auto-detect the nearest guitar string</button>
      </section>

      <section className="card p-5 sm:p-6 overflow-hidden">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.16em] font-semibold text-ink-400">{choice === 'auto' ? 'Listening for' : 'Target string'}</p>
          <div className="mt-2 font-display text-5xl sm:text-6xl font-semibold text-ink-800">{selectedString.shortLabel}</div>
          <p className="mt-1 text-sm text-ink-500">{selectedString.label}{reading ? ` · ${reading.frequency.toFixed(1)} Hz` : ''}</p>
        </div>

        <div className="mt-7 relative h-20 max-w-xl mx-auto select-none" aria-label="Tuning meter">
          <div className="absolute inset-x-0 top-8 h-2 rounded-full bg-gradient-to-r from-rose-300 via-sage-300 to-rose-300" />
          <div className="absolute left-1/2 top-3 h-12 w-0.5 bg-ink-700/60" />
          <div className="absolute top-2 -translate-x-1/2 transition-transform duration-100" style={{ left: `${needle}%` }}><div className={`w-5 h-5 rounded-full border-4 border-white shadow-soft ${tuningState === 'in' ? 'bg-sage-600' : tuningState === 'waiting' ? 'bg-ink-300' : 'bg-amber-500'}`} /></div>
          <div className="absolute left-0 top-12 text-xs text-rose-600">Flat</div><div className="absolute left-1/2 top-12 -translate-x-1/2 text-xs text-sage-700 font-semibold">In tune</div><div className="absolute right-0 top-12 text-xs text-rose-600">Sharp</div>
        </div>

        <div className="mt-4 text-center"><div className={`font-display text-2xl font-semibold ${tuningState === 'in' ? 'text-sage-700' : 'text-ink-800'}`}>{!reading ? 'Play one open string' : tuningState === 'in' ? 'Right in tune' : tuningState === 'close' ? 'Very close' : tuningState === 'flat' ? 'A little flat' : 'A little sharp'}</div><p className="mt-1 text-sm text-ink-500">{!reading ? 'Play clearly and let the note ring for a moment.' : `${Math.round(Math.abs(cents))} cents ${cents < 0 ? 'flat' : cents > 0 ? 'sharp' : 'centred'}.`}</p></div>

        {status === 'listening' ? <button type="button" className="btn-secondary w-full mt-6" onClick={stopListening}><MicOff className="w-5 h-5" /> Stop tuner</button> : <button type="button" className="btn-primary w-full mt-6" onClick={startListening}><Mic className="w-5 h-5" /> Start tuner</button>}
        {error && <p className="mt-3 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{error}</p>}
      </section>

      <section className="rounded-xl border border-sage-100 bg-sage-50 p-4 text-sm text-sage-900"><div className="flex items-start gap-2.5"><ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-sage-700" /><p><span className="font-semibold">Private by design.</span> The tuner reads live microphone samples only while it is open. It does not make a recording, save microphone data, or send anything to your teacher.</p></div></section>
    </div>
  );
}

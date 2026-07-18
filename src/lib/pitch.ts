import { PitchDetector } from 'pitchy';

export interface FeedbackResult {
  summary: string;
  inTunePct: number;       // 0-100, share of detected NOTES within tolerance
  steadyScore: number;     // 0-100, steadiness of note onsets
  noteCount: number;       // actual number of distinct notes detected
}

interface NoteEvent {
  time: number;
  freq: number;       // representative (median) frequency for this note
  midi: number;       // nearest integer MIDI note number
  cents: number;       // deviation from that semitone, -50..+50
}

const A4_FREQ = 440;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / A4_FREQ);
}

export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

/**
 * Analyse a practice recording for guitar-specific pitch + rhythm accuracy.
 * v2: detects real note onsets (energy-based transient detection) rather than
 * treating every audio frame as a note, then checks each note's pitch against
 * the nearest true semitone (equal temperament) rather than just the open strings.
 */
export async function analyzeRecording(blob: Blob): Promise<FeedbackResult> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    ctx.close();
  }

  const channel = decoded.getChannelData(0);
  const sampleRate = decoded.sampleRate;

  // Guitar frequency range: low E2 (~82Hz) to a generous high fretted E6 (~1320Hz),
  // with a little headroom on both ends to tolerate slightly flat/sharp playing.
  const MIN_FREQ = 70;
  const MAX_FREQ = 1400;

  const frameSize = 2048;
  const hop = 512; // finer hop for onset resolution (~11.6ms at 44.1kHz)
  const detector = PitchDetector.forFloat32Array(frameSize);
  detector.clarityThreshold = 0.6;
  const minVolume = 0.01;

  // --- Pass 1: per-hop RMS energy, for onset detection ---
  const energies: number[] = [];
  for (let i = 0; i + frameSize < channel.length; i += hop) {
    const frame = channel.subarray(i, i + frameSize);
    let rms = 0;
    for (let k = 0; k < frame.length; k++) rms += frame[k] * frame[k];
    energies.push(Math.sqrt(rms / frame.length));
  }

  if (energies.length === 0) {
    return { summary: "I couldn't hear anything — try recording again a bit closer to the mic.", inTunePct: 0, steadyScore: 0, noteCount: 0 };
  }

  // --- Onset detection: energy rise above a local moving average, with a minimum gap ---
  const onsetHopIndices: number[] = [];
  const smoothWindow = 6; // ~70ms of local history
  const minOnsetGapSec = 0.12; // don't double-trigger on the same note
  let lastOnsetTime = -Infinity;
  for (let i = 1; i < energies.length; i++) {
    const start = Math.max(0, i - smoothWindow);
    let localAvg = 0;
    for (let k = start; k < i; k++) localAvg += energies[k];
    localAvg = localAvg / Math.max(1, i - start);
    const rise = energies[i] - localAvg;
    const time = (i * hop) / sampleRate;
    if (energies[i] > minVolume && rise > 0.012 && time - lastOnsetTime > minOnsetGapSec) {
      onsetHopIndices.push(i);
      lastOnsetTime = time;
    }
  }

  if (onsetHopIndices.length === 0) {
    return { summary: "I couldn't hear clear notes — try playing a little louder or recording in a quieter spot.", inTunePct: 0, steadyScore: 0, noteCount: 0 };
  }

  // --- For each onset, sample pitch across the note's sustain and take a robust (median) reading ---
  const notes: NoteEvent[] = [];
  for (let n = 0; n < onsetHopIndices.length; n++) {
    const startHop = onsetHopIndices[n];
    const endHop = n + 1 < onsetHopIndices.length ? onsetHopIndices[n + 1] : energies.length;
    // Skip the first ~2 hops (attack transient / pick noise) where possible.
    const sampleStart = Math.min(startHop + 2, endHop - 1);
    const freqs: number[] = [];
    for (let h = sampleStart; h < endHop; h++) {
      const sampleIdx = h * hop;
      if (sampleIdx + frameSize >= channel.length) break;
      const frame = channel.subarray(sampleIdx, sampleIdx + frameSize);
      const [pitch, clarity] = detector.findPitch(frame, sampleRate);
      if (clarity >= 0.6 && pitch >= MIN_FREQ && pitch <= MAX_FREQ) freqs.push(pitch);
    }
    if (freqs.length === 0) continue;
    freqs.sort((a, b) => a - b);
    const median = freqs[Math.floor(freqs.length / 2)];
    const midiExact = freqToMidi(median);
    const midiRounded = Math.round(midiExact);
    const cents = (midiExact - midiRounded) * 100;
    notes.push({ time: (startHop * hop) / sampleRate, freq: median, midi: midiRounded, cents });
  }

  if (notes.length === 0) {
    return { summary: "I heard some sound but couldn't make out clear notes — try recording again a little closer to the mic.", inTunePct: 0, steadyScore: 0, noteCount: 0 };
  }

  // --- Pitch accuracy: cents deviation from the nearest true semitone ---
  const centsTolerance = 30; // ±30 cents ≈ a third of a semitone — generous for beginners, still meaningful
  const inTuneCount = notes.filter((n) => Math.abs(n.cents) <= centsTolerance).length;
  const inTunePct = Math.round((inTuneCount / notes.length) * 100);

  // --- Rhythm: variance of the gaps between real note onsets ---
  let steadyScore = 70;
  if (notes.length >= 3) {
    const gaps: number[] = [];
    for (let i = 1; i < notes.length; i++) gaps.push(notes[i].time - notes[i - 1].time);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    steadyScore = Math.max(0, Math.round(100 * Math.exp(-cv * 1.5)));
  }

  const summary = buildSummary(inTunePct, steadyScore, notes.length);
  return { summary, inTunePct, steadyScore, noteCount: notes.length };
}

function buildSummary(inTunePct: number, steadyScore: number, noteCount: number): string {
  const parts: string[] = [];
  if (inTunePct >= 80) parts.push('Great ear — your notes are landing right on pitch.');
  else if (inTunePct >= 55) parts.push('Mostly in tune — a few notes drifted a little sharp or flat.');
  else parts.push('Keep stretching those fingers — quite a few notes were off pitch this time.');

  if (steadyScore >= 80) parts.push('Lovely steady timing!');
  else if (steadyScore >= 55) parts.push('Your rhythm is mostly steady.');
  else parts.push('Try tapping your foot to keep a steady beat.');

  parts.push(`Heard ${noteCount} note${noteCount === 1 ? '' : 's'}.`);
  return parts.join(' ');
}

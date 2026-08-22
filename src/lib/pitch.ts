import { PitchDetector } from 'pitchy';

export interface FeedbackResult {
  summary: string;
  tip: string;
  inTunePct: number;
  steadyScore: number | null;
  noteCount: number;
  signalQuality: 'clear' | 'fair' | 'unclear';
  pitchSpreadCents: number | null;
}

export interface PitchReading {
  frequency: number;
  midi: number;
  cents: number;
  clarity: number;
  rms: number;
}

export interface GuitarString {
  id: 'E2' | 'A2' | 'D3' | 'G3' | 'B3' | 'E4';
  label: string;
  shortLabel: string;
  frequency: number;
}

const A4_FREQ = 440;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIN_GUITAR_FREQ = 70;
const MAX_GUITAR_FREQ = 1400;

export const STANDARD_GUITAR_TUNING: GuitarString[] = [
  { id: 'E2', label: '6th string · low E', shortLabel: 'E', frequency: 82.4069 },
  { id: 'A2', label: '5th string · A', shortLabel: 'A', frequency: 110 },
  { id: 'D3', label: '4th string · D', shortLabel: 'D', frequency: 146.8324 },
  { id: 'G3', label: '3rd string · G', shortLabel: 'G', frequency: 195.9977 },
  { id: 'B3', label: '2nd string · B', shortLabel: 'B', frequency: 246.9417 },
  { id: 'E4', label: '1st string · high E', shortLabel: 'E', frequency: 329.6276 },
];

export function freqToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / A4_FREQ);
}

export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

export function centsFromFrequency(frequency: number, targetFrequency: number): number {
  return 1200 * Math.log2(frequency / targetFrequency);
}

export function closestGuitarString(frequency: number): GuitarString {
  return STANDARD_GUITAR_TUNING.reduce((closest, candidate) => (
    Math.abs(centsFromFrequency(frequency, candidate.frequency)) < Math.abs(centsFromFrequency(frequency, closest.frequency)) ? candidate : closest
  ));
}

export function rmsOf(samples: Float32Array): number {
  let sum = 0;
  for (let index = 0; index < samples.length; index += 1) sum += samples[index] * samples[index];
  return Math.sqrt(sum / samples.length);
}

export function getPitchReading(samples: Float32Array, sampleRate: number, detector: PitchDetector<Float32Array>): PitchReading | null {
  const rms = rmsOf(samples);
  const [frequency, clarity] = detector.findPitch(samples, sampleRate);
  if (!Number.isFinite(frequency) || frequency < MIN_GUITAR_FREQ || frequency > MAX_GUITAR_FREQ || clarity < 0.72 || rms < 0.006) return null;
  const exactMidi = freqToMidi(frequency);
  const midi = Math.round(exactMidi);
  return { frequency, midi, cents: (exactMidi - midi) * 100, clarity, rms };
}

function median(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

function standardDeviation(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  return Math.sqrt(values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length);
}

function groupStablePitches(readings: Array<PitchReading & { time: number }>) {
  const groups: Array<Array<PitchReading & { time: number }>> = [];
  for (const reading of readings) {
    const previousGroup = groups[groups.length - 1];
    const previous = previousGroup?.[previousGroup.length - 1];
    const startsNewNote = !previous || reading.time - previous.time > 0.18 || Math.abs(reading.midi - previous.midi) >= 1;
    if (startsNewNote) groups.push([reading]);
    else previousGroup.push(reading);
  }
  return groups
    .filter((group) => group.length >= 2)
    .map((group) => {
      const frequencies = group.map((item) => item.frequency);
      const cents = group.map((item) => item.cents);
      return { time: group[0].time, frequency: median(frequencies), cents: median(cents) };
    });
}

/**
 * Local, monophonic guitar-practice analysis. It deliberately gives a
 * confidence warning for chords, noisy rooms, or unclear strings rather than
 * pretending that a single microphone can grade every guitar performance.
 */
export async function analyzeRecording(blob: Blob): Promise<FeedbackResult> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error('Audio analysis is not supported in this browser.');
  const context = new AudioCtx();
  let audio: AudioBuffer;
  try {
    audio = await context.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await context.close();
  }

  const samples = audio.getChannelData(0);
  const frameSize = 4096;
  const hop = 512;
  const detector = PitchDetector.forFloat32Array(frameSize);
  detector.clarityThreshold = 0.72;
  const readings: Array<PitchReading & { time: number }> = [];

  for (let offset = 0; offset + frameSize < samples.length; offset += hop) {
    const reading = getPitchReading(samples.subarray(offset, offset + frameSize), audio.sampleRate, detector);
    if (reading) readings.push({ ...reading, time: offset / audio.sampleRate });
  }

  if (readings.length < 4) {
    return {
      summary: "I couldn't hear a clear single-note signal in this take.",
      tip: 'Try one string or a short single-note phrase, closer to the mic and away from other sound.',
      inTunePct: 0,
      steadyScore: null,
      noteCount: 0,
      signalQuality: 'unclear',
      pitchSpreadCents: null,
    };
  }

  const stableNotes = groupStablePitches(readings);
  const medianClarity = median(readings.map((reading) => reading.clarity));
  const signalQuality: FeedbackResult['signalQuality'] = medianClarity >= 0.88 && stableNotes.length >= 2 ? 'clear' : medianClarity >= 0.79 ? 'fair' : 'unclear';
  const pitchSpreadCents = Math.round(standardDeviation(readings.map((reading) => reading.cents), readings.reduce((sum, reading) => sum + reading.cents, 0) / readings.length));

  if (stableNotes.length === 0 || signalQuality === 'unclear') {
    return {
      summary: 'I heard sound, but not a stable enough pitch signal to give fair feedback.',
      tip: 'Tune first, then record a clean one-note line. Chords and busy rooms can confuse a single-mic pitch coach.',
      inTunePct: 0,
      steadyScore: null,
      noteCount: stableNotes.length,
      signalQuality: 'unclear',
      pitchSpreadCents,
    };
  }

  const centsTolerance = 22;
  const inTunePct = Math.round((stableNotes.filter((note) => Math.abs(note.cents) <= centsTolerance).length / stableNotes.length) * 100);
  let steadyScore: number | null = null;
  if (stableNotes.length >= 3) {
    const gaps = stableNotes.slice(1).map((note, index) => note.time - stableNotes[index].time);
    const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const variation = standardDeviation(gaps, averageGap) / Math.max(averageGap, 0.001);
    steadyScore = Math.max(0, Math.round(100 * Math.exp(-variation * 1.25)));
  }

  return {
    summary: buildSummary(inTunePct, steadyScore, stableNotes.length, signalQuality),
    tip: buildTip(inTunePct, steadyScore, pitchSpreadCents),
    inTunePct,
    steadyScore,
    noteCount: stableNotes.length,
    signalQuality,
    pitchSpreadCents,
  };
}

function buildSummary(inTunePct: number, steadyScore: number | null, noteCount: number, signalQuality: FeedbackResult['signalQuality']) {
  const pitch = inTunePct >= 85 ? 'Your pitch centre sounded settled on this clear take.' : inTunePct >= 60 ? 'Your pitch centre was often close, with a few notes drifting.' : 'This take suggests that pitch placement needs a slower, more careful pass.';
  const rhythm = steadyScore === null ? 'There were not enough separate notes to judge spacing fairly.' : steadyScore >= 82 ? 'The spacing between notes was pleasingly even.' : steadyScore >= 58 ? 'The note spacing was mostly even.' : 'The note spacing moved around; slowing down should help.';
  const confidence = signalQuality === 'clear' ? 'The microphone signal was clear.' : 'The microphone signal was usable, but not perfect.';
  return `${pitch} ${rhythm} ${confidence} Heard ${noteCount} stable note${noteCount === 1 ? '' : 's'}.`;
}

function buildTip(inTunePct: number, steadyScore: number | null, pitchSpreadCents: number) {
  if (pitchSpreadCents > 28) return 'Start with the tuner, then hold each note for a moment before moving on.';
  if (inTunePct < 60) return 'Try the phrase at half speed and listen for the centre of each note before changing position.';
  if (steadyScore !== null && steadyScore < 60) return 'Keep the same slow tempo and tap a quiet pulse before every note.';
  return 'Keep this calm pace and record one more short phrase to compare for yourself.';
}

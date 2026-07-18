import { PitchDetector } from 'pitchy';

export interface FeedbackResult {
  summary: string;
  inTunePct: number;       // 0-100, share of detected notes within tolerance
  steadyScore: number;     // 0-100, steadiness of note onsets
  noteCount: number;
}

/**
 * Analyse a practice recording for basic pitch + rhythm steadiness.
 * v1: compares detected pitches against an open-string reference set
 * (E2 A2 D3 G3 B3 E4) and measures inter-onset timing variance.
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
  const detector = PitchDetector.forFloat32Array(2048);
  detector.clarityThreshold = 0.6;
  const minVolume = 0.01;

  // Reference open-string frequencies (standard tuning).
  const refs = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
  const tolerance = 3.5; // semitones — broad, since beginners slide around

  const hop = 1024;
  const detected: { freq: number; time: number }[] = [];
  for (let i = 0; i + 2048 < channel.length; i += hop) {
    const frame = channel.subarray(i, i + 2048);
    let rms = 0;
    for (let k = 0; k < frame.length; k++) rms += frame[k] * frame[k];
    rms = Math.sqrt(rms / frame.length);
    if (rms < minVolume) continue;
    const [pitch, clarity] = detector.findPitch(frame, sampleRate);
    if (clarity >= 0.6 && pitch > 50 && pitch < 1200) {
      detected.push({ freq: pitch, time: i / sampleRate });
    }
  }

  if (detected.length === 0) {
    return { summary: 'I couldn\'t hear clear notes — try recording again in a quieter spot.', inTunePct: 0, steadyScore: 0, noteCount: 0 };
  }

  // Pitch: share of detected frames within tolerance of any reference (or its octaves).
  let inTune = 0;
  for (const d of detected) {
    const semis = refs.map((r) => Math.abs(1200 * Math.log2(d.freq / r)) / 100);
    const nearest = Math.min(...semis);
    // fold octaves
    const folded = nearest % 12;
    const dist = Math.min(folded, 12 - folded);
    if (dist <= tolerance) inTune++;
  }
  const inTunePct = Math.round((inTune / detected.length) * 100);

  // Rhythm: segment notes by gaps in detection, measure inter-onset variance.
  const onsets: number[] = [];
  let lastTime = -1;
  for (const d of detected) {
    if (lastTime < 0 || d.time - lastTime > 0.25) onsets.push(d.time);
    lastTime = d.time;
  }
  let steadyScore = 70;
  if (onsets.length >= 3) {
    const gaps: number[] = [];
    for (let i = 1; i < onsets.length; i++) gaps.push(onsets[i] - onsets[i - 1]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    steadyScore = Math.max(0, Math.round(100 * Math.exp(-cv * 1.5)));
  }

  const summary = buildSummary(inTunePct, steadyScore, detected.length);
  return { summary, inTunePct, steadyScore, noteCount: detected.length };
}

function buildSummary(inTunePct: number, steadyScore: number, noteCount: number): string {
  const parts: string[] = [];
  if (inTunePct >= 80) parts.push('Great ear — your notes are landing nicely in tune.');
  else if (inTunePct >= 55) parts.push('Mostly in tune — a few notes to watch next time.');
  else parts.push('Keep stretching those fingers — pitch will settle with practice.');

  if (steadyScore >= 80) parts.push('Lovely steady timing!');
  else if (steadyScore >= 55) parts.push('Your rhythm is mostly steady.');
  else parts.push('Try tapping your foot to keep a steady beat.');

  parts.push(`Heard about ${Math.max(1, Math.round(noteCount / 8))} notes.`);
  return parts.join(' ');
}

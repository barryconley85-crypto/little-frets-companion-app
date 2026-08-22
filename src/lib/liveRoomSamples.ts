export type LiveRoomSampleBank = {
  piano: Map<string, AudioBuffer>;
  bass: AudioBuffer | null;
};

const PIANO_NOTES = [
  'C3', 'Cs3', 'D3', 'Ds3', 'E3', 'F3', 'Fs3', 'G3', 'Gs3', 'A3', 'As3', 'B3',
  'C4', 'Cs4', 'D4', 'Ds4', 'E4', 'F4', 'Fs4', 'G4', 'Gs4', 'A4', 'As4', 'B4',
];

const ROOT_FREQUENCIES: Record<string, number> = {
  C: 65.41, D: 73.42, E: 82.41, F: 87.31, G: 98, A: 110, B: 123.47,
};

const MAJOR_VOICINGS: Record<string, string[]> = {
  C: ['C3', 'E3', 'G3'], D: ['D3', 'Fs3', 'A3'], E: ['E3', 'Gs3', 'B3'], F: ['F3', 'A3', 'C4'],
  G: ['G3', 'B3', 'D4'], A: ['A3', 'Cs4', 'E4'], B: ['B3', 'Ds4', 'Fs4'],
};

const MINOR_VOICINGS: Record<string, string[]> = {
  C: ['C3', 'Ds3', 'G3'], D: ['D3', 'F3', 'A3'], E: ['E3', 'G3', 'B3'], F: ['F3', 'Gs3', 'C4'],
  G: ['G3', 'As3', 'D4'], A: ['A3', 'C4', 'E4'], B: ['B3', 'D4', 'Fs4'],
};

function rootOf(chord: string) {
  return chord.charAt(0).toUpperCase();
}

function isMinor(chord: string) {
  return chord.includes('m') && !chord.includes('maj');
}

async function loadBuffer(context: AudioContext, url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load instrument audio: ${url}`);
  return context.decodeAudioData(await response.arrayBuffer());
}

export async function loadLiveRoomSampleBank(context: AudioContext): Promise<LiveRoomSampleBank> {
  const pianoEntries = await Promise.all(PIANO_NOTES.map(async (note) => [note, await loadBuffer(context, `/audio/live-room/piano/${note}.mp3`)] as const));
  let bass: AudioBuffer | null = null;
  try {
    bass = await loadBuffer(context, '/audio/live-room/bass/E2.mp3');
  } catch {
    bass = null;
  }
  return { piano: new Map(pianoEntries), bass };
}

function playBuffer(context: AudioContext, output: AudioNode, buffer: AudioBuffer, volume: number, duration: number, playbackRate = 1) {
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.connect(gain).connect(output);
  source.start();
  source.stop(context.currentTime + duration + 0.03);
}

export function playPianoVoicing(context: AudioContext, output: AudioNode, bank: LiveRoomSampleBank | null, chord: string, volume: number, duration: number) {
  if (!bank) return false;
  const root = rootOf(chord);
  const notes = (isMinor(chord) ? MINOR_VOICINGS : MAJOR_VOICINGS)[root];
  if (!notes) return false;
  notes.forEach((note, index) => {
    const buffer = bank.piano.get(note);
    if (buffer) playBuffer(context, output, buffer, volume * (index === 0 ? 1 : 0.76), duration);
  });
  return true;
}

export function playElectricBass(context: AudioContext, output: AudioNode, bank: LiveRoomSampleBank | null, chord: string, volume: number, duration: number, useFifth = false) {
  if (!bank?.bass) return false;
  const root = ROOT_FREQUENCIES[rootOf(chord)] || 98;
  const target = useFifth ? root * 1.5 : root;
  const rate = target / ROOT_FREQUENCIES.E;
  playBuffer(context, output, bank.bass, volume, duration, rate);
  return true;
}

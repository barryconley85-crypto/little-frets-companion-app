import { useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';

type RoomState = 'idle' | 'count-in' | 'playing';

type BandSet = {
  id: string;
  title: string;
  description: string;
  bpm: number;
  chords: string[];
  track: string;
  accent: string;
};

const BAND_SETS: BandSet[] = [
  {
    id: 'campfire', title: 'Campfire', bpm: 78, chords: ['C', 'G', 'Am', 'F'],
    description: 'Warm bass, hand percussion, felt piano, and plenty of space for your guitar.',
    track: '/audio/live-room/tracks/campfire-four-chord.mp3', accent: 'border-amber-200/50 bg-amber-200/15 text-amber-50',
  },
  {
    id: 'indie', title: 'Indie Band', bpm: 92, chords: ['G', 'D', 'Em', 'C'],
    description: 'A steady modern rhythm section, melodic bass, and gentle keys.',
    track: '/audio/live-room/tracks/indie-four-chord.mp3', accent: 'border-sky-200/50 bg-sky-200/15 text-sky-50',
  },
  {
    id: 'pop', title: 'Pop Band', bpm: 112, chords: ['D', 'A', 'Bm7', 'G'],
    description: 'Bright drums, clear bass movement, and piano stabs for a proper pop lift.',
    track: '/audio/live-room/tracks/pop-four-chord.mp3', accent: 'border-fuchsia-200/50 bg-fuchsia-200/15 text-fuchsia-50',
  },
  {
    id: 'soul', title: 'Soul Room', bpm: 82, chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
    description: 'Warm electric piano, rounded bass, organ colour, and a relaxed pocket.',
    track: '/audio/live-room/tracks/soul-seventh-loop.mp3', accent: 'border-violet-200/50 bg-violet-200/15 text-violet-50',
  },
  {
    id: 'blues', title: 'Blues Club', bpm: 92, chords: ['E7', 'E7', 'E7', 'E7', 'A7', 'A7', 'E7', 'E7', 'B7', 'A7', 'E7', 'E7'],
    description: 'A real shuffle pocket with a root-and-fifth bass line and piano comping.',
    track: '/audio/live-room/tracks/blues-three-chord.mp3', accent: 'border-orange-200/50 bg-orange-200/15 text-orange-50',
  },
  {
    id: 'rock', title: 'Rock Stage', bpm: 120, chords: ['G', 'D', 'Em', 'C'],
    description: 'Driving live drums, electric bass, and an energetic rehearsal-room feel.',
    track: '/audio/live-room/tracks/rock-four-chord.mp3', accent: 'border-rose-200/50 bg-rose-200/15 text-rose-50',
  },
];

export default function FollowMeLiveRoom() {
  const [selectedId, setSelectedId] = useState('indie');
  const [state, setState] = useState<RoomState>('idle');
  const [countInBeat, setCountInBeat] = useState(0);
  const [beat, setBeat] = useState(0);
  const [chordIndex, setChordIndex] = useState(0);
  const [volume, setVolume] = useState(90);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const beatRef = useRef(0);
  const chordRef = useRef(0);
  const selected = BAND_SETS.find((set) => set.id === selectedId) || BAND_SETS[0];
  const beatMs = 60000 / selected.bpm;
  const currentChord = selected.chords[chordIndex];
  const nextChord = selected.chords[(chordIndex + 1) % selected.chords.length];

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const stopRoom = () => {
    clearTimer();
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setState('idle');
    setCountInBeat(0);
    setBeat(0);
    setChordIndex(0);
    beatRef.current = 0;
    chordRef.current = 0;
  };

  const beginBand = async () => {
    setAudioError(null);
    setState('count-in');
    setCountInBeat(1);
    let count = 1;
    timerRef.current = window.setInterval(() => {
      count += 1;
      if (count <= 4) {
        setCountInBeat(count);
        return;
      }
      clearTimer();
      const audio = new Audio(selected.track);
      audio.loop = true;
      audio.volume = volume / 100;
      audioRef.current = audio;
      audio.play().catch(() => setAudioError('The backing track could not start. Check your device sound is enabled, then try again.'));
      setState('playing');
      setBeat(0);
      setChordIndex(0);
      beatRef.current = 0;
      chordRef.current = 0;
      timerRef.current = window.setInterval(() => {
        const nextBeat = (beatRef.current + 1) % 4;
        beatRef.current = nextBeat;
        setBeat(nextBeat);
        if (nextBeat === 0) {
          const nextChordIndex = (chordRef.current + 1) % selected.chords.length;
          chordRef.current = nextChordIndex;
          setChordIndex(nextChordIndex);
        }
      }, beatMs);
    }, beatMs);
  };

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    audioRef.current?.pause();
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const chooseSet = (id: string) => {
    if (state !== 'idle') return;
    setSelectedId(id);
    setChordIndex(0);
    chordRef.current = 0;
  };

  return (
    <section className="mt-6 rounded-3xl bg-ink-900 text-white shadow-soft overflow-hidden">
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-sage-200">Private play-along band</p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold">Live Room</h2>
            <p className="mt-2 max-w-xl text-sm text-white/70">Choose a real continuous backing band, take the count-in, and play the visible route in time. This is now a reliable play-along—not a microphone test.</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0"><Music2 className="w-6 h-6 text-sage-200" /></div>
        </div>

        <div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-white/55 font-semibold">Choose your band set</p><p className="mt-1 text-sm text-white/75">Every set has its own full original bass, drums, and keyboard arrangement.</p></div><span className="text-xs text-white/55">Stop to switch sets</span></div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">{BAND_SETS.map((set) => <button key={set.id} type="button" disabled={state !== 'idle'} onClick={() => chooseSet(set.id)} className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${selectedId === set.id ? set.accent : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}`}><span className="block text-sm font-semibold">{set.title}</span><span className="mt-0.5 block text-[11px] leading-snug opacity-75">{set.description}</span><span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.08em] opacity-65">{set.bpm} bpm · {set.chords.length} bars</span></button>)}</div>
        </div>

        <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-white/55 font-semibold">The band route</p><p className="mt-1 text-sm text-white/75">The screen changes on every bar so you can see the next shape before the backing moves.</p></div><span className="rounded-full bg-sage-200/15 px-3 py-1 text-xs font-semibold text-sage-100">{selected.bpm} bpm</span></div>
          <div className="mt-4 flex flex-wrap gap-1.5">{selected.chords.map((chord, index) => <span key={`${chord}-${index}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${index === chordIndex && state === 'playing' ? 'border-sage-200 bg-sage-200 text-ink-900' : 'border-white/15 bg-white/5 text-white/70'}`}>{index + 1}. {chord}</span>)}</div>
        </div>

        <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold flex items-center gap-2"><Volume2 className="w-4 h-4 text-sage-200" /> Band volume</span><span className="text-sm font-semibold text-sage-200">{volume}%</span></div><input aria-label="Live Room backing volume" type="range" min="35" max="100" step="5" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="mt-4 w-full accent-sage-300" /><p className="mt-2 text-xs text-white/60">The continuous backing track is mixed as a full band. Start around 90%, then adjust to the room and headphones.</p></div>

        {state === 'count-in' ? <div className="mt-5 rounded-xl border border-amber-200/35 bg-amber-200/10 p-5 text-center"><p className="text-xs uppercase tracking-[0.14em] font-semibold text-amber-100">Count in</p><div className="mt-3 flex justify-center gap-2">{[1, 2, 3, 4].map((count) => <span key={count} className={`w-12 h-12 rounded-xl flex items-center justify-center font-display text-2xl font-semibold transition ${count === countInBeat ? 'bg-amber-200 text-ink-900 scale-110' : count < countInBeat ? 'bg-amber-100/25 text-amber-100' : 'bg-white/5 text-white/40'}`}>{count}</span>)}</div><p className="mt-4 text-sm text-amber-50/90">Get <strong>{selected.chords[0]}</strong> ready. The band begins on the next downbeat.</p></div> : <div className="mt-5 grid sm:grid-cols-[1fr,auto,1fr] items-center gap-4"><div className="rounded-xl border border-white/15 bg-white/5 p-4 text-center"><p className="text-[11px] uppercase tracking-[0.13em] text-white/50">The band is on</p><p className="mt-1 font-display text-5xl font-semibold">{currentChord}</p><div className="mt-3 flex justify-center gap-1.5" aria-label={`Band beat ${beat + 1} of 4`}>{[0, 1, 2, 3].map((index) => <span key={index} className={`h-2.5 w-2.5 rounded-full ${state === 'playing' && index === beat ? 'bg-sage-200 scale-125' : 'bg-white/20'}`} />)}</div></div><div className="hidden sm:block text-2xl text-sage-200">→</div><div className="rounded-xl border border-white/10 bg-black/10 p-4 text-center"><p className="text-[11px] uppercase tracking-[0.13em] text-white/50">Get ready for</p><p className="mt-1 font-display text-5xl font-semibold text-sage-200">{nextChord}</p><p className="mt-3 text-xs text-white/60">Change on the next first beat.</p></div></div>}

        {audioError && <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{audioError}</div>}

        <div className="mt-5 grid sm:grid-cols-2 gap-3"><button type="button" onClick={state === 'idle' ? beginBand : stopRoom} className="rounded-xl bg-sage-200 text-ink-900 px-4 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-sage-100 transition">{state === 'idle' ? <><Play className="w-5 h-5" /> Start a 4-beat count-in</> : <><Pause className="w-5 h-5" /> Stop the band</>}</button><button type="button" onClick={stopRoom} disabled={state === 'idle'} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-white/15 transition disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw className="w-5 h-5" /> Restart this set</button></div>

        <div className="mt-4 rounded-xl border border-sky-200/15 bg-sky-200/10 px-4 py-3 text-xs leading-relaxed text-sky-100">This is a private browser play-along. It does not ask for microphone permission, record practice, upload audio, store activity, or send anything to your teacher.</div>
      </div>
    </section>
  );
}

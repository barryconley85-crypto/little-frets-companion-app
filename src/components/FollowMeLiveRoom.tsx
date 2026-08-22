import { useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play, RotateCcw, Sparkles, Volume2 } from 'lucide-react';

type RoomState = 'idle' | 'count-in' | 'playing';
type RouteMode = 'band-set' | 'custom-groove';

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
  { id: 'campfire', title: 'Campfire', bpm: 78, chords: ['C', 'G', 'Am', 'F'], description: 'Warm bass, hand percussion, felt piano, and plenty of space for your guitar.', track: '/audio/live-room/tracks/campfire-four-chord.mp3', accent: 'border-amber-200/50 bg-amber-200/15 text-amber-50' },
  { id: 'indie', title: 'Indie Band', bpm: 92, chords: ['G', 'D', 'Em', 'C'], description: 'A steady modern rhythm section, melodic bass, and gentle keys.', track: '/audio/live-room/tracks/indie-four-chord.mp3', accent: 'border-sky-200/50 bg-sky-200/15 text-sky-50' },
  { id: 'pop', title: 'Pop Band', bpm: 112, chords: ['D', 'A', 'Bm7', 'G'], description: 'Bright drums, clear bass movement, and piano stabs for a proper pop lift.', track: '/audio/live-room/tracks/pop-four-chord.mp3', accent: 'border-fuchsia-200/50 bg-fuchsia-200/15 text-fuchsia-50' },
  { id: 'soul', title: 'Soul Room', bpm: 82, chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'], description: 'Warm electric piano, rounded bass, organ colour, and a relaxed pocket.', track: '/audio/live-room/tracks/soul-seventh-loop.mp3', accent: 'border-violet-200/50 bg-violet-200/15 text-violet-50' },
  { id: 'blues', title: 'Blues Club', bpm: 92, chords: ['E7', 'E7', 'E7', 'E7', 'A7', 'A7', 'E7', 'E7', 'B7', 'A7', 'E7', 'E7'], description: 'A real shuffle pocket with a root-and-fifth bass line and piano comping.', track: '/audio/live-room/tracks/blues-three-chord.mp3', accent: 'border-orange-200/50 bg-orange-200/15 text-orange-50' },
  { id: 'rock', title: 'Rock Stage', bpm: 120, chords: ['G', 'D', 'Em', 'C'], description: 'Driving live drums, electric bass, and an energetic rehearsal-room feel.', track: '/audio/live-room/tracks/rock-four-chord.mp3', accent: 'border-rose-200/50 bg-rose-200/15 text-rose-50' },
];

const bandBufferCache = new Map<string, AudioBuffer>();

async function loadBandBuffer(context: AudioContext, track: string) {
  const cached = bandBufferCache.get(track);
  if (cached) return cached;
  const response = await fetch(track);
  if (!response.ok) throw new Error('The backing track could not be loaded.');
  const source = await response.arrayBuffer();
  const decoded = await context.decodeAudioData(source.slice(0));
  bandBufferCache.set(track, decoded);
  return decoded;
}

type FollowMeLiveRoomProps = { customChords: string[] };

export default function FollowMeLiveRoom({ customChords }: FollowMeLiveRoomProps) {
  const [selectedId, setSelectedId] = useState('indie');
  const [routeMode, setRouteMode] = useState<RouteMode>('band-set');
  const [state, setState] = useState<RoomState>('idle');
  const [countInBeat, setCountInBeat] = useState(0);
  const [beat, setBeat] = useState(0);
  const [chordIndex, setChordIndex] = useState(0);
  const [volume, setVolume] = useState(90);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoadingBand, setIsLoadingBand] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const beatRef = useRef(0);
  const chordRef = useRef(0);
  const selectedSet = BAND_SETS.find((set) => set.id === selectedId) || BAND_SETS[0];
  const activeSet: BandSet = routeMode === 'custom-groove'
    ? { id: 'custom', title: 'Your Custom Groove', bpm: 90, chords: customChords, description: 'Your exact Practice Lab chord order with a key-neutral full rhythm band.', track: '/audio/live-room/tracks/custom-groove.mp3', accent: 'border-sage-200/50 bg-sage-200/15 text-sage-50' }
    : selectedSet;
  const beatMs = 60000 / activeSet.bpm;
  const currentChord = activeSet.chords[chordIndex] || activeSet.chords[0];
  const nextChord = activeSet.chords[(chordIndex + 1) % activeSet.chords.length] || activeSet.chords[0];
  const beatsUntilChange = state === 'playing' ? 4 - beat : 4;
  const changeIsNear = state === 'playing' && beat >= 2;

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const stopRoom = () => {
    clearTimer();
    try { sourceRef.current?.stop(); } catch { /* Source may already have ended. */ }
    sourceRef.current = null;
    gainRef.current?.disconnect();
    gainRef.current = null;
    setIsLoadingBand(false);
    setState('idle');
    setCountInBeat(0);
    setBeat(0);
    setChordIndex(0);
    beatRef.current = 0;
    chordRef.current = 0;
  };

  const beginBand = async () => {
    setAudioError(null);
    setIsLoadingBand(true);
    try {
      if (!audioContextRef.current) audioContextRef.current = new window.AudioContext();
      const context = audioContextRef.current;
      if (context.state === 'suspended') await context.resume();
      const buffer = await loadBandBuffer(context, activeSet.track);
      const gain = context.createGain();
      gain.gain.setValueAtTime(volume / 100, context.currentTime);
      gain.connect(context.destination);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      const startAt = context.currentTime + (beatMs * 4) / 1000;
      source.start(startAt);
      sourceRef.current = source;
      gainRef.current = gain;
      setIsLoadingBand(false);
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
            const nextChordIndex = (chordRef.current + 1) % activeSet.chords.length;
            chordRef.current = nextChordIndex;
            setChordIndex(nextChordIndex);
          }
        }, beatMs);
      }, beatMs);
    } catch (error) {
      setIsLoadingBand(false);
      setState('idle');
      setAudioError(error instanceof Error ? error.message : 'The backing track could not start. Check your device sound is enabled, then try again.');
    }
  };

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    try { sourceRef.current?.stop(); } catch { /* Source may already have ended. */ }
    gainRef.current?.disconnect();
    audioContextRef.current?.close();
  }, []);

  useEffect(() => {
    const context = audioContextRef.current;
    if (context && gainRef.current) gainRef.current.gain.setTargetAtTime(volume / 100, context.currentTime, 0.02);
  }, [volume]);

  useEffect(() => {
    if (routeMode === 'custom-groove' && state === 'idle') {
      setChordIndex(0);
      chordRef.current = 0;
    }
  }, [customChords, routeMode, state]);

  const chooseBandSet = (id: string) => {
    if (state !== 'idle') return;
    setRouteMode('band-set');
    setSelectedId(id);
    setChordIndex(0);
    chordRef.current = 0;
  };

  const chooseCustomGroove = () => {
    if (state !== 'idle') return;
    setRouteMode('custom-groove');
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
            <p className="mt-2 max-w-xl text-sm text-white/70">Choose a full backing band or load your own Practice Lab route. The big cue tells you exactly when the next chord arrives.</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0"><Music2 className="w-6 h-6 text-sage-200" /></div>
        </div>

        <div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-white/55 font-semibold">Choose your band set</p><p className="mt-1 text-sm text-white/75">Each set has a full original bass, drums, and keyboard arrangement.</p></div><span className="text-xs text-white/55">Stop to switch</span></div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">{BAND_SETS.map((set) => <button key={set.id} type="button" disabled={state !== 'idle'} onClick={() => chooseBandSet(set.id)} className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${routeMode === 'band-set' && selectedId === set.id ? set.accent : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}`}><span className="block text-sm font-semibold">{set.title}</span><span className="mt-0.5 block text-[11px] leading-snug opacity-75">{set.description}</span><span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.08em] opacity-65">{set.bpm} bpm · {set.chords.length} bars</span></button>)}</div>
          <button type="button" disabled={state !== 'idle'} onClick={chooseCustomGroove} className={`mt-3 w-full rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${routeMode === 'custom-groove' ? 'border-sage-200/50 bg-sage-200/15 text-sage-50' : 'border-dashed border-sage-200/35 bg-sage-200/5 text-white/80 hover:bg-sage-200/10'}`}><span className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4 text-sage-200" /> Your Custom Groove</span><span className="mt-1 block text-xs text-white/65">Loads the exact {customChords.length}-chord route built above in Practice Lab. A key-neutral full rhythm band keeps the groove clear behind any chords.</span></button>
        </div>

        <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-white/55 font-semibold">The band route</p><p className="mt-1 text-sm text-white/75">The current chord stays large. The next chord becomes a clear change cue before the new bar begins.</p></div><span className="rounded-full bg-sage-200/15 px-3 py-1 text-xs font-semibold text-sage-100">{activeSet.bpm} bpm</span></div>
          <div className="mt-4 flex flex-wrap gap-1.5">{activeSet.chords.map((chord, index) => <span key={`${chord}-${index}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${index === chordIndex && state === 'playing' ? 'border-sage-200 bg-sage-200 text-ink-900 ring-2 ring-sage-200/35' : index === (chordIndex + 1) % activeSet.chords.length && state === 'playing' ? 'border-amber-200/70 bg-amber-200/15 text-amber-50' : 'border-white/15 bg-white/5 text-white/70'}`}>{index + 1}. {chord}</span>)}</div>
        </div>

        <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold flex items-center gap-2"><Volume2 className="w-4 h-4 text-sage-200" /> Band volume</span><span className="text-sm font-semibold text-sage-200">{volume}%</span></div><input aria-label="Live Room backing volume" type="range" min="35" max="100" step="5" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="mt-4 w-full accent-sage-300" /><p className="mt-2 text-xs text-white/60">Start around 90%, then adjust for the room or headphones.</p></div>

        {state === 'count-in' ? <div className="mt-5 rounded-xl border border-amber-200/35 bg-amber-200/10 p-5 text-center"><p className="text-xs uppercase tracking-[0.14em] font-semibold text-amber-100">Count in</p><div className="mt-3 flex justify-center gap-2">{[1, 2, 3, 4].map((count) => <span key={count} className={`w-12 h-12 rounded-xl flex items-center justify-center font-display text-2xl font-semibold transition ${count === countInBeat ? 'bg-amber-200 text-ink-900 scale-110' : count < countInBeat ? 'bg-amber-100/25 text-amber-100' : 'bg-white/5 text-white/40'}`}>{count}</span>)}</div><p className="mt-4 text-sm text-amber-50/90">Get <strong>{activeSet.chords[0]}</strong> ready. The band begins on the next downbeat.</p></div> : <div className="mt-5 rounded-2xl border border-white/15 bg-black/15 p-4 sm:p-5"><div className="grid sm:grid-cols-[1fr,auto,1fr] items-stretch gap-3"><div className="rounded-xl border border-sage-200/45 bg-sage-200/10 p-4 text-center flex flex-col justify-center"><p className="text-[11px] uppercase tracking-[0.13em] text-sage-100/75">Play now</p><p className="mt-1 font-display text-5xl sm:text-6xl font-semibold">{currentChord}</p><div className="mt-4 flex justify-center gap-2" aria-label={`Band beat ${beat + 1} of 4`}>{[0, 1, 2, 3].map((index) => <span key={index} className={`h-3 w-3 rounded-full transition ${state === 'playing' && index === beat ? 'bg-sage-200 scale-125 ring-4 ring-sage-200/20' : 'bg-white/20'}`} />)}</div></div><div className="hidden sm:flex flex-col items-center justify-center gap-1 text-amber-200"><span className="text-2xl">→</span><span className="text-[10px] uppercase tracking-[0.11em]">Change</span></div><div className={`rounded-xl border-2 p-4 text-center flex flex-col justify-center transition ${changeIsNear ? 'border-amber-200 bg-amber-200 text-ink-900 shadow-[0_0_30px_rgba(253,230,138,0.28)]' : 'border-white/15 bg-white/5'}`}><p className={`text-[11px] uppercase tracking-[0.13em] ${changeIsNear ? 'text-ink-700' : 'text-white/50'}`}>{changeIsNear ? 'Get ready now' : 'Next chord'}</p><p className="mt-1 font-display text-5xl sm:text-6xl font-semibold">{nextChord}</p><p className={`mt-3 text-xs font-semibold ${changeIsNear ? 'text-ink-700' : 'text-white/60'}`}>{state === 'playing' ? (beatsUntilChange === 1 ? 'Change on the next downbeat' : `${beatsUntilChange} beats until change`) : 'The band will cue this for you.'}</p></div></div><div className={`mt-4 rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${changeIsNear ? 'bg-amber-200 text-ink-900' : 'bg-white/8 text-white/75'}`}>{state === 'playing' ? (changeIsNear ? `Hands ready — ${nextChord} arrives on the next first beat.` : `Stay on ${currentChord}. The next shape is ${nextChord}.`) : 'Press start when your hands are ready.'}</div></div>}

        {audioError && <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{audioError}</div>}

        <div className="mt-5 grid sm:grid-cols-2 gap-3"><button type="button" disabled={isLoadingBand} onClick={state === 'idle' ? beginBand : stopRoom} className="rounded-xl bg-sage-200 text-ink-900 px-4 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-sage-100 transition disabled:cursor-wait disabled:opacity-70">{isLoadingBand ? <><Music2 className="w-5 h-5 animate-pulse" /> Loading the band…</> : state === 'idle' ? <><Play className="w-5 h-5" /> Start a 4-beat count-in</> : <><Pause className="w-5 h-5" /> Stop the band</>}</button><button type="button" onClick={stopRoom} disabled={state === 'idle' && !isLoadingBand} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-white/15 transition disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw className="w-5 h-5" /> Restart this set</button></div>

        <div className="mt-4 rounded-xl border border-sky-200/15 bg-sky-200/10 px-4 py-3 text-xs leading-relaxed text-sky-100">This is a private browser play-along. It does not ask for microphone permission, record practice, upload audio, store activity, or send anything to your teacher.</div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Gauge, Music2, Pause, Play, Plus, RotateCcw, Sparkles, Volume2, X } from 'lucide-react';
import FollowMeLiveRoom from './FollowMeLiveRoom';

const CHORD_OPTIONS = ['C', 'A', 'G', 'E', 'D', 'F', 'Am', 'Em', 'Dm', 'E7', 'A7', 'D7', 'G7', 'C7', 'B7', 'Am7', 'Em7', 'Dm7', 'Bm7', 'Cmaj7', 'Gmaj7', 'Fmaj7', 'Dmaj7', 'Amaj7'];
const LADDER_TEMPOS = [50, 60, 70, 80];
const PROGRESSION_STARTERS = [
  { label: 'Four-chord flow', chords: ['G', 'D', 'Em', 'C'], detail: 'A friendly all-purpose loop.' },
  { label: 'Folk story', chords: ['C', 'G', 'Am', 'F'], detail: 'A warm major–minor journey.' },
  { label: 'Pop lift', chords: ['D', 'A', 'Bm7', 'G'], detail: 'A bright four-chord climb.' },
  { label: 'Soul turn', chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'], detail: 'A relaxed seventh-chord loop.' },
  { label: 'Blues move', chords: ['E7', 'A7', 'B7'], detail: 'A compact dominant-seven turn.' },
];

function makeClick(context: AudioContext, accented: boolean) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = accented ? 1046.5 : 783.99;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(accented ? 0.18 : 0.11, context.currentTime + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.075);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.08);
}

export default function PracticeLab() {
  const [chords, setChords] = useState(['G', 'D', 'Em', 'C']);
  const [tempo, setTempo] = useState(60);
  const [beatsPerChord, setBeatsPerChord] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [activeChordIndex, setActiveChordIndex] = useState(0);
  const [ladderStep, setLadderStep] = useState(0);
  const [appliedTempo, setAppliedTempo] = useState<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const coachRef = useRef<HTMLElement>(null);
  const beatRef = useRef(0);
  const totalBeatRef = useRef(0);

  const stopAndReset = () => {
    setPlaying(false);
    beatRef.current = 0;
    totalBeatRef.current = 0;
    setBeat(0);
    setActiveChordIndex(0);
  };

  const replaceProgression = (nextChords: string[]) => {
    setChords(nextChords);
    stopAndReset();
  };

  const updateChord = (index: number, chord: string) => {
    setChords((current) => current.map((item, itemIndex) => itemIndex === index ? chord : item));
    stopAndReset();
  };

  const addChord = () => {
    setChords((current) => current.length < 6 ? [...current, current[current.length - 1] || 'G'] : current);
    stopAndReset();
  };

  const removeChord = (index: number) => {
    setChords((current) => current.length > 2 ? current.filter((_, itemIndex) => itemIndex !== index) : current);
    stopAndReset();
  };

  const togglePlayback = async () => {
    if (playing) { stopAndReset(); return; }
    if (!audioRef.current) audioRef.current = new window.AudioContext();
    if (audioRef.current.state === 'suspended') await audioRef.current.resume();
    beatRef.current = 0;
    totalBeatRef.current = 0;
    setBeat(0);
    setActiveChordIndex(0);
    setPlaying(true);
  };

  useEffect(() => {
    if (!playing || !audioRef.current) return;
    const context = audioRef.current;
    const tick = () => {
      const currentBeat = beatRef.current;
      const currentChordIndex = Math.floor(totalBeatRef.current / beatsPerChord) % chords.length;
      makeClick(context, currentBeat === 0);
      setBeat(currentBeat);
      setActiveChordIndex(currentChordIndex);
      beatRef.current = (currentBeat + 1) % beatsPerChord;
      totalBeatRef.current += 1;
    };
    tick();
    const timer = window.setInterval(tick, 60000 / tempo);
    return () => window.clearInterval(timer);
  }, [playing, tempo, beatsPerChord, chords.length]);

  useEffect(() => () => { audioRef.current?.close(); }, []);

  const applyLadderTempo = () => {
    const selectedTempo = LADDER_TEMPOS[ladderStep];
    setTempo(selectedTempo);
    setAppliedTempo(selectedTempo);
    stopAndReset();
    window.setTimeout(() => coachRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const currentLadderTempo = LADDER_TEMPOS[ladderStep];
  const currentChord = chords[activeChordIndex];
  const nextChord = chords[(activeChordIndex + 1) % chords.length];

  return (
    <div className="space-y-6">
      <section className="growth-hero">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="growth-eyebrow">Learner-controlled, local practice</p><h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Practice Lab</h1><p className="mt-2 max-w-xl text-sm sm:text-base text-white/75">Build a short chord journey, slow it down, and let every change settle into your hands.</p></div><div className="growth-hero-mark" aria-hidden="true"><Music2 className="w-7 h-7" /></div></div>
          <div className="mt-5 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm text-white/85">Nothing here is recorded, graded, saved, or sent to your teacher. The tempo and click track run on this device while the page is open.</div>
        </div>
      </section>

      <section ref={coachRef} className="card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"><Volume2 className="w-5 h-5" /></div><div><h2 className="font-display text-xl font-semibold text-ink-800">Chord Progression Coach</h2><p className="mt-1 text-sm text-ink-500">Build a loop of two to six chords, then use a steady click track to give each change enough room.</p></div></div>
        {appliedTempo !== null && <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /><span><strong>{appliedTempo} bpm is ready in the coach.</strong> Adjust it further with the slider below whenever you like.</span></div>}

        <div className="rounded-xl border border-sand-200 bg-sand-50 p-4"><div className="flex items-center justify-between gap-3 flex-wrap"><div><p className="text-sm font-semibold text-ink-800">Start with a musical loop</p><p className="mt-0.5 text-xs text-ink-500">Choose one, then change any chord to make it yours.</p></div><span className="text-xs font-semibold text-sage-700">Up to 6 chords</span></div><div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-5 gap-2">{PROGRESSION_STARTERS.map((starter) => <button key={starter.label} type="button" onClick={() => replaceProgression(starter.chords)} className="rounded-lg border border-sand-200 bg-white px-3 py-2.5 text-left transition hover:border-sage-300 hover:bg-sage-50"><span className="block text-xs font-semibold text-ink-800">{starter.label}</span><span className="mt-0.5 block text-[11px] text-ink-500">{starter.chords.join(' → ')}</span></button>)}</div></div>

        <div className="mt-5"><div className="flex items-center justify-between gap-3 mb-2"><span className="label mb-0">Your progression</span><span className="text-xs text-ink-400">Tap a chord to change it</span></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{chords.map((chord, index) => <div key={`${index}-${chord}`} className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white p-2"><span className="w-6 h-6 rounded-lg bg-sage-100 text-sage-800 flex items-center justify-center text-[11px] font-semibold shrink-0">{index + 1}</span><select aria-label={`Chord ${index + 1}`} value={chord} onChange={(event) => updateChord(index, event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-800 outline-none">{CHORD_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>{chords.length > 2 && <button type="button" onClick={() => removeChord(index)} className="rounded-lg p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove chord ${index + 1}`}><X className="w-4 h-4" /></button>}</div>)}{chords.length < 6 && <button type="button" onClick={addChord} className="rounded-xl border border-dashed border-sage-300 bg-sage-50/60 px-3 py-2.5 text-sm font-semibold text-sage-800 hover:bg-sage-100"><Plus className="w-4 h-4 inline mr-1" /> Add chord</button>}</div></div>

        <div className="mt-5 rounded-xl border border-sage-200 bg-sage-50/70 p-4"><div className="flex items-center justify-between gap-3 flex-wrap"><div><p className="text-xs uppercase tracking-[0.14em] font-semibold text-sage-700">Your full loop</p><p className="mt-1 text-sm text-ink-600">The coach repeats every chord below in order — not just the first two.</p></div><span className="text-xs font-semibold text-sage-800">{chords.length} chords</span></div><div className="mt-3 flex flex-wrap gap-1.5">{chords.map((chord, index) => <span key={`summary-${chord}-${index}`} className="rounded-full border border-sage-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800">{index + 1}. {chord}</span>)}</div></div>

        <div className="mt-5 grid lg:grid-cols-[1fr,1.45fr] gap-5 items-stretch">
          <div className="rounded-xl border border-sand-200 bg-sand-50 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-ink-700">Tempo</span><span className="font-display text-2xl font-semibold text-sage-800">{tempo} <span className="text-sm font-sans">bpm</span></span></div><input aria-label="Tempo in beats per minute" type="range" min="40" max="160" step="5" value={tempo} onChange={(event) => { setTempo(Number(event.target.value)); stopAndReset(); }} className="mt-4 w-full accent-sage-600" /><div className="mt-1 flex justify-between text-[11px] text-ink-400"><span>40</span><span>Slow and steady</span><span>160</span></div><div className="mt-5"><span className="label">Beats before each change</span><div className="flex gap-2">{[2, 4, 8].map((value) => <button key={value} type="button" onClick={() => { setBeatsPerChord(value); stopAndReset(); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${beatsPerChord === value ? 'border-sage-300 bg-sage-100 text-sage-800' : 'border-ink-200 bg-white text-ink-600 hover:border-sage-200'}`}>{value} beats</button>)}</div></div></div>

          <div className="rounded-xl border border-sage-200 bg-sage-50/70 p-5 flex flex-col justify-between"><div><div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.14em] font-semibold text-sage-700">Play this now</p><div className="flex gap-1.5" aria-label={`Beat ${beat + 1} of ${beatsPerChord}`}>{Array.from({ length: beatsPerChord }).map((_, index) => <span key={index} className={`h-2.5 w-2.5 rounded-full transition ${index === beat && playing ? 'bg-rose-500 scale-125' : 'bg-sage-200'}`} />)}</div></div><div className="mt-5 rounded-xl border border-sage-200 bg-white p-5 text-center"><p className="text-[11px] uppercase tracking-[0.12em] text-ink-400">Chord {activeChordIndex + 1} of {chords.length}</p><p className="mt-1 font-display text-5xl font-semibold text-ink-800">{currentChord}</p><p className="mt-3 text-sm text-ink-600">{playing ? <>Next: <span className="font-semibold text-sage-800">{nextChord}</span></> : 'Press start when your hands are ready.'}</p></div><div className="mt-4 flex flex-wrap justify-center gap-1.5">{chords.map((chord, index) => <span key={`${chord}-${index}`} className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${index === activeChordIndex && playing ? 'border-sage-300 bg-sage-100 text-sage-800' : 'border-sage-100 bg-white/70 text-ink-500'}`}>{index + 1}. {chord}</span>)}</div><p className="mt-4 text-center text-sm text-ink-600">{playing ? 'Keep the beat moving. A slower tempo gives every change time to arrive.' : 'Start slowly enough that each change feels calm.'}</p></div><button type="button" onClick={togglePlayback} className="btn-primary mt-5 w-full">{playing ? <><Pause className="w-5 h-5" /> Pause and reset</> : <><Play className="w-5 h-5" /> Start local click track</>}</button></div>
        </div>
      </section>

      <FollowMeLiveRoom />

      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0"><Gauge className="w-5 h-5" /></div><div><h2 className="font-display text-xl font-semibold text-ink-800">Tempo Ladder</h2><p className="mt-1 text-sm text-ink-500">A gentle set of optional resting places. You decide when a tempo feels ready; the app does not test or track you.</p></div></div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5"><div className="grid sm:grid-cols-[auto,1fr,auto] items-center gap-4"><div className="w-16 h-16 rounded-2xl bg-white border border-sky-200 flex flex-col items-center justify-center text-sky-800"><span className="font-display text-2xl font-semibold">{currentLadderTempo}</span><span className="text-[10px] font-semibold uppercase tracking-[0.1em]">bpm</span></div><div><p className="font-semibold text-ink-800">Step {ladderStep + 1} of {LADDER_TEMPOS.length}</p><p className="mt-1 text-sm text-ink-600">Stay here for as long as you like. Slow practice is real practice.</p><div className="mt-3 flex gap-2">{LADDER_TEMPOS.map((item, index) => <span key={item} className={`h-2 flex-1 rounded-full ${index <= ladderStep ? 'bg-sky-500' : 'bg-sky-100'}`} />)}</div></div><div className="flex flex-col gap-2"><button type="button" onClick={applyLadderTempo} className="btn-secondary text-sm"><Sparkles className="w-4 h-4" /> Use in coach</button>{ladderStep < LADDER_TEMPOS.length - 1 ? <button type="button" onClick={() => setLadderStep((step) => step + 1)} className="btn-ghost text-sm">I’m comfortable — next step</button> : <button type="button" onClick={() => setLadderStep(0)} className="btn-ghost text-sm"><RotateCcw className="w-4 h-4" /> Start again at 50</button>}</div></div></div>
        <p className="mt-3 text-xs text-ink-500">The ladder resets when you leave the page. It is a private choice tool, not a target or record.</p>
      </section>
    </div>
  );
}

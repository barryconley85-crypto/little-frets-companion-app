import { useEffect, useRef, useState } from 'react';
import { Gauge, Music2, Pause, Play, RotateCcw, Sparkles, Volume2 } from 'lucide-react';

const CHORD_OPTIONS = ['C', 'A', 'G', 'E', 'D', 'F', 'Am', 'Em', 'Dm', 'E7', 'A7', 'D7', 'G7', 'Am7', 'Em7', 'Dm7', 'Cmaj7', 'Gmaj7'];
const LADDER_TEMPOS = [50, 60, 70, 80];

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
  const [firstChord, setFirstChord] = useState('G');
  const [secondChord, setSecondChord] = useState('D');
  const [tempo, setTempo] = useState(60);
  const [beatsPerChord, setBeatsPerChord] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [activeChord, setActiveChord] = useState(0);
  const [ladderStep, setLadderStep] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const beatRef = useRef(0);
  const totalBeatRef = useRef(0);

  const stopAndReset = () => {
    setPlaying(false);
    beatRef.current = 0;
    totalBeatRef.current = 0;
    setBeat(0);
    setActiveChord(0);
  };

  const togglePlayback = async () => {
    if (playing) { stopAndReset(); return; }
    const AudioContextClass = window.AudioContext;
    if (!audioRef.current) audioRef.current = new AudioContextClass();
    if (audioRef.current.state === 'suspended') await audioRef.current.resume();
    beatRef.current = 0;
    totalBeatRef.current = 0;
    setBeat(0);
    setActiveChord(0);
    setPlaying(true);
  };

  useEffect(() => {
    if (!playing || !audioRef.current) return;
    const context = audioRef.current;
    const tick = () => {
      const currentBeat = beatRef.current;
      const currentChord = Math.floor(totalBeatRef.current / beatsPerChord) % 2;
      makeClick(context, currentBeat === 0);
      setBeat(currentBeat);
      setActiveChord(currentChord);
      beatRef.current = (currentBeat + 1) % beatsPerChord;
      totalBeatRef.current += 1;
    };
    tick();
    const timer = window.setInterval(tick, 60000 / tempo);
    return () => window.clearInterval(timer);
  }, [playing, tempo, beatsPerChord]);

  useEffect(() => () => { audioRef.current?.close(); }, []);

  const applyLadderTempo = () => {
    setTempo(LADDER_TEMPOS[ladderStep]);
    stopAndReset();
  };

  const currentLadderTempo = LADDER_TEMPOS[ladderStep];
  const currentName = activeChord === 0 ? firstChord : secondChord;
  const nextName = activeChord === 0 ? secondChord : firstChord;

  return (
    <div className="space-y-6">
      <section className="growth-hero">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="growth-eyebrow">Learner-controlled, local practice</p><h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Practice Lab</h1><p className="mt-2 max-w-xl text-sm sm:text-base text-white/75">Choose a tiny loop, slow it down, and let the change settle into your hands.</p></div><div className="growth-hero-mark" aria-hidden="true"><Music2 className="w-7 h-7" /></div></div>
          <div className="mt-5 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm text-white/85">Nothing here is recorded, graded, saved, or sent to your teacher. The tempo and click track run on this device while the page is open.</div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"><Volume2 className="w-5 h-5" /></div><div><h2 className="font-display text-xl font-semibold text-ink-800">Chord Switch Coach</h2><p className="mt-1 text-sm text-ink-500">Pick two shapes, give each one a few steady beats, and practise the journey between them.</p></div></div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className="label">First chord</span><select value={firstChord} onChange={(event) => { setFirstChord(event.target.value); stopAndReset(); }} className="input"><option value={secondChord} disabled>{secondChord}</option>{CHORD_OPTIONS.filter((chord) => chord !== secondChord).map((chord) => <option key={chord} value={chord}>{chord}</option>)}</select></label>
          <label className="block"><span className="label">Second chord</span><select value={secondChord} onChange={(event) => { setSecondChord(event.target.value); stopAndReset(); }} className="input"><option value={firstChord} disabled>{firstChord}</option>{CHORD_OPTIONS.filter((chord) => chord !== firstChord).map((chord) => <option key={chord} value={chord}>{chord}</option>)}</select></label>
        </div>

        <div className="mt-5 grid lg:grid-cols-[1fr,1.45fr] gap-5 items-stretch">
          <div className="rounded-xl border border-sand-200 bg-sand-50 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-ink-700">Tempo</span><span className="font-display text-2xl font-semibold text-sage-800">{tempo} <span className="text-sm font-sans">bpm</span></span></div><input aria-label="Tempo in beats per minute" type="range" min="40" max="160" step="5" value={tempo} onChange={(event) => { setTempo(Number(event.target.value)); stopAndReset(); }} className="mt-4 w-full accent-sage-600" /><div className="mt-1 flex justify-between text-[11px] text-ink-400"><span>40</span><span>Slow and steady</span><span>160</span></div><div className="mt-5"><span className="label">Beats before changing</span><div className="flex gap-2">{[2, 4, 8].map((value) => <button key={value} type="button" onClick={() => { setBeatsPerChord(value); stopAndReset(); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${beatsPerChord === value ? 'border-sage-300 bg-sage-100 text-sage-800' : 'border-ink-200 bg-white text-ink-600 hover:border-sage-200'}`}>{value} beats</button>)}</div></div></div>

          <div className="rounded-xl border border-sage-200 bg-sage-50/70 p-5 flex flex-col justify-between"><div><div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.14em] font-semibold text-sage-700">Play this now</p><div className="flex gap-1.5" aria-label={`Beat ${beat + 1} of ${beatsPerChord}`}>{Array.from({ length: beatsPerChord }).map((_, index) => <span key={index} className={`h-2.5 w-2.5 rounded-full transition ${index === beat && playing ? 'bg-rose-500 scale-125' : 'bg-sage-200'}`} />)}</div></div><div className="mt-5 grid grid-cols-[1fr,auto,1fr] items-center gap-3"><div className={`rounded-xl border p-4 text-center transition ${activeChord === 0 && playing ? 'border-sage-400 bg-white shadow-soft' : 'border-sage-100 bg-white/60'}`}><p className="text-[11px] uppercase tracking-[0.12em] text-ink-400">{activeChord === 0 ? 'Play' : 'Next'}</p><p className="mt-1 font-display text-4xl font-semibold text-ink-800">{firstChord}</p></div><span className="text-sage-600 font-semibold">→</span><div className={`rounded-xl border p-4 text-center transition ${activeChord === 1 && playing ? 'border-sage-400 bg-white shadow-soft' : 'border-sage-100 bg-white/60'}`}><p className="text-[11px] uppercase tracking-[0.12em] text-ink-400">{activeChord === 1 ? 'Play' : 'Next'}</p><p className="mt-1 font-display text-4xl font-semibold text-ink-800">{secondChord}</p></div></div><p className="mt-4 text-center text-sm text-ink-600">{playing ? <><span className="font-semibold text-sage-800">{currentName}</span> is sounding now. <span className="font-semibold">{nextName}</span> comes next.</> : 'Press start when your hands are ready. Start slowly enough that each change feels calm.'}</p></div><button type="button" onClick={togglePlayback} className="btn-primary mt-5 w-full">{playing ? <><Pause className="w-5 h-5" /> Pause and reset</> : <><Play className="w-5 h-5" /> Start local click track</>}</button></div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0"><Gauge className="w-5 h-5" /></div><div><h2 className="font-display text-xl font-semibold text-ink-800">Tempo Ladder</h2><p className="mt-1 text-sm text-ink-500">A gentle set of optional resting places. You decide when a tempo feels ready; the app does not test or track you.</p></div></div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5"><div className="grid sm:grid-cols-[auto,1fr,auto] items-center gap-4"><div className="w-16 h-16 rounded-2xl bg-white border border-sky-200 flex flex-col items-center justify-center text-sky-800"><span className="font-display text-2xl font-semibold">{currentLadderTempo}</span><span className="text-[10px] font-semibold uppercase tracking-[0.1em]">bpm</span></div><div><p className="font-semibold text-ink-800">Step {ladderStep + 1} of {LADDER_TEMPOS.length}</p><p className="mt-1 text-sm text-ink-600">Stay here for as long as you like. Slow practice is real practice.</p><div className="mt-3 flex gap-2">{LADDER_TEMPOS.map((item, index) => <span key={item} className={`h-2 flex-1 rounded-full ${index <= ladderStep ? 'bg-sky-500' : 'bg-sky-100'}`} />)}</div></div><div className="flex flex-col gap-2"><button type="button" onClick={applyLadderTempo} className="btn-secondary text-sm"><Sparkles className="w-4 h-4" /> Use in coach</button>{ladderStep < LADDER_TEMPOS.length - 1 ? <button type="button" onClick={() => setLadderStep((step) => step + 1)} className="btn-ghost text-sm">I’m comfortable — next step</button> : <button type="button" onClick={() => setLadderStep(0)} className="btn-ghost text-sm"><RotateCcw className="w-4 h-4" /> Start again at 50</button>}</div></div></div>
        <p className="mt-3 text-xs text-ink-500">The ladder resets when you leave the page. It is a private choice tool, not a target or record.</p>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { BookOpen, CircleDotDashed, Music4, Sparkles } from 'lucide-react';

type ChordShape = {
  name: string;
  subtitle: string;
  frets: Array<number | null>;
  strum: string;
};

const COMMON_CHORDS: ChordShape[] = [
  { name: 'C', subtitle: 'C major', frets: [null, 3, 2, 0, 1, 0], strum: 'Strum from A' },
  { name: 'A', subtitle: 'A major', frets: [null, 0, 2, 2, 2, 0], strum: 'Strum from A' },
  { name: 'G', subtitle: 'G major', frets: [3, 2, 0, 0, 0, 3], strum: 'Strum all six' },
  { name: 'E', subtitle: 'E major', frets: [0, 2, 2, 1, 0, 0], strum: 'Strum all six' },
  { name: 'D', subtitle: 'D major', frets: [null, null, 0, 2, 3, 2], strum: 'Strum from D' },
  { name: 'Am', subtitle: 'A minor', frets: [null, 0, 2, 2, 1, 0], strum: 'Strum from A' },
  { name: 'Em', subtitle: 'E minor', frets: [0, 2, 2, 0, 0, 0], strum: 'Strum all six' },
  { name: 'Dm', subtitle: 'D minor', frets: [null, null, 0, 2, 3, 1], strum: 'Strum from D' },
];

const CAGED_SHAPES: Array<ChordShape & { rootCue: string; note: string }> = [
  { name: 'C', subtitle: 'C shape', frets: [null, 3, 2, 0, 1, 0], strum: 'Open C form', rootCue: 'Roots sit on the A and B strings.', note: 'The first CAGED piece: recognise the C shape before trying to move it.' },
  { name: 'A', subtitle: 'A shape', frets: [null, 0, 2, 2, 2, 0], strum: 'Open A form', rootCue: 'The main root sits on the A string.', note: 'This is one of the most useful shapes to turn into a barre chord later.' },
  { name: 'G', subtitle: 'G shape', frets: [3, 2, 0, 0, 0, 3], strum: 'Open G form', rootCue: 'Roots appear on low E, G, and high E.', note: 'A wide shape. Learn to recognise it first; movement can come later.' },
  { name: 'E', subtitle: 'E shape', frets: [0, 2, 2, 1, 0, 0], strum: 'Open E form', rootCue: 'Roots appear on low E, D, and high E.', note: 'A familiar shape that becomes a practical full barre form.' },
  { name: 'D', subtitle: 'D shape', frets: [null, null, 0, 2, 3, 2], strum: 'Open D form', rootCue: 'Roots sit on the D and high E strings.', note: 'The final piece; after D, the sequence returns to C higher up the neck.' },
];

const NOTE_NAMES = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
const STRING_OPTIONS = [
  { label: '6th · Low E', start: 4, description: 'A useful place to learn roots for E-shape barre chords.' },
  { label: '5th · A', start: 9, description: 'A useful place to learn roots for A-shape barre chords.' },
  { label: '4th · D', start: 2, description: 'Notice how the chromatic pattern keeps moving one fret at a time.' },
  { label: '3rd · G', start: 7, description: 'Use this string to connect chord tones and melodies.' },
  { label: '2nd · B', start: 11, description: 'This string is tuned differently from the neighbouring pairs.' },
  { label: '1st · High E', start: 4, description: 'These note names match low E at the same frets, two octaves higher.' },
];

function ChordDiagram({ shape, compact = false }: { shape: ChordShape; compact?: boolean }) {
  const width = compact ? 120 : 140;
  const height = compact ? 156 : 168;
  const left = 20;
  const spacing = 20;
  const top = 34;
  const fretHeight = 23;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[9rem] mx-auto" role="img" aria-label={`${shape.subtitle} chord diagram`}>
      <title>{shape.subtitle} chord diagram. Strings run from low E on the left to high E on the right.</title>
      {Array.from({ length: 6 }).map((_, index) => <line key={`string-${index}`} x1={left + index * spacing} y1={top} x2={left + index * spacing} y2={top + fretHeight * 4} stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />)}
      {Array.from({ length: 5 }).map((_, index) => <line key={`fret-${index}`} x1={left} y1={top + index * fretHeight} x2={left + spacing * 5} y2={top + index * fretHeight} stroke="currentColor" strokeWidth={index === 0 ? 3 : 1.5} className="text-ink-300" />)}
      {shape.frets.map((fret, index) => {
        const x = left + index * spacing;
        if (fret === null) return <text key={`mark-${index}`} x={x} y="19" textAnchor="middle" className="fill-rose-600 text-[14px] font-semibold">×</text>;
        if (fret === 0) return <circle key={`mark-${index}`} cx={x} cy="15" r="5" fill="white" stroke="currentColor" strokeWidth="1.5" className="text-sage-600" />;
        return <circle key={`mark-${index}`} cx={x} cy={top + (fret - 0.5) * fretHeight} r="7" className="fill-sage-600" />;
      })}
      {['E', 'A', 'D', 'G', 'B', 'e'].map((label, index) => <text key={`label-${label}`} x={left + index * spacing} y={top + fretHeight * 4 + 16} textAnchor="middle" className="fill-ink-400 text-[9px] font-medium">{label}</text>)}
    </svg>
  );
}

export default function GuitarReference() {
  const [activeString, setActiveString] = useState(0);
  const selectedString = STRING_OPTIONS[activeString];
  const notes = Array.from({ length: 13 }, (_, fret) => NOTE_NAMES[(selectedString.start + fret) % NOTE_NAMES.length]);

  return (
    <div className="space-y-6">
      <section className="growth-hero">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="growth-eyebrow">Your always-available guitar toolkit</p><h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Guitar reference</h1><p className="mt-2 max-w-xl text-sm sm:text-base text-white/75">Find a shape, understand where it sits, then return to your own music.</p></div><div className="growth-hero-mark" aria-hidden="true"><BookOpen className="w-7 h-7" /></div></div>
          <div className="mt-5 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm text-white/85">These are standard-tuning learning aids. They are read-only and separate from your private practice space.</div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Music4 className="w-5 h-5" /></div><div><h2 className="font-display text-xl font-semibold text-ink-800">Common open chords</h2><p className="mt-1 text-sm text-ink-500">Strings run left to right from low E to high E. <strong className="text-ink-600">×</strong> means do not strum; an open circle means let the string ring.</p></div></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{COMMON_CHORDS.map((shape) => <article key={shape.name} className="rounded-xl border border-ink-100 bg-sand-50/60 p-3 text-center"><h3 className="font-display text-xl font-semibold text-ink-800">{shape.name}</h3><p className="text-[11px] text-ink-500">{shape.subtitle}</p><ChordDiagram shape={shape} compact /><p className="text-[11px] font-medium text-sage-700">{shape.strum}</p></article>)}</div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0"><CircleDotDashed className="w-5 h-5" /></div><div><h2 className="font-display text-xl font-semibold text-ink-800">CAGED: five connected major shapes</h2><p className="mt-1 text-sm text-ink-500">C → A → G → E → D → C. These open major forms are a map for recognising the same chord in different places on the neck.</p></div></div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-4 text-sm text-violet-950"><span className="font-semibold">Start here:</span> learn to spot each open shape and its root strings. Moving closed or barre forms up the neck can be a later lesson.</div>
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">{CAGED_SHAPES.map((shape) => <article key={shape.name} className="rounded-xl border border-ink-100 bg-white p-3"><div className="text-center"><h3 className="font-display text-xl font-semibold text-ink-800">{shape.name} shape</h3><ChordDiagram shape={shape} compact /></div><p className="text-xs font-semibold text-violet-800">{shape.rootCue}</p><p className="mt-1 text-xs leading-relaxed text-ink-500">{shape.note}</p></article>)}</div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></div><div><h2 className="font-display text-xl font-semibold text-ink-800">Fretboard notes</h2><p className="mt-1 text-sm text-ink-500">Choose a string to see frets 0–12. Each fret moves one step through the chromatic note pattern; fret 12 repeats the open-string note one octave higher.</p></div></div>
        <div className="flex flex-wrap gap-2">{STRING_OPTIONS.map((string, index) => <button key={string.label} type="button" onClick={() => setActiveString(index)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${activeString === index ? 'border-sky-300 bg-sky-100 text-sky-800' : 'border-ink-200 bg-white text-ink-600 hover:border-sky-200'}`}>{string.label}</button>)}</div>
        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/60 p-4"><p className="text-sm text-sky-950"><span className="font-semibold">{selectedString.label}:</span> {selectedString.description}</p><div className="mt-4 overflow-x-auto pb-1"><div className="min-w-[42rem] grid grid-cols-[repeat(13,minmax(3rem,1fr))] gap-1.5"><div className="col-span-13 h-1 rounded-full bg-ink-700" />{notes.map((note, fret) => <div key={`${selectedString.label}-${fret}`} className={`rounded-lg border px-1 py-3 text-center ${fret === 0 || fret === 12 ? 'border-sky-300 bg-white text-sky-800' : 'border-sky-100 bg-white/80 text-ink-700'}`}><span className="block text-[10px] font-semibold text-ink-400">{fret === 0 ? 'open' : `fret ${fret}`}</span><span className="mt-1 block text-xs font-semibold whitespace-nowrap">{note}</span></div>)}</div></div></div>
        <p className="mt-3 text-xs text-ink-500">A simple next step: learn natural notes on low E and A first. Those strings help you find roots for many chord shapes.</p>
      </section>
    </div>
  );
}

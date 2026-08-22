import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadPracticeRecording, resolveMediaUrl } from '../lib/storage';
import { analyzeRecording, FeedbackResult } from '../lib/pitch';
import GuitarTuner from '../components/GuitarTuner';
import { GuitarMuscle, Student, Task, Recording } from '../lib/types';
import { getMuscle } from '../lib/curriculum';
import {
  Activity, AlertCircle, Calendar, Clock, Download, FileMusic, Loader2,
  Mic, Music4, Play, Sparkles, Square, TrendingUp, UserCircle, Video,
} from 'lucide-react';

type View = 'task' | 'library' | 'tuner' | 'songs';

export default function StudentDashboard({ view, onNavigate }: { view: string; onNavigate: (view: string) => void }) {
  const active = (['task', 'library', 'tuner', 'songs'].includes(view) ? view : 'task') as View;
  if (active === 'library') return <LibraryView />;
  if (active === 'tuner') return <GuitarTuner />;
  if (active === 'songs') return <SongPreparationView />;
  return <TaskView onNavigate={onNavigate} />;
}

function useStudent() {
  const { profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!profile) return;
      const { data, error } = await supabase.from('students').select('*').eq('user_id', profile.id).maybeSingle();
      if (active) {
        if (error) console.error(error);
        setStudent((data as Student) || null);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [profile]);
  return { student, loading };
}

function NotLinked() {
  return <div className="card p-10 text-center max-w-md mx-auto mt-6"><div className="w-14 h-14 rounded-2xl bg-sand-100 text-sand-700 flex items-center justify-center mx-auto mb-4"><UserCircle className="w-7 h-7" /></div><h2 className="font-display text-xl font-semibold text-ink-800 mb-2">You're almost in</h2><p className="text-ink-500 text-sm leading-relaxed">Ask your teacher to add you using the email you signed up with. Once they do, your weekly tasks will appear here automatically.</p></div>;
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h1 className="font-display text-2xl font-semibold text-ink-800">{title}</h1><p className="text-ink-500 text-sm mt-0.5">{subtitle}</p></div>;
}

function TaskView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { profile } = useAuth();
  const { student, loading } = useStudent();
  const [task, setTask] = useState<Task | null>(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [tabUrl, setTabUrl] = useState<string | null>(null);
  const [latestRecording, setLatestRecording] = useState<Recording | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTask = useCallback(async (silent = false) => {
    if (!profile || !student) { setTask(null); setTaskLoading(false); return; }
    if (!silent) setTaskLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`student_id.eq.${student.id},group_name.eq.${student.group_name || '__none__'}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error(error);
    const currentTask = (data as Task) || null;
    setTask(currentTask);
    setTaskLoading(false);
    if (!currentTask) { setVideoUrl(null); setAudioUrl(null); setTabUrl(null); setLatestRecording(null); return; }
    const [video, audio, tab, takeRows] = await Promise.all([
      currentTask.video_url ? resolveMediaUrl('task-media', currentTask.video_url) : Promise.resolve(null),
      currentTask.audio_url ? resolveMediaUrl('task-media', currentTask.audio_url) : Promise.resolve(null),
      currentTask.tab_url ? resolveMediaUrl('task-media', currentTask.tab_url) : Promise.resolve(null),
      supabase.from('recordings').select('*').eq('task_id', currentTask.id).eq('student_id', student.id).order('created_at', { ascending: false }).limit(1),
    ]);
    setVideoUrl(video); setAudioUrl(audio); setTabUrl(tab);
    setLatestRecording(((takeRows.data as Recording[]) || [])[0] || null);
  }, [profile, student]);

  useEffect(() => { loadTask(refreshKey > 0); }, [loadTask, refreshKey]);

  if (loading || taskLoading) return <Loading />;
  if (!student) return <NotLinked />;
  if (!task) return <div className="space-y-6"><Header title="This week" subtitle="Your teacher hasn't set a task yet." /><div className="card p-10 text-center"><div className="w-14 h-14 rounded-2xl bg-sand-100 text-sand-700 flex items-center justify-center mx-auto mb-4"><Music4 className="w-7 h-7" /></div><h3 className="font-display text-xl font-semibold text-ink-800 mb-1">No task right now</h3><p className="text-ink-500 text-sm">Check back soon — your teacher will post something for you here.</p></div></div>;

  return (
    <div className="space-y-6">
      <section className="growth-hero">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="growth-eyebrow">Little Frets private practice</p><h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Your next musical move</h1><p className="mt-2 max-w-xl text-white/75 text-sm sm:text-base">One small focus. One honest take. Time to hear your own progress.</p></div><div className="growth-hero-mark" aria-hidden="true"><Music4 className="w-7 h-7" /></div></div>
          <div className="mt-6 rounded-xl bg-white/10 border border-white/15 px-4 py-3 flex items-start gap-3"><Sparkles className="w-5 h-5 mt-0.5 text-sage-200 shrink-0" /><div><span className="block text-xs uppercase tracking-[0.16em] text-white/55 font-semibold">Your private practice space</span><span className="text-sm font-semibold">{latestRecording ? 'Your latest take is saved for you to replay.' : 'Nothing you record here is sent to your teacher.'}</span></div></div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4 mb-3"><Header title={task.title} subtitle="One calm loop at a time." />{task.estimated_minutes && <span className="growth-focus-chip"><Clock className="w-3.5 h-3.5" /> {task.estimated_minutes} min</span>}</div>
        <GuitarFocusCard tags={task.skill_tags || []} />
        <div className="growth-path">
          <div className="growth-step growth-step-active"><div className="growth-step-number">1</div><div><span className="growth-step-label">Focus</span><p>{task.mission || 'Listen for one small thing you want to improve.'}</p></div></div>
          <div className={`growth-step ${latestRecording ? 'growth-step-active' : ''}`}><div className="growth-step-number">2</div><div><span className="growth-step-label">Make a take</span><p>{latestRecording ? 'A take is saved in your private Passport.' : 'Record a short, honest snapshot.'}</p></div></div>
          <div className={`growth-step ${latestRecording ? 'growth-step-active' : ''}`}><div className="growth-step-number">3</div><div><span className="growth-step-label">Listen back</span><p>{latestRecording ? 'Notice one thing that feels different.' : 'Your take will be yours to replay.'}</p></div></div>
        </div>
      </section>

      <div className="card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-3"><div className="w-11 h-11 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0"><Music4 className="w-6 h-6" /></div><div className="min-w-0"><h2 className="font-display text-xl font-semibold text-ink-800">Today’s practice</h2><div className="text-xs text-ink-400 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {new Date(task.created_at).toLocaleDateString()}</div></div></div>
        {task.notes && <p className="text-ink-700 whitespace-pre-wrap leading-relaxed mb-4">{task.notes}</p>}
        {(task.mission || task.success_criteria || task.due_at || task.estimated_minutes) && <div className="rounded-xl bg-sand-50 border border-sand-200 p-4 mb-4 space-y-2">{task.mission && <p className="text-sm text-ink-700"><span className="font-semibold text-sage-800">Today’s mission:</span> {task.mission}</p>}{task.success_criteria && <p className="text-sm text-ink-700"><span className="font-semibold text-sage-800">You’re done when:</span> {task.success_criteria}</p>}{(task.due_at || task.estimated_minutes) && <div className="text-xs text-ink-500 flex gap-3 flex-wrap"><span>{task.due_at ? `Next check-in: ${new Date(task.due_at).toLocaleDateString()}` : ''}</span><span>{task.estimated_minutes ? `${task.estimated_minutes} min focus` : ''}</span></div>}</div>}
        {videoUrl && <div className="mb-4"><div className="text-sm font-semibold text-ink-700 mb-1.5 flex items-center gap-1.5"><Video className="w-4 h-4" /> Watch</div><video src={videoUrl} controls className="w-full rounded-xl bg-ink-900" /></div>}
        {audioUrl && <div className="mb-4"><div className="text-sm font-semibold text-ink-700 mb-1.5 flex items-center gap-1.5"><FileMusic className="w-4 h-4" /> Listen</div><audio src={audioUrl} controls className="w-full" /></div>}
        {tabUrl && <a href={tabUrl} download className="btn-secondary w-full sm:w-auto"><Download className="w-4 h-4" /> Download tab / notation</a>}
      </div>
      <PracticeRecorder student={student} task={task} onSaved={() => setRefreshKey((value) => value + 1)} onGoLibrary={() => onNavigate('library')} />
      <SongPreparationCard student={student} />
    </div>
  );
}

function GuitarFocusCard({ tags }: { tags: GuitarMuscle[] }) {
  const muscles = tags.map(getMuscle).filter((muscle): muscle is NonNullable<typeof muscle> => Boolean(muscle));
  if (muscles.length === 0) return null;
  const focusNames = muscles.map((muscle) => muscle.label).join(' and ');
  const practiceCue = muscles.some((muscle) => muscle.id === 'pulse') && muscles.some((muscle) => muscle.id === 'musicality')
    ? 'Keep a steady thread through the whole song, then let the phrasing breathe naturally.'
    : muscles.some((muscle) => muscle.id === 'chords') && muscles.some((muscle) => muscle.id === 'pulse')
      ? 'Make each change feel unhurried and keep the pattern moving, even at a slower speed.'
      : muscles.some((muscle) => muscle.id === 'chords') && muscles.some((muscle) => muscle.id === 'musicality')
        ? 'Let the chord changes connect, then experiment with a softer and more expressive version.'
        : muscles.some((muscle) => muscle.id === 'fretboard') && muscles.some((muscle) => muscle.id === 'chords')
          ? 'Notice where each shape sits on the neck and move carefully into the next one.'
          : `Choose one small detail in your ${focusNames.toLowerCase()} and give it calm, patient attention.`;

  return (
    <section className="mb-4 rounded-xl border border-sage-200 bg-sage-50/70 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white text-sage-700 shadow-soft flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] font-semibold text-sage-700">This week’s guitar focus</p>
          <p className="mt-1 text-sm text-ink-600">This task is designed to help you build one or two skills at a time.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {muscles.map((muscle) => <span key={muscle.id} className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${muscle.accent}`}>{muscle.label}<span className="ml-1.5 font-normal opacity-80">{muscle.description}</span></span>)}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-700"><span className="font-semibold text-sage-800">Try this:</span> {practiceCue}</p>
      <p className="mt-2 text-[11px] text-ink-500">This is a guide to today’s task, not a score.</p>
    </section>
  );
}

function SongPreparationView() {
  const { student, loading } = useStudent();
  if (loading) return <Loading />;
  if (!student) return <NotLinked />;
  return <div className="space-y-6"><Header title="Songs for my next lesson" subtitle="Choose something you would love to learn so your teacher can prepare it." /><SongPreparationCard student={student} /></div>;
}

function SongPreparationCard({ student }: { student: Student }) {
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSafeSongField = (value: string) => value.length > 0 && value.length <= 80 && !/(https?:\/\/|www\.|@|\d{7,}|[\n\r])/i.test(value);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = songTitle.trim();
    const originalArtist = artist.trim();
    if (!isSafeSongField(title) || !isSafeSongField(originalArtist)) {
      setError('Please enter only a song title and original artist. Links, contact details, and notes are not accepted here.');
      return;
    }
    setSaving(true); setError(null);
    const { error: insertError } = await supabase.from('song_preparation_requests').insert({
      student_id: student.id, teacher_id: student.teacher_id, song_title: title, artist: originalArtist,
    });
    setSaving(false);
    if (insertError) { setError('This song could not be added to the preparation list. Please try again.'); return; }
    setSaved(true); setSongTitle(''); setArtist('');
  };

  return <section className="card p-5 sm:p-6"><div className="flex items-start gap-3"><div className="w-11 h-11 rounded-xl bg-sand-100 text-sand-700 flex items-center justify-center shrink-0"><Music4 className="w-6 h-6" /></div><div><h2 className="font-display text-xl font-semibold text-ink-800">Song for my next lesson</h2><p className="mt-1 text-sm text-ink-500">Thought of something you would love to learn? Add the title and original artist so your teacher can prepare it before the lesson.</p></div></div><div className="mt-4 rounded-xl border border-sage-100 bg-sage-50 px-3 py-2.5 text-xs text-sage-900">This is a song-preparation list, not a message box. You can add a song title and artist only—no notes, recordings, links, or replies.</div>{saved && <div className="mt-3 rounded-xl bg-sage-50 border border-sage-200 text-sage-800 text-sm px-4 py-3 flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /><span>Added to your teacher’s lesson-preparation list.</span></div>}<form onSubmit={submit} className="mt-4 grid sm:grid-cols-2 gap-3"><div><label className="label" htmlFor="song-request-title">Song title</label><input id="song-request-title" className="input" value={songTitle} onChange={(event) => setSongTitle(event.target.value)} maxLength={80} placeholder="e.g. Riptide" required /></div><div><label className="label" htmlFor="song-request-artist">Original artist</label><input id="song-request-artist" className="input" value={artist} onChange={(event) => setArtist(event.target.value)} maxLength={80} placeholder="e.g. Vance Joy" required /></div><div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-ink-400">No message, comment, link, contact detail, or attachment can be added.</span><button type="submit" className="btn-secondary" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music4 className="w-4 h-4" />} Add song</button></div></form>{error && <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}</section>;
}

function PracticeRecorder({ student, task, onSaved, onGoLibrary }: { student: Student; task: Task; onSaved: () => void; onGoLibrary: () => void }) {
  const [recording, setRecording] = useState(false);
  const [take, setTake] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanup = () => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null; mediaRef.current = null; chunksRef.current = [];
  };
  useEffect(() => () => { cleanup(); if (recordingUrl) URL.revokeObjectURL(recordingUrl); }, [recordingUrl]);

  const start = async () => {
    setError(null); setSaved(false); setFeedback(null);
    if (recordingUrl) { URL.revokeObjectURL(recordingUrl); setRecordingUrl(null); }
    setTake(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' }); setTake(blob); setRecordingUrl(URL.createObjectURL(blob)); cleanup(); };
      recorder.start(); setRecording(true); setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch (captureError: unknown) { setError(captureError instanceof Error ? captureError.message : 'Could not access the microphone. Check your browser permissions.'); cleanup(); }
  };
  const stop = () => { if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop(); setRecording(false); };

  const save = async () => {
    if (!take) return;
    setBusy(true); setError(null);
    let result: FeedbackResult | null = null;
    try { setAnalyzing(true); result = await analyzeRecording(take); setFeedback(result); } catch (analysisError) { console.error(analysisError); }
    setAnalyzing(false);
    const upload = await uploadPracticeRecording(student.id, task.id, take);
    if (!upload) { setError('Could not save your private recording. Please try again.'); setBusy(false); return; }
    const { error: insertError } = await supabase.from('recordings').insert({ task_id: task.id, student_id: student.id, audio_url: upload.path, feedback_summary: result?.summary || null });
    setBusy(false);
    if (insertError) { setError(insertError.message); return; }
    setSaved(true); setTake(null);
    if (recordingUrl) { URL.revokeObjectURL(recordingUrl); setRecordingUrl(null); }
    onSaved();
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1"><Mic className="w-5 h-5 text-sage-700" /><h3 className="font-display text-lg font-semibold text-ink-800">Make a private take</h3></div>
      <p className="text-ink-500 text-sm mb-4">This is a snapshot for you, not a performance for anyone else. Nothing you record is sent to your teacher.</p>
      {saved && <div className="rounded-xl bg-sage-50 border border-sage-200 text-sage-800 text-sm px-4 py-3 mb-4 flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /><span>Your private take is saved. Return to it whenever you want to hear your progress.</span></div>}
      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 mb-4 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}
      <div className="flex flex-col items-center gap-4 py-4 bg-sand-50 rounded-xl border border-sand-100">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition ${recording ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-sage-700 shadow-soft'}`}><Mic className="w-9 h-9" /></div>
        {recording && <div className="text-sm font-medium text-rose-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Recording… {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>}
        {recordingUrl && !recording && <div className="w-full px-4"><audio src={recordingUrl} controls className="w-full" /></div>}
        <div className="flex gap-3 flex-wrap justify-center">
          {recording ? <button className="btn-danger" onClick={stop}><Square className="w-5 h-5" /> Stop</button> : <button className="btn-primary" onClick={start} disabled={busy}>{take ? <><Mic className="w-5 h-5" /> Record again</> : <><Mic className="w-5 h-5" /> Start recording</>}</button>}
          {take && !recording && <button className="btn-secondary" onClick={save} disabled={busy}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />} {analyzing ? 'Listening…' : 'Save privately'}</button>}
        </div>
      </div>
      {feedback && <FeedbackCard feedback={feedback} />}
      {saved && <button onClick={onGoLibrary} className="btn-ghost w-full mt-3 text-sm"><Play className="w-4 h-4" /> View in your private Passport</button>}
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: FeedbackResult }) {
  const signalLabel = feedback.signalQuality === 'clear' ? 'Clear signal' : feedback.signalQuality === 'fair' ? 'Fair signal' : 'Unclear signal';
  return <div className="mt-4 rounded-xl border border-sage-200 bg-sage-50 p-4"><div className="flex items-center justify-between gap-3 mb-2"><div className="flex items-center gap-2 text-sage-800"><Sparkles className="w-4 h-4" /><span className="font-semibold text-sm">Your private pitch coach</span></div><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${feedback.signalQuality === 'clear' ? 'bg-sage-200 text-sage-800' : feedback.signalQuality === 'fair' ? 'bg-amber-100 text-amber-800' : 'bg-ink-100 text-ink-600'}`}>{signalLabel}</span></div><p className="text-sm text-ink-700 mb-3">{feedback.summary}</p><div className="grid grid-cols-2 gap-3"><Meter icon={<Activity className="w-4 h-4" />} label="Pitch centre" value={feedback.inTunePct} /><Meter icon={<TrendingUp className="w-4 h-4" />} label="Note spacing" value={feedback.steadyScore} /></div><p className="mt-3 rounded-lg bg-white/70 border border-sage-100 px-3 py-2 text-xs text-sage-900"><span className="font-semibold">Try next:</span> {feedback.tip}</p><p className="mt-2 text-[11px] text-ink-500">This is local signal feedback, not a grade. Chords, background sound, and unclear notes can reduce confidence.</p></div>;
}

function Meter({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | null }) {
  if (value === null) return <div><div className="flex items-center justify-between text-xs text-ink-600 mb-1"><span className="flex items-center gap-1">{icon} {label}</span><span className="font-semibold">Not enough notes</span></div><div className="h-2 rounded-full bg-ink-100 overflow-hidden"><div className="h-full w-1/4 bg-ink-300 rounded-full" /></div></div>;
  const color = value >= 75 ? 'bg-sage-500' : value >= 50 ? 'bg-amber-400' : 'bg-rose-400';
  return <div><div className="flex items-center justify-between text-xs text-ink-600 mb-1"><span className="flex items-center gap-1">{icon} {label}</span><span className="font-semibold">{value}%</span></div><div className="h-2 rounded-full bg-ink-100 overflow-hidden"><div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} /></div></div>;
}

function LibraryView() {
  const { student, loading } = useStudent();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recordings, setRecordings] = useState<Record<string, Recording[]>>({});
  const [busy, setBusy] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    (async () => {
      if (!student) { setBusy(false); return; }
      const [{ data: taskRows }, { data: recordingRows }] = await Promise.all([
        supabase.from('tasks').select('*').or(`student_id.eq.${student.id},group_name.eq.${student.group_name || '__none__'}`).order('created_at', { ascending: false }),
        supabase.from('recordings').select('*').eq('student_id', student.id).order('created_at', { ascending: false }),
      ]);
      const rows = (recordingRows as Recording[]) || [];
      setTasks((taskRows as Task[]) || []);
      const byTask: Record<string, Recording[]> = {};
      rows.forEach((recording) => { (byTask[recording.task_id] ||= []).push(recording); });
      setRecordings(byTask);
      const days = new Set(rows.map((recording) => recording.created_at.slice(0, 10)));
      let count = 0; const day = new Date();
      while (days.has(day.toISOString().slice(0, 10))) { count += 1; day.setDate(day.getDate() - 1); }
      setStreak(count); setBusy(false);
    })();
  }, [student]);

  if (loading || busy) return <Loading />;
  if (!student) return <NotLinked />;
  const allRecordings = Object.values(recordings).flat();
  const recordingDays = new Set(allRecordings.map((recording) => recording.created_at.slice(0, 10))).size;

  return (
    <div className="space-y-6">
      <section className="passport-board"><div className="relative z-10 flex items-start justify-between gap-4 flex-wrap"><div><p className="growth-eyebrow">Your private record of becoming</p><h1 className="font-display text-3xl font-semibold tracking-tight">Guitar Growth Passport</h1><p className="mt-2 max-w-xl text-sm text-white/70">A private place to replay your own effort and hear the small changes add up.</p></div><Sparkles className="w-7 h-7 text-sage-200 mt-1" aria-hidden="true" /></div><div className="relative z-10 mt-5 grid grid-cols-3 gap-2 sm:gap-3"><div className="passport-stat"><span className="passport-stat-value">{streak || '—'}</span><span className="passport-stat-label">day streak</span></div><div className="passport-stat"><span className="passport-stat-value">{allRecordings.length}</span><span className="passport-stat-label">private takes</span></div><div className="passport-stat"><span className="passport-stat-value">{recordingDays || '—'}</span><span className="passport-stat-label">practice days</span></div></div></section>
      <Header title="Your private practice library" subtitle="Return to the moments that helped you notice your progress." />
      {tasks.length === 0 ? <div className="card p-10 text-center"><div className="w-14 h-14 rounded-2xl bg-sand-100 text-sand-700 flex items-center justify-center mx-auto mb-4"><Clock className="w-7 h-7" /></div><h3 className="font-display text-xl font-semibold text-ink-800 mb-1">Nothing here yet</h3><p className="text-ink-500 text-sm">Your tasks and private recordings will collect here over time.</p></div> : <div className="space-y-4">{tasks.map((task) => <LibraryTaskCard key={task.id} task={task} recordings={recordings[task.id] || []} />)}</div>}
    </div>
  );
}

function LibraryTaskCard({ task, recordings }: { task: Task; recordings: Recording[] }) {
  const [open, setOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [tabUrl, setTabUrl] = useState<string | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const loadMedia = useCallback(async () => {
    if (mediaLoaded) return;
    const [video, audio, tab] = await Promise.all([
      task.video_url ? resolveMediaUrl('task-media', task.video_url) : Promise.resolve(null),
      task.audio_url ? resolveMediaUrl('task-media', task.audio_url) : Promise.resolve(null),
      task.tab_url ? resolveMediaUrl('task-media', task.tab_url) : Promise.resolve(null),
    ]);
    setVideoUrl(video); setAudioUrl(audio); setTabUrl(tab); setMediaLoaded(true);
  }, [task.video_url, task.audio_url, task.tab_url, mediaLoaded]);
  const toggle = () => { const next = !open; setOpen(next); if (next) loadMedia(); };
  const hasMedia = Boolean(task.video_url || task.audio_url || task.tab_url);

  return (
    <div className="card p-4"><button onClick={toggle} className="flex items-start gap-3 w-full text-left"><div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0"><Music4 className="w-5 h-5" /></div><div className="flex-1 min-w-0"><div className="font-semibold text-ink-800">{task.title}</div><div className="text-xs text-ink-400 flex items-center gap-1 mt-0.5 flex-wrap"><Calendar className="w-3 h-3" /> {new Date(task.created_at).toLocaleDateString()} · {recordings.length} private recording{recordings.length === 1 ? '' : 's'}{hasMedia && <span className="text-sage-600 ml-1">· has materials</span>}</div></div><div className={`text-ink-400 transition ${open ? 'rotate-180' : ''}`}><ChevronIcon /></div></button>
      {open && <div className="mt-3 pt-3 border-t border-ink-100 space-y-3">{task.notes && <p className="text-sm text-ink-600 whitespace-pre-wrap">{task.notes}</p>}{!mediaLoaded ? hasMedia && <div className="text-xs text-ink-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading materials…</div> : <>{videoUrl && <div><div className="text-xs font-semibold text-ink-700 mb-1.5 flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Watch</div><video src={videoUrl} controls className="w-full rounded-xl bg-ink-900" /></div>}{audioUrl && <div><div className="text-xs font-semibold text-ink-700 mb-1.5 flex items-center gap-1.5"><FileMusic className="w-3.5 h-3.5" /> Listen</div><audio src={audioUrl} controls className="w-full" /></div>}{tabUrl && <a href={tabUrl} download className="btn-secondary w-full sm:w-auto text-sm"><Download className="w-4 h-4" /> Download tab / notation</a>}</>}{recordings.length === 0 ? <p className="text-sm text-ink-400">No private recordings saved for this task yet.</p> : <ul className="space-y-2">{recordings.map((recording) => <RecordingRow key={recording.id} recording={recording} />)}</ul>}</div>}
    </div>
  );
}

function RecordingRow({ recording }: { recording: Recording }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const resolved = await resolveMediaUrl('practice-recordings', recording.audio_url); setUrl(resolved); setLoading(false); })(); }, [recording.audio_url]);
  return <li className="rounded-xl bg-sand-50 border border-sand-100 p-3"><div className="flex items-center gap-2 mb-2"><div className="w-7 h-7 rounded-lg bg-sage-100 text-sage-700 flex items-center justify-center"><Mic className="w-3.5 h-3.5" /></div><div className="text-xs text-ink-500">{new Date(recording.created_at).toLocaleString()}</div></div>{loading ? <div className="text-xs text-ink-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div> : url ? <audio src={url} controls className="w-full" /> : <div className="text-xs text-rose-600">Could not load audio.</div>}{recording.feedback_summary && <p className="text-xs text-ink-600 mt-2 flex items-start gap-1.5"><Sparkles className="w-3 h-3 mt-0.5 shrink-0 text-sage-600" /> {recording.feedback_summary}</p>}</li>;
}

function Loading() {
  return <div className="card p-8 text-center text-ink-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;
}

function ChevronIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
}

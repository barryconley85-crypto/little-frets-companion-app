import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadPracticeRecording, resolveMediaUrl } from '../lib/storage';
import { analyzeRecording, FeedbackResult } from '../lib/pitch';
import { Student, Task, Recording, SongRequest } from '../lib/types';
import {
  Music4, Calendar, Video, FileMusic, Mic, Square, Loader2, Send,
  AlertCircle, Play, Download, UserCircle, Sparkles, Clock,
  Heart, CheckCircle2, Activity, TrendingUp,
} from 'lucide-react';

type View = 'task' | 'library' | 'request';

export default function StudentDashboard({ view, onNavigate }: { view: string; onNavigate: (v: string) => void }) {
  const v = (['task', 'library', 'request'].includes(view) ? view : 'task') as View;
  if (v === 'library') return <LibraryView onNavigate={onNavigate} />;
  if (v === 'request') return <RequestView onNavigate={onNavigate} />;
  return <TaskView onNavigate={onNavigate} />;
}

/* ---------------- shared hook ---------------- */

function useStudent() {
  const { profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!profile) return;
      const { data, error } = await supabase.from('students').select('*').eq('user_id', profile.id).maybeSingle();
      if (active) { if (error) console.error(error); setStudent((data as Student) || null); setLoading(false); }
    })();
    return () => { active = false; };
  }, [profile]);
  return { student, loading };
}

function NotLinked() {
  return (
    <div className="card p-10 text-center max-w-md mx-auto mt-6">
      <div className="w-14 h-14 rounded-2xl bg-sand-100 text-sand-700 flex items-center justify-center mx-auto mb-4"><UserCircle className="w-7 h-7" /></div>
      <h2 className="font-display text-xl font-semibold text-ink-800 mb-2">You're almost in</h2>
      <p className="text-ink-500 text-sm leading-relaxed">Ask your teacher to add you using the email you signed up with. Once they do, your weekly tasks will appear here automatically.</p>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (<div><h1 className="font-display text-2xl font-semibold text-ink-800">{title}</h1><p className="text-ink-500 text-sm mt-0.5">{subtitle}</p></div>);
}

/* ---------------- This week's task ---------------- */

function TaskView({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { profile } = useAuth();
  const { student, loading } = useStudent();
  const [task, setTask] = useState<Task | null>(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [tabUrl, setTabUrl] = useState<string | null>(null);
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
    const t = (data as Task) || null;
    setTask(t);
    setTaskLoading(false);
    if (t) {
      const [v, a, tab] = await Promise.all([
        t.video_url ? resolveMediaUrl('task-media', t.video_url) : Promise.resolve(null),
        t.audio_url ? resolveMediaUrl('task-media', t.audio_url) : Promise.resolve(null),
        t.tab_url ? resolveMediaUrl('task-media', t.tab_url) : Promise.resolve(null),
      ]);
      setVideoUrl(v); setAudioUrl(a); setTabUrl(tab);
    } else { setVideoUrl(null); setAudioUrl(null); setTabUrl(null); }
  }, [profile, student]);

  useEffect(() => { loadTask(refreshKey > 0); }, [loadTask, refreshKey]);

  if (loading || taskLoading) return <div className="card p-8 text-center text-ink-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;
  if (!student) return <NotLinked />;
  if (!task) return (
    <div className="space-y-6">
      <Header title="This week" subtitle="Your teacher hasn't set a task yet." />
      <div className="card p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-sand-100 text-sand-700 flex items-center justify-center mx-auto mb-4"><Music4 className="w-7 h-7" /></div>
        <h3 className="font-display text-xl font-semibold text-ink-800 mb-1">No task right now</h3>
        <p className="text-ink-500 text-sm">Check back soon — your teacher will post something for you here.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Header title="This week" subtitle="Here's what to practise." />
      <div className="card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0"><Music4 className="w-6 h-6" /></div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-ink-800">{task.title}</h2>
            <div className="text-xs text-ink-400 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {new Date(task.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        {task.notes && <p className="text-ink-700 whitespace-pre-wrap leading-relaxed mb-4">{task.notes}</p>}
        {videoUrl && (<div className="mb-4"><div className="text-sm font-semibold text-ink-700 mb-1.5 flex items-center gap-1.5"><Video className="w-4 h-4" /> Watch</div><video src={videoUrl} controls className="w-full rounded-xl bg-ink-900" /></div>)}
        {audioUrl && (<div className="mb-4"><div className="text-sm font-semibold text-ink-700 mb-1.5 flex items-center gap-1.5"><FileMusic className="w-4 h-4" /> Listen</div><audio src={audioUrl} controls className="w-full" /></div>)}
        {tabUrl && (<a href={tabUrl} download className="btn-secondary w-full sm:w-auto"><Download className="w-4 h-4" /> Download tab / notation</a>)}
      </div>
      <PracticeRecorder student={student} task={task} onSaved={() => setRefreshKey((k) => k + 1)} onGoLibrary={() => onNavigate('library')} />
    </div>
  );
}

/* ---------------- Practice recorder + pitch feedback ---------------- */

function PracticeRecorder({ student, task, onSaved, onGoLibrary }: { student: Student; task: Task; onSaved: () => void; onGoLibrary: () => void }) {
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState<Blob | null>(null);
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
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null; mediaRef.current = null; chunksRef.current = [];
  };
  useEffect(() => () => { cleanup(); if (recordingUrl) URL.revokeObjectURL(recordingUrl); }, [recordingUrl]);

  const start = async () => {
    setError(null); setSaved(false); setFeedback(null);
    if (recordingUrl) { URL.revokeObjectURL(recordingUrl); setRecordingUrl(null); }
    setHasRecording(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRef.current = rec; chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        setHasRecording(blob); setRecordingUrl(URL.createObjectURL(blob));
        cleanup();
      };
      rec.start(); setRecording(true); setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err: any) {
      setError(err?.message || 'Could not access the microphone. Check your browser permissions.');
      cleanup();
    }
  };

  const stop = () => { if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop(); setRecording(false); };

  const save = async () => {
    if (!hasRecording) return;
    setBusy(true); setError(null);
    let fb: FeedbackResult | null = null;
    try { setAnalyzing(true); fb = await analyzeRecording(hasRecording); setFeedback(fb); } catch (e) { console.error(e); }
    setAnalyzing(false);
    const result = await uploadPracticeRecording(student.id, task.id, hasRecording);
    if (!result) { setError('Could not save your recording. Please try again.'); setBusy(false); return; }
    const { error: insErr } = await supabase.from('recordings').insert({
      task_id: task.id, student_id: student.id, audio_url: result.path,
      feedback_summary: fb?.summary || null,
    });
    setBusy(false);
    if (insErr) { setError(insErr.message); return; }
    setSaved(true); setHasRecording(null);
    if (recordingUrl) { URL.revokeObjectURL(recordingUrl); setRecordingUrl(null); }
    onSaved();
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1"><Mic className="w-5 h-5 text-sage-700" /><h3 className="font-display text-lg font-semibold text-ink-800">Record your practice</h3></div>
      <p className="text-ink-500 text-sm mb-4">Play the task, then tap stop when you're done. You'll get a little feedback too.</p>

      {saved && (<div className="rounded-xl bg-sage-50 border border-sage-200 text-sage-800 text-sm px-4 py-3 mb-4 flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /><span>Nice work! Your recording is saved with feedback. It's in your library.</span></div>)}
      {error && (<div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 mb-4 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span></div>)}

      <div className="flex flex-col items-center gap-4 py-4 bg-sand-50 rounded-xl border border-sand-100">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition ${recording ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-sage-700 shadow-soft'}`}><Mic className="w-9 h-9" /></div>
        {recording && (<div className="text-sm font-medium text-rose-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Recording… {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>)}
        {recordingUrl && !recording && (<div className="w-full px-4"><audio src={recordingUrl} controls className="w-full" /></div>)}
        <div className="flex gap-3 flex-wrap justify-center">
          {recording ? (<button className="btn-danger" onClick={stop}><Square className="w-5 h-5" /> Stop</button>)
            : (<button className="btn-primary" onClick={start} disabled={busy}>{hasRecording ? <><Mic className="w-5 h-5" /> Record again</> : <><Mic className="w-5 h-5" /> Start recording</>}</button>)}
          {hasRecording && !recording && (<button className="btn-secondary" onClick={save} disabled={busy}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} {analyzing ? 'Listening…' : 'Save & get feedback'}</button>)}
        </div>
      </div>

      {feedback && !saved && (<FeedbackCard fb={feedback} />)}
      {saved && feedback && (<FeedbackCard fb={feedback} />)}
      {saved && (<button onClick={onGoLibrary} className="btn-ghost w-full mt-3 text-sm"><Play className="w-4 h-4" /> View in your library</button>)}
    </div>
  );
}

function FeedbackCard({ fb }: { fb: FeedbackResult }) {
  return (
    <div className="mt-4 rounded-xl border border-sage-200 bg-sage-50 p-4">
      <div className="flex items-center gap-2 mb-2 text-sage-800"><Sparkles className="w-4 h-4" /><span className="font-semibold text-sm">Your feedback</span></div>
      <p className="text-sm text-ink-700 mb-3">{fb.summary}</p>
      <div className="grid grid-cols-2 gap-3">
        <Meter icon={<Activity className="w-4 h-4" />} label="In tune" value={fb.inTunePct} />
        <Meter icon={<TrendingUp className="w-4 h-4" />} label="Steady timing" value={fb.steadyScore} />
      </div>
    </div>
  );
}

function Meter({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const color = value >= 75 ? 'bg-sage-500' : value >= 50 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-ink-600 mb-1"><span className="flex items-center gap-1">{icon} {label}</span><span className="font-semibold">{value}%</span></div>
      <div className="h-2 rounded-full bg-ink-100 overflow-hidden"><div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

/* ---------------- Library ---------------- */

function LibraryView({ onNavigate }: { onNavigate: (v: string) => void }) {
  void onNavigate;
  const { student, loading } = useStudent();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recordings, setRecordings] = useState<Record<string, Recording[]>>({});
  const [busy, setBusy] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    (async () => {
      if (!student) { setBusy(false); return; }
      const [{ data: taskRows }, { data: recRows }] = await Promise.all([
        supabase.from('tasks').select('*').or(`student_id.eq.${student.id},group_name.eq.${student.group_name || '__none__'}`).order('created_at', { ascending: false }),
        supabase.from('recordings').select('*').eq('student_id', student.id).order('created_at', { ascending: false }),
      ]);
      setTasks((taskRows as Task[]) || []);
      const map: Record<string, Recording[]> = {};
      (recRows as Recording[] || []).forEach((r) => { (map[r.task_id] ||= []).push(r); });
      setRecordings(map);
      const days = new Set<string>();
      (recRows as Recording[] || []).forEach((r) => days.add(r.created_at.slice(0, 10)));
      let s = 0; const d = new Date();
      while (days.has(d.toISOString().slice(0, 10))) { s++; d.setDate(d.getDate() - 1); }
      setStreak(s);
      setBusy(false);
    })();
  }, [student]);

  if (loading || busy) return <div className="card p-8 text-center text-ink-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;
  if (!student) return <NotLinked />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <Header title="Library" subtitle="Your practice diary — every task and recording." />
        {streak > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sand-100 text-sand-800 text-sm font-semibold">
            <Sparkles className="w-4 h-4" /> {streak}-day streak
          </div>
        )}
      </div>
      {tasks.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-sand-100 text-sand-700 flex items-center justify-center mx-auto mb-4"><Clock className="w-7 h-7" /></div>
          <h3 className="font-display text-xl font-semibold text-ink-800 mb-1">Nothing here yet</h3>
          <p className="text-ink-500 text-sm">Your tasks and recordings will collect here over time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((t) => <LibraryTaskCard key={t.id} task={t} recs={recordings[t.id] || []} />)}
        </div>
      )}
    </div>
  );
}

function LibraryTaskCard({ task, recs }: { task: Task; recs: Recording[] }) {
  const [open, setOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [tabUrl, setTabUrl] = useState<string | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const loadMedia = useCallback(async () => {
    if (mediaLoaded) return;
    const [v, a, tab] = await Promise.all([
      task.video_url ? resolveMediaUrl('task-media', task.video_url) : Promise.resolve(null),
      task.audio_url ? resolveMediaUrl('task-media', task.audio_url) : Promise.resolve(null),
      task.tab_url ? resolveMediaUrl('task-media', task.tab_url) : Promise.resolve(null),
    ]);
    setVideoUrl(v); setAudioUrl(a); setTabUrl(tab);
    setMediaLoaded(true);
  }, [task.video_url, task.audio_url, task.tab_url, mediaLoaded]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadMedia();
  };

  const hasMedia = !!(task.video_url || task.audio_url || task.tab_url);

  return (
    <div className="card p-4">
      <button onClick={toggle} className="flex items-start gap-3 w-full text-left">
        <div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0"><Music4 className="w-5 h-5" /></div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-ink-800">{task.title}</div>
          <div className="text-xs text-ink-400 flex items-center gap-1 mt-0.5 flex-wrap">
            <Calendar className="w-3 h-3" /> {new Date(task.created_at).toLocaleDateString()} · {recs.length} recording{recs.length === 1 ? '' : 's'}
            {hasMedia && <span className="text-sage-600 ml-1">· has materials</span>}
          </div>
        </div>
        <div className={`text-ink-400 transition ${open ? 'rotate-180' : ''}`}><ChevronIcon /></div>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-ink-100 space-y-3">
          {task.notes && <p className="text-sm text-ink-600 whitespace-pre-wrap">{task.notes}</p>}

          {!mediaLoaded ? (
            hasMedia && <div className="text-xs text-ink-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading materials…</div>
          ) : (
            <>
              {videoUrl && (
                <div>
                  <div className="text-xs font-semibold text-ink-700 mb-1.5 flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Watch</div>
                  <video src={videoUrl} controls className="w-full rounded-xl bg-ink-900" />
                </div>
              )}
              {audioUrl && (
                <div>
                  <div className="text-xs font-semibold text-ink-700 mb-1.5 flex items-center gap-1.5"><FileMusic className="w-3.5 h-3.5" /> Listen</div>
                  <audio src={audioUrl} controls className="w-full" />
                </div>
              )}
              {tabUrl && (
                <a href={tabUrl} download className="btn-secondary w-full sm:w-auto text-sm">
                  <Download className="w-4 h-4" /> Download tab / notation
                </a>
              )}
            </>
          )}

          {recs.length === 0 ? (
            <p className="text-sm text-ink-400">No recordings saved for this task yet.</p>
          ) : (
            <ul className="space-y-2">
              {recs.map((r) => <RecordingRow key={r.id} rec={r} />)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RecordingRow({ rec }: { rec: Recording }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => { const u = await resolveMediaUrl('practice-recordings', rec.audio_url); setUrl(u); setLoading(false); })();
  }, [rec.audio_url]);
  return (
    <li className="rounded-xl bg-sand-50 border border-sand-100 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-sage-100 text-sage-700 flex items-center justify-center"><Mic className="w-3.5 h-3.5" /></div>
        <div className="text-xs text-ink-500">{new Date(rec.created_at).toLocaleString()}</div>
      </div>
      {loading ? <div className="text-xs text-ink-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
        : url ? <audio src={url} controls className="w-full" />
        : <div className="text-xs text-rose-600">Could not load audio.</div>}
      {rec.feedback_summary && (
        <p className="text-xs text-ink-600 mt-2 flex items-start gap-1.5"><Sparkles className="w-3 h-3 mt-0.5 shrink-0 text-sage-600" /> {rec.feedback_summary}</p>
      )}
    </li>
  );
}

/* ---------------- Request form ---------------- */

function RequestView({ onNavigate }: { onNavigate: (v: string) => void }) {
  void onNavigate;
  const { student, loading } = useStudent();
  const [song, setSong] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [mine, setMine] = useState<SongRequest[]>([]);

  const loadMine = useCallback(async () => {
    if (!student) return;
    const { data } = await supabase.from('requests').select('*').eq('student_id', student.id).order('created_at', { ascending: false });
    setMine((data as SongRequest[]) || []);
  }, [student]);

  useEffect(() => { loadMine(); }, [loadMine]);

  if (loading) return <div className="card p-8 text-center text-ink-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;
  if (!student) return <NotLinked />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !song.trim()) return;
    setBusy(true); setError(null);
    const { error } = await supabase.from('requests').insert({ student_id: student.id, song_name: song.trim(), note: note.trim() || null });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setSong(''); setNote(''); setDone(true); loadMine();
    setTimeout(() => setDone(false), 4000);
  };

  return (
    <div className="space-y-6">
      <Header title="Request a song" subtitle="Tell your teacher what you'd love to learn." />
      <div className="card p-5 sm:p-6">
        {done && <div className="rounded-xl bg-sage-50 border border-sage-200 text-sage-800 text-sm px-4 py-3 mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Request sent — your teacher will see it!</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="song">Song or piece name</label>
            <input id="song" className="input" value={song} onChange={(e) => setSong(e.target.value)} placeholder="e.g. Smoke on the Water" required />
          </div>
          <div>
            <label className="label" htmlFor="rnote">Note (optional)</label>
            <textarea id="rnote" className="input min-h-[80px] resize-y" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything you'd like to say about it…" />
          </div>
          {error && <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Send request</button>
        </form>
      </div>

      {mine.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-ink-700 mb-2">Your requests</div>
          <ul className="space-y-2">
            {mine.map((r) => (
              <li key={r.id} className="card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sand-100 text-sand-700 flex items-center justify-center"><Heart className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink-800 text-sm truncate">{r.song_name}</div>
                  {r.note && <div className="text-xs text-ink-500 truncate">{r.note}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'reviewed' ? 'bg-sage-100 text-sage-700' : 'bg-amber-100 text-amber-700'}`}>{r.status === 'reviewed' ? 'Reviewed' : 'Pending'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
}
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadTaskMedia, resolveMediaUrl } from '../lib/storage';
import { Student, Task, Recording } from '../lib/types';
import {
  Users, Plus, Music4, Mail, UserCircle, Calendar, Video, FileMusic,
  X, Send, Loader2, Inbox, Clock, CheckCircle2, AlertCircle, Pencil,
} from 'lucide-react';

type View = 'students' | 'requests' | 'history';

export default function TeacherDashboard({ view, onNavigate }: { view: string; onNavigate: (v: string) => void }) {
  const v = (['students', 'requests', 'history'].includes(view) ? view : 'students') as View;
  if (v === 'students') return <StudentsView onNavigate={onNavigate} />;
  if (v === 'requests') return <RequestsView />;
  return <HistoryView />;
}

/* ---------------- Students view ---------------- */

function StudentsView({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    setStudents((data as Student[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-800">Your students</h1>
          <p className="text-ink-500 text-sm mt-0.5">Manage your roster and set weekly tasks.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-5 h-5" /> Add student
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-ink-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No students yet"
          body="Add your first student by name and email. They'll be linked automatically when they sign up."
          action={<button className="btn-primary mt-2" onClick={() => setShowAdd(true)}><Plus className="w-5 h-5" /> Add student</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="card p-5 text-left hover:shadow-lift transition group"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center shrink-0">
                  <UserCircle className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink-800 truncate">{s.name}</div>
                  <div className="text-sm text-ink-500 truncate flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {s.email}
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {s.group_name ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-sand-100 text-sand-700 font-medium">{s.group_name}</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-500">Solo</span>
                    )}
                    {s.user_id ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Joined
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Invite sent</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showAdd && <AddStudentModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {selected && (
        <StudentDetailModal
          student={selected}
          onClose={() => setSelected(null)}
          onTaskCreated={() => { setSelected(null); onNavigate('history'); }}
        />
      )}
    </div>
  );
}

function AddStudentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('students').insert({
      teacher_id: profile.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      group_name: group.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.code === '23505' ? 'You already have a student with that email.' : error.message);
      return;
    }
    onSaved();
  };

  return (
    <Modal title="Add a student" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="sname">Student or family name</label>
          <input id="sname" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jamie Lee" required />
        </div>
        <div>
          <label className="label" htmlFor="semail">Email</label>
          <input id="semail" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="they@example.com" required />
          <p className="text-xs text-ink-400 mt-1">They'll use this to sign up. The account links automatically.</p>
        </div>
        <div>
          <label className="label" htmlFor="sgroup">Group (optional)</label>
          <input id="sgroup" className="input" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. Tuesday Beginners" />
          <p className="text-xs text-ink-400 mt-1">Assign a task to a group to share it with everyone in it.</p>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex gap-3 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Add student</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StudentDetailModal({ student, onClose, onTaskCreated }: { student: Student; onClose: () => void; onTaskCreated: () => void }) {
  const [tab, setTab] = useState<'overview' | 'newtask'>('overview');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const openNewTask = () => { setEditingTask(null); setTab('newtask'); };
  const openEditTask = (t: Task) => { setEditingTask(t); setTab('newtask'); };

  return (
    <Modal title={student.name} onClose={onClose} wide>
      <div className="flex gap-1 border-b border-ink-100 mb-4 -mt-1">
        <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabBtn>
        <TabBtn active={tab === 'newtask'} onClick={openNewTask}>
          {editingTask && tab === 'newtask' ? 'Edit task' : "Set this week's task"}
        </TabBtn>
      </div>
      {tab === 'overview' ? (
        <StudentOverview student={student} onSetTask={openNewTask} onEditTask={openEditTask} />
      ) : (
        <SetTaskForm student={student} existingTask={editingTask} onDone={onTaskCreated} />
      )}
    </Modal>
  );
}

function StudentOverview({ student, onSetTask, onEditTask }: { student: Student; onSetTask: () => void; onEditTask: (t: Task) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [student.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-ink-500">
        <Mail className="w-4 h-4" /> {student.email}
        {student.group_name && <span className="px-2 py-0.5 rounded-full bg-sand-100 text-sand-700 text-xs font-medium">{student.group_name}</span>}
        {student.user_id ? (
          <span className="px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-xs font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Joined</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Invite sent</span>
        )}
      </div>
      <button className="btn-primary w-full" onClick={onSetTask}><Plus className="w-5 h-5" /> Set this week's task</button>
      <div>
        <div className="text-sm font-semibold text-ink-700 mb-2">Recent tasks</div>
        {loading ? (
          <div className="text-ink-400 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-ink-400">No tasks assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.slice(0, 5).map((t) => (
              <li key={t.id} className="card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sage-100 text-sage-700 flex items-center justify-center shrink-0"><Music4 className="w-4 h-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink-800 text-sm truncate">{t.title}</div>
                  <div className="text-xs text-ink-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(t.created_at).toLocaleDateString()}</div>
                </div>
                <button
                  type="button"
                  className="btn-ghost p-2 shrink-0"
                  aria-label="Edit task"
                  onClick={() => onEditTask(t)}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SetTaskForm({ student, existingTask, onDone }: { student: Student; existingTask: Task | null; onDone: () => void }) {
  const { profile } = useAuth();
  const isEditing = !!existingTask;
  const [title, setTitle] = useState(existingTask?.title || '');
  const [notes, setNotes] = useState(existingTask?.notes || '');
  const [mission, setMission] = useState(existingTask?.mission || '');
  const [successCriteria, setSuccessCriteria] = useState(existingTask?.success_criteria || '');
  const [dueAt, setDueAt] = useState(existingTask?.due_at ? new Date(existingTask.due_at).toISOString().slice(0, 16) : '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(existingTask?.estimated_minutes?.toString() || '');
  const [video, setVideo] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [tab, setTab] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingVideoName = existingTask?.video_url ? existingTask.video_url.split('/').pop() : null;
  const existingAudioName = existingTask?.audio_url ? existingTask.audio_url.split('/').pop() : null;
  const existingTabName = existingTask?.tab_url ? existingTask.tab_url.split('/').pop() : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!title.trim()) { setError('Give the task a title.'); return; }
    setBusy(true);
    setError(null);

    let task: Task;

    if (isEditing && existingTask) {
      const { data: updatedRow, error: updErr } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          notes: notes.trim() || null,
          mission: mission.trim() || null,
          success_criteria: successCriteria.trim() || null,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        })
        .eq('id', existingTask.id)
        .select()
        .single();
      if (updErr || !updatedRow) {
        setError(updErr?.message || 'Could not update task.');
        setBusy(false);
        return;
      }
      task = updatedRow as Task;
    } else {
      const { data: taskRow, error: insErr } = await supabase.from('tasks').insert({
        teacher_id: profile.id,
        student_id: student.id,
        group_name: null,
        title: title.trim(),
        notes: notes.trim() || null,
        mission: mission.trim() || null,
        success_criteria: successCriteria.trim() || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      }).select().single();
      if (insErr || !taskRow) {
        setError(insErr?.message || 'Could not create task.');
        setBusy(false);
        return;
      }
      task = taskRow as Task;
    }

    let videoUrl: string | null = existingTask?.video_url || null;
    let audioUrl: string | null = existingTask?.audio_url || null;
    let tabUrl: string | null = existingTask?.tab_url || null;
    try {
      if (video) {
        const r = await uploadTaskMedia(profile.id, task.id, video, 'video');
        if (r) videoUrl = r.path;
      }
      if (audio) {
        const r = await uploadTaskMedia(profile.id, task.id, audio, 'audio');
        if (r) audioUrl = r.path;
      }
      if (tab) {
        const r = await uploadTaskMedia(profile.id, task.id, tab, 'tab');
        if (r) tabUrl = r.path;
      }
    } catch (err) {
      console.error(err);
    }

    if (!isEditing ? (videoUrl || audioUrl || tabUrl) : (video || audio || tab)) {
      const { error: updErr } = await supabase.from('tasks').update({
        video_url: videoUrl, audio_url: audioUrl, tab_url: tabUrl,
      }).eq('id', task.id);
      if (updErr) console.error(updErr);
    }

    setBusy(false);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="ttitle">Task title</label>
        <input id="ttitle" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Open string warm-up" required />
      </div>
      <div>
        <label className="label" htmlFor="tnotes">Notes</label>
        <textarea id="tnotes" className="input min-h-[90px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What to focus on this week…" />
      </div>
      <div>
        <label className="label" htmlFor="tmission">Today’s mission</label>
        <input id="tmission" className="input" value={mission} onChange={(e) => setMission(e.target.value)} placeholder="e.g. Keep the riff steady at a slow tempo" />
      </div>
      <div>
        <label className="label" htmlFor="tcriteria">You’re done when…</label>
        <input id="tcriteria" className="input" value={successCriteria} onChange={(e) => setSuccessCriteria(e.target.value)} placeholder="e.g. You can play it through twice without stopping" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="tdue">Next check-in (optional)</label>
          <input id="tdue" type="datetime-local" className="input" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="tminutes">Focused minutes (optional)</label>
          <input id="tminutes" type="number" min="1" max="240" className="input" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} placeholder="e.g. 10" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <FileInput label="Video of you playing (optional)" accept="video/*" icon={<Video className="w-4 h-4" />} file={video} onChange={setVideo} existingName={existingVideoName} />
        <FileInput label="Audio (optional)" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" icon={<FileMusic className="w-4 h-4" />} file={audio} onChange={setAudio} existingName={existingAudioName} />
        <FileInput label="Tab / notation (PDF or image)" accept="application/pdf,image/*" icon={<FileMusic className="w-4 h-4" />} file={tab} onChange={setTab} existingName={existingTabName} />
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn-primary flex-1" disabled={busy}>
          {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</> : <><Send className="w-5 h-5" /> {isEditing ? 'Save changes' : 'Assign task'}</>}
        </button>
      </div>
    </form>
  );
}

/* ---------------- Requests view ---------------- */

function RequestsView() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Array<{ id: string; song_name: string; note: string | null; status: string; created_at: string; student_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('requests')
      .select('id, song_name, note, status, created_at, student_id, students!inner(name)')
      .eq('students.teacher_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
      const requestRows = (data || []) as Array<{
        id: string;
        song_name: string;
        note: string | null;
        status: string;
        created_at: string;
        students: { name: string } | { name: string }[] | null;
      }>;
      setRows(requestRows.map((r) => {
        const linkedStudent = Array.isArray(r.students) ? r.students[0] : r.students;
        return { id: r.id, song_name: r.song_name, note: r.note, status: r.status, created_at: r.created_at, student_name: linkedStudent?.name || 'Unknown' };
      }));
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const markReviewed = async (id: string) => {
    setReviewingId(id);
    setActionError(null);
    const { data, error } = await supabase
      .from('requests')
      .update({ status: 'reviewed' })
      .eq('id', id)
      .select('id, status')
      .maybeSingle();
    setReviewingId(null);
    if (error || !data) {
      setActionError(error?.message || 'This request could not be marked reviewed. Please refresh and try again.');
      return;
    }
    setRows((current) => current.map((request) => request.id === id ? { ...request, status: data.status } : request));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-800">Song requests</h1>
        <p className="text-ink-500 text-sm mt-0.5">Pieces your students would love to learn, newest first.</p>
      </div>
      {actionError && <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">{actionError}</div>}
      {loading ? (
        <div className="card p-8 text-center text-ink-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Inbox className="w-8 h-8" />} title="No requests yet" body="When a student asks to learn a song, it'll show up here." />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sand-100 text-sand-700 flex items-center justify-center shrink-0"><Music4 className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink-800">{r.song_name}</div>
                <div className="text-sm text-ink-500">from {r.student_name}</div>
                {r.note && <p className="text-sm text-ink-600 mt-1.5 bg-sand-50 rounded-lg p-2.5 border border-sand-100">{r.note}</p>}
                <div className="text-xs text-ink-400 mt-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              {r.status === 'pending' ? (
                <button className="btn-secondary px-3 py-2 text-sm" onClick={() => markReviewed(r.id)} disabled={reviewingId === r.id}>{reviewingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {reviewingId === r.id ? 'Saving…' : 'Mark reviewed'}</button>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full bg-sage-100 text-sage-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Reviewed</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- History view (per-student drill-down) ---------------- */

function HistoryView() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Student | null>(null);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data, error } = await supabase.from('students').select('*').eq('teacher_id', profile.id).order('name', { ascending: true });
      if (error) console.error(error);
      setStudents((data as Student[]) || []);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <div className="card p-8 text-center text-ink-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>;

  if (selected) return <StudentHistory student={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-800">Student history</h1>
        <p className="text-ink-500 text-sm mt-0.5">Pick a student to see their tasks and practice recordings.</p>
      </div>
      {students.length === 0 ? (
        <EmptyState icon={<Clock className="w-8 h-8" />} title="No students yet" body="Add students from the Students tab to see their history here." />
      ) : (
        <ul className="space-y-2">
          {students.map((s) => (
            <li key={s.id}>
              <button onClick={() => setSelected(s)} className="card p-4 w-full text-left flex items-center gap-3 hover:shadow-lift transition">
                <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center shrink-0"><UserCircle className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-800 truncate">{s.name}</div>
                  <div className="text-xs text-ink-400 truncate">{s.email}{s.group_name ? ` · ${s.group_name}` : ''}</div>
                </div>
                <span className="text-ink-300"><ChevronIcon /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StudentHistory({ student, onBack }: { student: Student; onBack: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: taskRows }, { data: recordingRows }] = await Promise.all([
      supabase.from('tasks').select('*').eq('student_id', student.id).order('created_at', { ascending: false }),
      supabase.from('recordings').select('*').eq('student_id', student.id).order('created_at', { ascending: false }),
    ]);
    setTasks((taskRows as Task[]) || []);
    setRecordings((recordingRows as Recording[]) || []);
    setLoading(false);
  }, [student.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-ghost px-3 py-2 text-sm -ml-2"><BackIcon /> All students</button>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center"><UserCircle className="w-7 h-7" /></div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-800">{student.name}</h1>
          <p className="text-ink-500 text-sm">{student.email}{student.group_name ? ` · ${student.group_name}` : ''}</p>
        </div>
      </div>
      {loading ? (
        <div className="card p-8 text-center text-ink-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={<Clock className="w-8 h-8" />} title="No tasks yet" body="You haven't assigned this student any tasks yet." />
      ) : (
        <ul className="space-y-3">
          {tasks.map((t) => {
            const taskRecordings = recordings.filter((r) => r.task_id === t.id);
            return (
              <li key={t.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0"><Music4 className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink-800">{t.title}</div>
                    {t.notes && <p className="text-sm text-ink-600 mt-1 whitespace-pre-wrap">{t.notes}</p>}
                    {t.mission && <p className="text-sm text-sage-800 mt-2"><span className="font-semibold">Mission:</span> {t.mission}</p>}
                    <div className="text-xs text-ink-400 mt-2 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(t.created_at).toLocaleDateString()}</span>
                      {t.video_url && <span className="flex items-center gap-1 text-sage-700"><Video className="w-3 h-3" /> Video</span>}
                      {t.audio_url && <span className="flex items-center gap-1 text-sage-700"><FileMusic className="w-3 h-3" /> Audio</span>}
                      {t.tab_url && <span className="flex items-center gap-1 text-sage-700"><FileMusic className="w-3 h-3" /> Tab</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost p-2 shrink-0"
                    aria-label="Edit task"
                    onClick={() => setEditingTask(t)}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-ink-100">
                  <div className="text-sm font-semibold text-ink-700 mb-2">Practice takes</div>
                  {taskRecordings.length === 0 ? (
                    <p className="text-sm text-ink-400">No take yet. The learner will see this assignment in their practice view.</p>
                  ) : (
                    <div className="space-y-3">
                      {taskRecordings.map((recording) => <TeacherRecordingReview key={recording.id} recording={recording} onSaved={load} />)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editingTask && (
        <Modal title={`Edit: ${editingTask.title}`} onClose={() => setEditingTask(null)}>
          <SetTaskForm
            student={student}
            existingTask={editingTask}
            onDone={() => { setEditingTask(null); load(); }}
          />
        </Modal>
      )}
    </div>
  );
}

function TeacherRecordingReview({ recording, onSaved }: { recording: Recording; onSaved: () => void }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(true);
  const [feedback, setFeedback] = useState(recording.teacher_feedback || '');
  const [nextAction, setNextAction] = useState(recording.teacher_next_action || '');
  const [status, setStatus] = useState<Recording['review_status']>(recording.review_status || 'needs_review');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const url = await resolveMediaUrl('practice-recordings', recording.audio_url);
      if (active) { setAudioUrl(url); setLoadingAudio(false); }
    })();
    return () => { active = false; };
  }, [recording.audio_url]);

  const saveReview = async () => {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.from('recordings').update({
      teacher_feedback: feedback.trim() || null,
      teacher_next_action: nextAction.trim() || null,
      review_status: status,
      reviewed_at: new Date().toISOString(),
    }).eq('id', recording.id);
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    onSaved();
  };

  return (
    <div className="rounded-xl bg-sand-50 border border-sand-100 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-ink-500">
        <span>{new Date(recording.created_at).toLocaleString()}</span>
        <span className={`px-2 py-0.5 rounded-full font-medium ${status === 'ready' ? 'bg-sage-100 text-sage-700' : status === 'retry' ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-600'}`}>{status.replace('_', ' ')}</span>
      </div>
      {loadingAudio ? <div className="text-xs text-ink-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading take…</div> : audioUrl ? <audio src={audioUrl} controls className="w-full" /> : <div className="text-xs text-rose-600">Could not load the practice take.</div>}
      {(recording.reflection || recording.confidence) && <div className="text-xs text-ink-600 rounded-lg bg-white p-2.5 border border-ink-100">{recording.confidence && <div><span className="font-semibold">Learner confidence:</span> {recording.confidence}/5</div>}{recording.reflection && <div className="mt-1"><span className="font-semibold">They noticed:</span> {recording.reflection}</div>}</div>}
      <div>
        <label className="label text-xs" htmlFor={`feedback-${recording.id}`}>One helpful nudge</label>
        <textarea id={`feedback-${recording.id}`} className="input min-h-[72px] resize-y text-sm" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Name one win, then give one precise next step." />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-xs" htmlFor={`next-${recording.id}`}>What should happen next?</label>
          <input id={`next-${recording.id}`} className="input text-sm" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="e.g. Try it again at 70 BPM" />
        </div>
        <div>
          <label className="label text-xs" htmlFor={`status-${recording.id}`}>Outcome</label>
          <select id={`status-${recording.id}`} className="input text-sm" value={status} onChange={(e) => setStatus(e.target.value as Recording['review_status'])}>
            <option value="needs_review">Needs review</option>
            <option value="retry">Try again</option>
            <option value="ready">Ready for next step</option>
            <option value="discuss_live">Discuss live</option>
          </select>
        </div>
      </div>
      {error && <div className="text-xs text-rose-700 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">{error}</div>}
      <button type="button" className="btn-primary w-full text-sm" onClick={saveReview} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send learner nudge</button>
    </div>
  );
}

function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="15 18 9 12 15 6" /></svg>;
}

function ChevronIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
}

/* ---------------- shared bits ---------------- */

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className={`card w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-xl2`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-3 sticky top-0 bg-white">
          <h3 className="font-display text-xl font-semibold text-ink-800">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 -mr-1" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${active ? 'border-sage-600 text-sage-700' : 'border-transparent text-ink-500 hover:text-ink-700'}`}>{children}</button>
  );
}

function FileInput({ label, accept, icon, file, onChange, existingName }: { label: string; accept: string; icon: React.ReactNode; file: File | null; onChange: (f: File | null) => void; existingName?: string | null }) {
  const displayName = file ? file.name : existingName ? `${existingName} (current — tap to replace)` : null;
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className={`rounded-xl border-2 border-dashed px-3 py-3 text-sm flex items-center gap-2 cursor-pointer transition ${file ? 'border-sage-400 bg-sage-50 text-sage-800' : existingName ? 'border-sage-300 bg-sage-50/50 text-ink-600' : 'border-ink-200 text-ink-500 hover:border-sage-300'}`}>
        {icon}
        <span className="truncate flex-1">{displayName || 'Tap to choose a file'}</span>
        {file && <button type="button" className="text-ink-400 hover:text-rose-600" onClick={(e) => { e.preventDefault(); onChange(null); }}><X className="w-4 h-4" /></button>}
        <input type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </div>
    </label>
  );
}

function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-sand-100 text-sand-700 flex items-center justify-center mx-auto mb-4">{icon}</div>
      <h3 className="font-display text-xl font-semibold text-ink-800 mb-1">{title}</h3>
      <p className="text-ink-500 max-w-md mx-auto text-sm">{body}</p>
      {action}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 flex items-start gap-2">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{children}</span>
    </div>
  );
}

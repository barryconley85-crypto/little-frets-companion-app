import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadTaskMedia } from '../lib/storage';
import { GuitarMuscle, SongPreparationRequest, Student, Task } from '../lib/types';
import { GUITAR_MUSCLES, getMuscle, getTaskHealth, toggleMuscle } from '../lib/curriculum';
import {
  AlertCircle, Calendar, CheckCircle2, FileMusic, Loader2, Mail,
  Music4, Pencil, Plus, Send, UserCircle, Users, Video, X,
} from 'lucide-react';

export default function TeacherDashboard() {
  return <StudentsView />;
}

function StudentsView() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [songRequests, setSongRequests] = useState<SongPreparationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [{ data: studentRows, error: studentError }, { data: taskRows, error: taskError }, { data: requestRows, error: requestError }] = await Promise.all([
      supabase.from('students').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('song_preparation_requests').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (studentError || taskError || requestError) console.error(studentError || taskError || requestError);
    setStudents((studentRows as Student[]) || []);
    setTasks((taskRows as Task[]) || []);
    setSongRequests((requestRows as SongPreparationRequest[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-800">Your teaching studio</h1>
          <p className="text-ink-500 text-sm mt-0.5">Set clear, professional practice missions. Learner practice takes stay private to them.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-5 h-5" /> Add student
        </button>
      </div>

      <section className="teacher-command">
        <div className="relative z-10">
          <p className="growth-eyebrow">Safeguarded teaching space</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Missions, not messages</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/70">You set the work and materials here. Learners practise and listen back privately in their own Passport.</p>
        </div>
        <div className="relative z-10 mt-5 grid grid-cols-3 gap-3 max-w-xl">
          <div className="teacher-stat"><span className="teacher-stat-value">{students.length}</span><span className="teacher-stat-label">learners in studio</span></div>
          <div className="teacher-stat"><span className="teacher-stat-value">{students.filter((student) => Boolean(student.user_id)).length}</span><span className="teacher-stat-label">connected learners</span></div>
          <div className="teacher-stat"><span className="teacher-stat-value">{songRequests.filter((request) => request.status === 'new').length}</span><span className="teacher-stat-label">songs to prepare</span></div>
        </div>
      </section>

      {!loading && <><SongPreparationBoard requests={songRequests} students={students} onStatusChange={async (request, status) => { const { data, error } = await supabase.from('song_preparation_requests').update({ status }).eq('id', request.id).select().single(); if (!error && data) setSongRequests((current) => current.map((item) => item.id === request.id ? data as SongPreparationRequest : item)); }} /><PracticeDesignDashboard students={students} tasks={tasks} /></>}

      {loading ? (
        <div className="card p-8 text-center text-ink-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No students yet"
          body="Add your first student by name and email. They will link automatically when they sign up."
          action={<button className="btn-primary mt-2" onClick={() => setShowAdd(true)}><Plus className="w-5 h-5" /> Add student</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {students.map((student) => (
            <button key={student.id} onClick={() => setSelected(student)} className="card p-5 text-left hover:shadow-lift transition group">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center shrink-0"><UserCircle className="w-6 h-6" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink-800 truncate">{student.name}</div>
                  <div className="text-sm text-ink-500 truncate flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {student.email}</div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {student.group_name ? <span className="text-xs px-2 py-0.5 rounded-full bg-sand-100 text-sand-700 font-medium">{student.group_name}</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-500">Solo</span>}
                    {student.user_id ? <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Joined</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Invite sent</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showAdd && <AddStudentModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {selected && <StudentDetailModal student={selected} onClose={() => setSelected(null)} onTaskCreated={() => { setSelected(null); load(); }} />}
    </div>
  );
}

function SongPreparationBoard({ requests, students, onStatusChange }: { requests: SongPreparationRequest[]; students: Student[]; onStatusChange: (request: SongPreparationRequest, status: SongPreparationRequest['status']) => Promise<void> }) {
  const [updating, setUpdating] = useState<string | null>(null);
  const resolveName = (studentId: string) => students.find((student) => student.id === studentId)?.name || 'Learner';
  const updateStatus = async (request: SongPreparationRequest, status: SongPreparationRequest['status']) => { setUpdating(request.id); await onStatusChange(request, status); setUpdating(null); };
  return <section className="card p-5 sm:p-6"><div className="flex items-start justify-between gap-4 flex-wrap"><div><p className="growth-eyebrow text-sand-700">Before the next lesson</p><h2 className="font-display text-2xl font-semibold text-ink-800">Songs to prepare</h2><p className="mt-1 max-w-2xl text-sm text-ink-500">This is a bounded preparation list: song title and original artist only. There are no messages, replies, notes, recordings, or attachments.</p></div><span className="rounded-full bg-sand-100 text-sand-800 px-3 py-1 text-xs font-semibold">{requests.filter((request) => request.status === 'new').length} new</span></div>{requests.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-sand-50 px-4 py-5 text-sm text-ink-500">No songs to prepare yet. Learners can add a title and original artist from their private practice area.</div> : <ul className="mt-4 space-y-2">{requests.map((request) => <li key={request.id} className="rounded-xl border border-ink-100 bg-white p-3 sm:p-4"><div className="flex items-start justify-between gap-3 flex-wrap"><div className="min-w-0"><div className="font-semibold text-ink-800">{request.song_title}</div><div className="mt-0.5 text-sm text-ink-500">{request.artist} <span className="text-ink-300">·</span> from {resolveName(request.student_id)}</div><div className="mt-1 text-[11px] text-ink-400">Added {new Date(request.created_at).toLocaleDateString()}</div></div><div className="flex items-center gap-2"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${request.status === 'ready' ? 'bg-sage-100 text-sage-700' : request.status === 'preparing' ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-600'}`}>{request.status === 'new' ? 'To prepare' : request.status === 'preparing' ? 'Preparing' : 'Ready'}</span><select aria-label={`Preparation status for ${request.song_title}`} className="input text-xs py-1.5 w-auto" value={request.status} disabled={updating === request.id} onChange={(event) => updateStatus(request, event.target.value as SongPreparationRequest['status'])}><option value="new">To prepare</option><option value="preparing">Preparing</option><option value="ready">Ready</option></select></div></div></li>)}</ul>}</section>;
}

type PlanRow = { student: Student; task: Task | null; health: ReturnType<typeof getTaskHealth> | null };

function PracticeDesignDashboard({ students, tasks }: { students: Student[]; tasks: Task[] }) {
  const planRows: PlanRow[] = students.map((student) => {
    const task = tasks.find((item) => item.student_id === student.id || (student.group_name !== null && item.group_name === student.group_name)) || null;
    return { student, task, health: task ? getTaskHealth(task) : null };
  });
  const plannedRows = planRows.filter((row) => row.task && row.health);
  const readyPlans = plannedRows.filter((row) => row.health?.ready).length;
  const muscleCounts = GUITAR_MUSCLES.map((muscle) => ({
    ...muscle,
    count: tasks.filter((task) => task.skill_tags.includes(muscle.id)).length,
  }));
  const planTotal = plannedRows.reduce((total, row) => total + (row.health?.score || 0), 0);
  const planPossible = plannedRows.reduce((total, row) => total + (row.health?.total || 0), 0);
  const healthPercent = planPossible ? Math.round((planTotal / planPossible) * 100) : 0;

  return (
    <section className="card p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="growth-eyebrow text-sage-700">Teacher-only planning insight</p>
          <h2 className="font-display text-2xl font-semibold text-ink-800">Practice Design Dashboard</h2>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">This looks only at the missions, materials, and check-ins you create. It never reads private learner recordings or activity.</p>
        </div>
        <div className="rounded-xl bg-sage-50 border border-sage-100 px-4 py-3 text-right">
          <div className="text-2xl font-display font-semibold text-sage-800">{healthPercent}%</div>
          <div className="text-xs text-sage-700 font-medium">studio plan health</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <DesignStat value={`${readyPlans}/${plannedRows.length || 0}`} label="plans fully prepared" />
        <DesignStat value={String(tasks.filter((task) => Boolean(task.due_at)).length)} label="live check-ins planned" />
        <DesignStat value={String(tasks.filter((task) => task.video_url || task.audio_url || task.tab_url).length)} label="tasks with materials" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-sand-50 border border-sand-100 p-4">
          <div className="flex items-center justify-between gap-3 mb-3"><div><h3 className="font-semibold text-ink-800">Mission health</h3><p className="text-xs text-ink-500 mt-0.5">A clear plan is more useful than a child activity score.</p></div><span className="text-xs font-semibold text-sage-700">Teacher-authored</span></div>
          {planRows.length === 0 ? <p className="text-sm text-ink-400">Add a learner and set a mission to begin designing their path.</p> : <ul className="space-y-2">{planRows.map((row) => <MissionHealthRow key={row.student.id} row={row} />)}</ul>}
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <div className="mb-3"><h3 className="font-semibold text-ink-800">Five Guitar Muscles</h3><p className="text-xs text-ink-500 mt-0.5">A curriculum map of your assignments—not a score for any learner.</p></div>
          <div className="space-y-2.5">{muscleCounts.map((muscle) => <MuscleCoverageRow key={muscle.id} label={muscle.label} description={muscle.description} count={muscle.count} accent={muscle.accent} max={Math.max(...muscleCounts.map((item) => item.count), 1)} />)}</div>
        </div>
      </div>
    </section>
  );
}

function DesignStat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl border border-ink-100 bg-white p-3"><div className="font-display text-xl font-semibold text-ink-800">{value}</div><div className="mt-0.5 text-xs text-ink-500">{label}</div></div>;
}

function MissionHealthRow({ row }: { row: PlanRow }) {
  if (!row.task || !row.health) return <li className="rounded-lg bg-white border border-ink-100 px-3 py-2.5"><div className="font-semibold text-sm text-ink-800">{row.student.name}</div><p className="mt-0.5 text-xs text-amber-700">No current mission — set a task to begin their learning path.</p></li>;
  const nextMissing = row.health.missing.slice(0, 2).map((item) => item.label).join(' and ');
  return <li className="rounded-lg bg-white border border-ink-100 px-3 py-2.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-semibold text-sm text-ink-800 truncate">{row.student.name}</div><div className="text-xs text-ink-500 truncate">{row.task.title}</div></div><span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${row.health.ready ? 'bg-sage-100 text-sage-700' : 'bg-amber-100 text-amber-700'}`}>{row.health.score}/{row.health.total} ready</span></div><div className="mt-2 flex items-center gap-1.5 flex-wrap">{row.task.skill_tags.map((tag) => { const muscle = getMuscle(tag); return muscle ? <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded border ${muscle.accent}`}>{muscle.label}</span> : null; })}</div>{!row.health.ready && <p className="mt-2 text-xs text-ink-500">Next improvement: add {nextMissing}.</p>}</li>;
}

function MuscleCoverageRow({ label, description, count, accent, max }: { label: string; description: string; count: number; accent: string; max: number }) {
  const width = `${Math.round((count / max) * 100)}%`;
  return <div><div className="flex items-center justify-between gap-3 text-xs mb-1"><span className="font-semibold text-ink-700">{label}</span><span className="text-ink-400">{count} tagged task{count === 1 ? '' : 's'}</span></div><div className="h-2.5 rounded-full bg-ink-100 overflow-hidden"><div className={`h-full rounded-full ${accent.split(' ')[0]}`} style={{ width }} /></div><p className="mt-1 text-[11px] text-ink-400">{description}</p></div>;
}

function AddStudentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from('students').insert({
      teacher_id: profile.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      group_name: group.trim() || null,
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.code === '23505' ? 'You already have a student with that email.' : insertError.message);
      return;
    }
    onSaved();
  };

  return (
    <Modal title="Add a student" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="sname">Student or family name</label><input id="sname" className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Jamie Lee" required /></div>
        <div><label className="label" htmlFor="semail">Email</label><input id="semail" type="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="they@example.com" required /><p className="text-xs text-ink-400 mt-1">They will use this to sign up. The account links automatically.</p></div>
        <div><label className="label" htmlFor="sgroup">Group (optional)</label><input id="sgroup" className="input" value={group} onChange={(event) => setGroup(event.target.value)} placeholder="e.g. Tuesday Beginners" /></div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex gap-3 pt-1"><button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button><button type="submit" className="btn-primary flex-1" disabled={busy}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add student'}</button></div>
      </form>
    </Modal>
  );
}

function StudentDetailModal({ student, onClose, onTaskCreated }: { student: Student; onClose: () => void; onTaskCreated: () => void }) {
  const [tab, setTab] = useState<'overview' | 'newtask'>('overview');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const openNewTask = () => { setEditingTask(null); setTab('newtask'); };
  const openEditTask = (task: Task) => { setEditingTask(task); setTab('newtask'); };

  return (
    <Modal title={student.name} onClose={onClose} wide>
      <div className="flex gap-1 border-b border-ink-100 mb-4 -mt-1">
        <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabBtn>
        <TabBtn active={tab === 'newtask'} onClick={openNewTask}>{editingTask && tab === 'newtask' ? 'Edit task' : "Set this week's task"}</TabBtn>
      </div>
      {tab === 'overview' ? <StudentOverview student={student} onSetTask={openNewTask} onEditTask={openEditTask} /> : <SetTaskForm student={student} existingTask={editingTask} onDone={onTaskCreated} />}
    </Modal>
  );
}

function StudentOverview({ student, onSetTask, onEditTask }: { student: Student; onSetTask: () => void; onEditTask: (task: Task) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data } = await supabase.from('tasks').select('*').eq('student_id', student.id).order('created_at', { ascending: false });
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [student.id]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-ink-500"><Mail className="w-4 h-4" /> {student.email}{student.group_name && <span className="px-2 py-0.5 rounded-full bg-sand-100 text-sand-700 text-xs font-medium">{student.group_name}</span>}</div>
      <div className="rounded-xl border border-sage-100 bg-sage-50 p-3 text-xs text-sage-800">Practice recordings are private self-review tools. This studio intentionally shows assignments and materials only.</div>
      <button className="btn-primary w-full" onClick={onSetTask}><Plus className="w-5 h-5" /> Set this week's task</button>
      <div>
        <div className="text-sm font-semibold text-ink-700 mb-2">Recent tasks</div>
        {loading ? <div className="text-ink-400 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div> : tasks.length === 0 ? <p className="text-sm text-ink-400">No tasks assigned yet.</p> : (
          <ul className="space-y-2">{tasks.slice(0, 5).map((task) => (
            <li key={task.id} className="card p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sage-100 text-sage-700 flex items-center justify-center shrink-0"><Music4 className="w-4 h-4" /></div>
              <div className="min-w-0 flex-1"><div className="font-medium text-ink-800 text-sm truncate">{task.title}</div><div className="text-xs text-ink-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(task.created_at).toLocaleDateString()}</div>{task.skill_tags.length > 0 && <div className="mt-1 flex gap-1 flex-wrap">{task.skill_tags.map((tag) => { const muscle = getMuscle(tag); return muscle ? <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded border ${muscle.accent}`}>{muscle.label}</span> : null; })}</div>}</div>
              <button type="button" className="btn-ghost p-2 shrink-0" aria-label="Edit task" onClick={() => onEditTask(task)}><Pencil className="w-4 h-4" /></button>
            </li>
          ))}</ul>
        )}
      </div>
    </div>
  );
}

function SetTaskForm({ student, existingTask, onDone }: { student: Student; existingTask: Task | null; onDone: () => void }) {
  const { profile } = useAuth();
  const isEditing = Boolean(existingTask);
  const [title, setTitle] = useState(existingTask?.title || '');
  const [notes, setNotes] = useState(existingTask?.notes || '');
  const [mission, setMission] = useState(existingTask?.mission || '');
  const [successCriteria, setSuccessCriteria] = useState(existingTask?.success_criteria || '');
  const [dueAt, setDueAt] = useState(existingTask?.due_at ? new Date(existingTask.due_at).toISOString().slice(0, 16) : '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(existingTask?.estimated_minutes?.toString() || '');
  const [skillTags, setSkillTags] = useState<GuitarMuscle[]>(existingTask?.skill_tags || []);
  const [video, setVideo] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [tab, setTab] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !title.trim()) { setError('Give the task a title.'); return; }
    setBusy(true);
    setError(null);
    const values = {
      title: title.trim(), notes: notes.trim() || null, mission: mission.trim() || null,
      success_criteria: successCriteria.trim() || null, due_at: dueAt ? new Date(dueAt).toISOString() : null,
      estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null, skill_tags: skillTags,
    };
    let task: Task | null = null;
    if (existingTask) {
      const { data, error: updateError } = await supabase.from('tasks').update(values).eq('id', existingTask.id).select().single();
      if (updateError || !data) { setError(updateError?.message || 'Could not update task.'); setBusy(false); return; }
      task = data as Task;
    } else {
      const { data, error: insertError } = await supabase.from('tasks').insert({ ...values, teacher_id: profile.id, student_id: student.id, group_name: null }).select().single();
      if (insertError || !data) { setError(insertError?.message || 'Could not create task.'); setBusy(false); return; }
      task = data as Task;
    }

    let videoUrl = existingTask?.video_url || null;
    let audioUrl = existingTask?.audio_url || null;
    let tabUrl = existingTask?.tab_url || null;
    try {
      if (video) videoUrl = (await uploadTaskMedia(profile.id, task.id, video, 'video'))?.path || videoUrl;
      if (audio) audioUrl = (await uploadTaskMedia(profile.id, task.id, audio, 'audio'))?.path || audioUrl;
      if (tab) tabUrl = (await uploadTaskMedia(profile.id, task.id, tab, 'tab'))?.path || tabUrl;
    } catch (uploadError) { console.error(uploadError); }
    if (!existingTask ? (videoUrl || audioUrl || tabUrl) : (video || audio || tab)) {
      const { error: mediaError } = await supabase.from('tasks').update({ video_url: videoUrl, audio_url: audioUrl, tab_url: tabUrl }).eq('id', task.id);
      if (mediaError) console.error(mediaError);
    }
    setBusy(false);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label" htmlFor="ttitle">Task title</label><input id="ttitle" className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Open string warm-up" required /></div>
      <div><label className="label" htmlFor="tnotes">Notes</label><textarea id="tnotes" className="input min-h-[90px] resize-y" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What to focus on this week…" /></div>
      <div><label className="label" htmlFor="tmission">Today’s mission</label><input id="tmission" className="input" value={mission} onChange={(event) => setMission(event.target.value)} placeholder="e.g. Keep the riff steady at a slow tempo" /></div>
      <div><label className="label" htmlFor="tcriteria">You’re done when…</label><input id="tcriteria" className="input" value={successCriteria} onChange={(event) => setSuccessCriteria(event.target.value)} placeholder="e.g. You can play it through twice without stopping" /></div>
      <div><span className="label">Guitar muscles <span className="font-normal text-ink-400">(choose up to two)</span></span><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{GUITAR_MUSCLES.map((muscle) => { const selected = skillTags.includes(muscle.id); return <button key={muscle.id} type="button" aria-pressed={selected} onClick={() => setSkillTags((current) => toggleMuscle(current, muscle.id))} className={`rounded-lg border px-3 py-2 text-left text-xs transition ${selected ? muscle.accent : 'border-ink-200 bg-white text-ink-600 hover:border-sage-300'}`}><span className="block font-semibold">{muscle.label}</span><span className="block mt-0.5 text-[10px] opacity-75">{muscle.description}</span></button>; })}</div></div>
      <div className="grid sm:grid-cols-2 gap-3"><div><label className="label" htmlFor="tdue">Next check-in (optional)</label><input id="tdue" type="datetime-local" className="input" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></div><div><label className="label" htmlFor="tminutes">Focused minutes (optional)</label><input id="tminutes" type="number" min="1" max="240" className="input" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} placeholder="e.g. 10" /></div></div>
      <div className="grid sm:grid-cols-2 gap-3"><FileInput label="Video of you playing (optional)" accept="video/*" icon={<Video className="w-4 h-4" />} file={video} onChange={setVideo} existingName={existingTask?.video_url?.split('/').pop()} /><FileInput label="Audio (optional)" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" icon={<FileMusic className="w-4 h-4" />} file={audio} onChange={setAudio} existingName={existingTask?.audio_url?.split('/').pop()} /><FileInput label="Tab / notation (PDF or image)" accept="application/pdf,image/*" icon={<FileMusic className="w-4 h-4" />} file={tab} onChange={setTab} existingName={existingTask?.tab_url?.split('/').pop()} /></div>
      {error && <ErrorBox>{error}</ErrorBox>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> {isEditing ? 'Save changes' : 'Assign task'}</>}</button>
    </form>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}><div className={`card w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-xl2`} onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between p-5 pb-3 sticky top-0 bg-white"><h3 className="font-display text-xl font-semibold text-ink-800">{title}</h3><button onClick={onClose} className="btn-ghost p-1.5 -mr-1" aria-label="Close"><X className="w-5 h-5" /></button></div><div className="px-5 pb-5">{children}</div></div></div>;
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${active ? 'border-sage-600 text-sage-700' : 'border-transparent text-ink-500 hover:text-ink-700'}`}>{children}</button>;
}

function FileInput({ label, accept, icon, file, onChange, existingName }: { label: string; accept: string; icon: React.ReactNode; file: File | null; onChange: (file: File | null) => void; existingName?: string | null }) {
  const displayName = file ? file.name : existingName ? `${existingName} (current — tap to replace)` : null;
  return <label className="block"><span className="label">{label}</span><div className={`rounded-xl border-2 border-dashed px-3 py-3 text-sm flex items-center gap-2 cursor-pointer transition ${file ? 'border-sage-400 bg-sage-50 text-sage-800' : existingName ? 'border-sage-300 bg-sage-50/50 text-ink-600' : 'border-ink-200 text-ink-500 hover:border-sage-300'}`}>{icon}<span className="truncate flex-1">{displayName || 'Tap to choose a file'}</span>{file && <button type="button" className="text-ink-400 hover:text-rose-600" onClick={(event) => { event.preventDefault(); onChange(null); }}><X className="w-4 h-4" /></button>}<input type="file" accept={accept} className="hidden" onChange={(event) => onChange(event.target.files?.[0] || null)} /></div></label>;
}

function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return <div className="card p-10 text-center"><div className="w-14 h-14 rounded-2xl bg-sand-100 text-sand-700 flex items-center justify-center mx-auto mb-4">{icon}</div><h3 className="font-display text-xl font-semibold text-ink-800 mb-1">{title}</h3><p className="text-ink-500 max-w-md mx-auto text-sm">{body}</p>{action}</div>;
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{children}</span></div>;
}

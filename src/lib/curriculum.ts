import { GuitarMuscle, Task } from './types';

export const GUITAR_MUSCLES: Array<{ id: GuitarMuscle; label: string; description: string; accent: string }> = [
  { id: 'pulse', label: 'Pulse', description: 'Timing, groove, and steadiness', accent: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'chords', label: 'Chords', description: 'Shapes, changes, and clarity', accent: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'fretboard', label: 'Fretboard', description: 'Notes, shapes, and navigation', accent: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'tone', label: 'Tone', description: 'Sound, touch, and control', accent: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'musicality', label: 'Musicality', description: 'Phrasing, expression, and feel', accent: 'bg-sage-100 text-sage-800 border-sage-200' },
];

export type TaskHealthKey = 'mission' | 'finishLine' | 'checkIn' | 'focusTime' | 'materials' | 'muscle';

export interface TaskHealth {
  score: number;
  total: number;
  ready: boolean;
  missing: Array<{ key: TaskHealthKey; label: string }>;
}

export function getTaskHealth(task: Task): TaskHealth {
  const checks: Array<{ key: TaskHealthKey; label: string; complete: boolean }> = [
    { key: 'mission', label: 'mission', complete: Boolean(task.mission?.trim()) },
    { key: 'finishLine', label: 'finish line', complete: Boolean(task.success_criteria?.trim()) },
    { key: 'checkIn', label: 'check-in', complete: Boolean(task.due_at) },
    { key: 'focusTime', label: 'focus time', complete: Boolean(task.estimated_minutes) },
    { key: 'materials', label: 'materials', complete: Boolean(task.video_url || task.audio_url || task.tab_url) },
    { key: 'muscle', label: 'guitar muscle', complete: task.skill_tags.length > 0 },
  ];
  const missing = checks.filter((check) => !check.complete).map(({ key, label }) => ({ key, label }));
  const score = checks.length - missing.length;
  return { score, total: checks.length, ready: missing.length === 0, missing };
}

export function getMuscle(id: GuitarMuscle) {
  return GUITAR_MUSCLES.find((muscle) => muscle.id === id);
}

export function toggleMuscle(selected: GuitarMuscle[], muscle: GuitarMuscle) {
  if (selected.includes(muscle)) return selected.filter((item) => item !== muscle);
  return selected.length >= 2 ? selected : [...selected, muscle];
}

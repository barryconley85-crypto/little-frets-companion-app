export type Role = 'teacher' | 'student';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  created_at: string;
}

export interface Student {
  id: string;
  user_id: string | null;
  teacher_id: string;
  name: string;
  email: string;
  group_name: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  teacher_id: string;
  student_id: string | null;
  group_name: string | null;
  title: string;
  notes: string | null;
  video_url: string | null;
  audio_url: string | null;
  tab_url: string | null;
  mission: string | null;
  success_criteria: string | null;
  due_at: string | null;
  estimated_minutes: number | null;
  created_at: string;
}

export interface Recording {
  id: string;
  task_id: string;
  student_id: string;
  audio_url: string;
  feedback_summary: string | null;
  reflection: string | null;
  confidence: number | null;
  review_status: 'needs_review' | 'retry' | 'ready' | 'discuss_live';
  teacher_feedback: string | null;
  teacher_next_action: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface SongRequest {
  id: string;
  student_id: string;
  song_name: string;
  note: string | null;
  status: 'pending' | 'reviewed';
  created_at: string;
}

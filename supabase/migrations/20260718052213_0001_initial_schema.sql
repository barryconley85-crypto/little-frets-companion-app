/*
# Little Frets Companion — initial schema

1. Overview
   Creates the full data model for a guitar-teaching companion app with two
   roles (teacher, student/parent). Supabase Auth handles authentication; this
   migration adds a `profiles` table mirroring auth users with a role column,
   plus the business tables (students, tasks, recordings, requests) and two
   storage buckets for media files.

2. New Tables
   - profiles: one row per auth user. id (PK = auth.users.id), name, role
     ('teacher' | 'student', default 'student'), created_at.
   - students: links a student/parent account to a teacher. id, user_id
     (nullable until student signs up), teacher_id, name, email, group_name
     (nullable), created_at. Unique on (teacher_id, email).
   - tasks: weekly task assigned by a teacher. id, teacher_id, student_id
     (nullable), group_name (nullable), title, notes, video_url, audio_url,
     tab_url, created_at.
   - recordings: student practice recording for a task. id, task_id, student_id,
     audio_url, feedback_summary, created_at.
   - requests: song/piece request from a student. id, student_id, song_name,
     note, status ('pending' | 'reviewed'), created_at.

3. Automation
   - handle_new_user() trigger inserts a profiles row on auth user creation.

4. Security (RLS)
   - profiles: read/update own row; teachers read their students' profiles.
   - students: teacher CRUD own rows; student SELECT own row.
   - tasks: teacher CRUD own rows; student SELECT tasks for them or their group.
   - recordings: teacher SELECT for their students; student SELECT/INSERT own.
   - requests: teacher SELECT/UPDATE for their students; student SELECT/INSERT own.
   - Storage buckets task-media and practice-recordings with matching policies.

5. Notes
   - All tables created before policies (policies validate referenced tables).
   - All policies split per CRUD verb (no FOR ALL on data tables).
*/

-- ---------- tables (created first so policies can reference them) ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('teacher','student')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  group_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (teacher_id, email)
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  group_name text,
  title text NOT NULL,
  notes text,
  video_url text,
  audio_url text,
  tab_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  audio_url text NOT NULL,
  feedback_summary text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  song_name text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed')),
  created_at timestamptz DEFAULT now()
);

-- ---------- enable RLS ----------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- ---------- profiles policies ----------
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "teacher_read_student_profiles" ON profiles;
CREATE POLICY "teacher_read_student_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM students s WHERE s.teacher_id = auth.uid() AND s.user_id = profiles.id)
  );

-- ---------- students policies ----------
DROP POLICY IF EXISTS "teacher_select_students" ON students;
CREATE POLICY "teacher_select_students" ON students FOR SELECT
  TO authenticated USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher_insert_students" ON students;
CREATE POLICY "teacher_insert_students" ON students FOR INSERT
  TO authenticated WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher_update_students" ON students;
CREATE POLICY "teacher_update_students" ON students FOR UPDATE
  TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher_delete_students" ON students;
CREATE POLICY "teacher_delete_students" ON students FOR DELETE
  TO authenticated USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "student_select_own_student" ON students;
CREATE POLICY "student_select_own_student" ON students FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- ---------- tasks policies ----------
DROP POLICY IF EXISTS "teacher_select_tasks" ON tasks;
CREATE POLICY "teacher_select_tasks" ON tasks FOR SELECT
  TO authenticated USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher_insert_tasks" ON tasks;
CREATE POLICY "teacher_insert_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher_update_tasks" ON tasks;
CREATE POLICY "teacher_update_tasks" ON tasks FOR UPDATE
  TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher_delete_tasks" ON tasks;
CREATE POLICY "teacher_delete_tasks" ON tasks FOR DELETE
  TO authenticated USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "student_select_tasks" ON tasks;
CREATE POLICY "student_select_tasks" ON tasks FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid()
        AND (
          (tasks.student_id = s.id)
          OR (tasks.group_name = s.group_name AND tasks.group_name IS NOT NULL AND tasks.teacher_id = s.teacher_id)
        )
    )
  );

-- ---------- recordings policies ----------
DROP POLICY IF EXISTS "teacher_select_recordings" ON recordings;
CREATE POLICY "teacher_select_recordings" ON recordings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = recordings.student_id AND s.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_select_recordings" ON recordings;
CREATE POLICY "student_select_recordings" ON recordings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = recordings.student_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_insert_recordings" ON recordings;
CREATE POLICY "student_insert_recordings" ON recordings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM students s WHERE s.id = recordings.student_id AND s.user_id = auth.uid())
  );

-- ---------- requests policies ----------
DROP POLICY IF EXISTS "teacher_select_requests" ON requests;
CREATE POLICY "teacher_select_requests" ON requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = requests.student_id AND s.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "teacher_update_requests" ON requests;
CREATE POLICY "teacher_update_requests" ON requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = requests.student_id AND s.teacher_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM students s WHERE s.id = requests.student_id AND s.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_select_requests" ON requests;
CREATE POLICY "student_select_requests" ON requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = requests.student_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_insert_requests" ON requests;
CREATE POLICY "student_insert_requests" ON requests FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM students s WHERE s.id = requests.student_id AND s.user_id = auth.uid())
  );

-- ---------- new-user trigger ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- storage buckets ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-media', 'task-media', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('practice-recordings', 'practice-recordings', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "task_media_teacher_all" ON storage.objects;
CREATE POLICY "task_media_teacher_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'task-media' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'))
  WITH CHECK (bucket_id = 'task-media' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'));

DROP POLICY IF EXISTS "task_media_student_read" ON storage.objects;
CREATE POLICY "task_media_student_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'task-media' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student'));

DROP POLICY IF EXISTS "practice_student_all" ON storage.objects;
CREATE POLICY "practice_student_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'practice-recordings'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
  )
  WITH CHECK (
    bucket_id = 'practice-recordings'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
  );

DROP POLICY IF EXISTS "practice_teacher_read" ON storage.objects;
CREATE POLICY "practice_teacher_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'practice-recordings' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'));

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS students_teacher_id_idx ON students(teacher_id);
CREATE INDEX IF NOT EXISTS students_user_id_idx ON students(user_id);
CREATE INDEX IF NOT EXISTS tasks_teacher_id_idx ON tasks(teacher_id);
CREATE INDEX IF NOT EXISTS tasks_student_id_idx ON tasks(student_id);
CREATE INDEX IF NOT EXISTS recordings_task_id_idx ON recordings(task_id);
CREATE INDEX IF NOT EXISTS recordings_student_id_idx ON recordings(student_id);
CREATE INDEX IF NOT EXISTS requests_student_id_idx ON requests(student_id);

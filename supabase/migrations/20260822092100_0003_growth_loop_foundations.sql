/*
# Little Frets — growth loop foundations

Adds structured practice-mission fields, teacher-review fields, relationship-scoped
media policies, and a sign-up profile trigger that stores name/role supplied in
Supabase Auth metadata. This migration remains compatible with the existing
client while the updated client is deployed.
*/

-- ---------- profile onboarding ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_role text CHECK (requested_role IN ('teacher', 'student'));

UPDATE public.profiles
SET requested_role = role
WHERE requested_role IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN requested_role SET DEFAULT 'student',
  ALTER COLUMN requested_role SET NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role text;
BEGIN
  selected_role := COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'student');
  IF selected_role NOT IN ('teacher', 'student') THEN
    selected_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, name, email, role, requested_role)
  VALUES (
    NEW.id,
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'name', '')), ''),
    NEW.email,
    selected_role,
    selected_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------- focused practice mission ----------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS mission text,
  ADD COLUMN IF NOT EXISTS success_criteria text,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 1 AND 240);

CREATE INDEX IF NOT EXISTS tasks_due_at_idx ON public.tasks(due_at) WHERE due_at IS NOT NULL;

-- ---------- review loop ----------
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS reflection text,
  ADD COLUMN IF NOT EXISTS confidence smallint CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'needs_review' CHECK (review_status IN ('needs_review', 'retry', 'ready', 'discuss_live')),
  ADD COLUMN IF NOT EXISTS teacher_feedback text,
  ADD COLUMN IF NOT EXISTS teacher_next_action text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS recordings_review_status_idx ON public.recordings(review_status, created_at DESC);

DROP POLICY IF EXISTS "teacher_update_recordings" ON public.recordings;
CREATE POLICY "teacher_update_recordings" ON public.recordings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = recordings.student_id AND s.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = recordings.student_id AND s.teacher_id = auth.uid()
    )
  );

-- ---------- relationship-scoped storage access ----------
DROP POLICY IF EXISTS "task_media_teacher_all" ON storage.objects;
DROP POLICY IF EXISTS "task_media_student_read" ON storage.objects;
DROP POLICY IF EXISTS "practice_student_all" ON storage.objects;
DROP POLICY IF EXISTS "practice_teacher_read" ON storage.objects;

CREATE POLICY "task_media_teacher_select_own" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'task-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  );

CREATE POLICY "task_media_teacher_insert_own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  );

CREATE POLICY "task_media_teacher_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'task-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  )
  WITH CHECK (
    bucket_id = 'task-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  );

CREATE POLICY "task_media_teacher_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  );

CREATE POLICY "task_media_student_select_assigned" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'task-media'
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.students s ON s.user_id = auth.uid()
      WHERE t.id::text = (storage.foldername(name))[2]
        AND (
          t.student_id = s.id
          OR (t.group_name = s.group_name AND t.group_name IS NOT NULL AND t.teacher_id = s.teacher_id)
        )
    )
  );

CREATE POLICY "practice_student_select_own" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'practice-recordings'
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id::text = (storage.foldername(name))[1] AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "practice_student_insert_own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'practice-recordings'
    AND EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.tasks t ON t.id::text = (storage.foldername(name))[2]
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.user_id = auth.uid()
        AND (
          t.student_id = s.id
          OR (t.group_name = s.group_name AND t.group_name IS NOT NULL AND t.teacher_id = s.teacher_id)
        )
    )
  );

CREATE POLICY "practice_student_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'practice-recordings'
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id::text = (storage.foldername(name))[1] AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "practice_teacher_select_linked" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'practice-recordings'
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id::text = (storage.foldername(name))[1] AND s.teacher_id = auth.uid()
    )
  );

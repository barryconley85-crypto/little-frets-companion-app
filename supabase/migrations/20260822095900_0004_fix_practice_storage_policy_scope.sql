/*
# Fix relationship-scoped practice-recording storage policies

The first growth-loop migration used `storage.foldername(name)` inside subqueries
against `students`. PostgreSQL resolved `name` to `students.name` rather than the
outer `storage.objects.name`, preventing legitimate teacher playback. Helper
functions make the storage-object path explicit and avoid identifier shadowing.
*/

CREATE OR REPLACE FUNCTION public.can_select_own_practice_recording(object_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id::text = (storage.foldername(object_path))[1]
      AND s.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_select_linked_practice_recording(object_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id::text = (storage.foldername(object_path))[1]
      AND s.teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_insert_own_practice_recording(object_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.tasks t ON t.id::text = (storage.foldername(object_path))[2]
    WHERE s.id::text = (storage.foldername(object_path))[1]
      AND s.user_id = auth.uid()
      AND (
        t.student_id = s.id
        OR (t.group_name = s.group_name AND t.group_name IS NOT NULL AND t.teacher_id = s.teacher_id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_select_own_practice_recording(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_select_linked_practice_recording(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_insert_own_practice_recording(text) TO authenticated;

DROP POLICY IF EXISTS "practice_student_select" ON storage.objects;
DROP POLICY IF EXISTS "practice_student_select_own" ON storage.objects;
DROP POLICY IF EXISTS "practice_teacher_select_linked" ON storage.objects;
DROP POLICY IF EXISTS "practice_student_insert" ON storage.objects;
DROP POLICY IF EXISTS "practice_student_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "practice_student_delete_own" ON storage.objects;

CREATE POLICY "practice_student_select_own" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'practice-recordings'
  AND public.can_select_own_practice_recording(name)
);

CREATE POLICY "practice_teacher_select_linked" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'practice-recordings'
  AND public.can_select_linked_practice_recording(name)
);

CREATE POLICY "practice_student_insert_own" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'practice-recordings'
  AND public.can_insert_own_practice_recording(name)
);

CREATE POLICY "practice_student_delete_own" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'practice-recordings'
  AND public.can_select_own_practice_recording(name)
);

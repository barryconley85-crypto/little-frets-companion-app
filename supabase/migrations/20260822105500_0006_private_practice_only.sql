/*
# Private learner practice only

Little Frets intentionally does not operate as a teacher–learner messaging or
content-review channel. Learner practice takes are private self-playback
records. Teachers cannot read, play, review, update, or receive learner-created
recordings, reflections, requests, or messages.
*/

-- ---------- remove the former teacher-review data model ----------
DROP POLICY IF EXISTS "teacher_select_recordings" ON public.recordings;
DROP POLICY IF EXISTS "teacher_update_recordings" ON public.recordings;

ALTER TABLE public.recordings
  DROP COLUMN IF EXISTS reflection,
  DROP COLUMN IF EXISTS confidence,
  DROP COLUMN IF EXISTS review_status,
  DROP COLUMN IF EXISTS teacher_feedback,
  DROP COLUMN IF EXISTS teacher_next_action,
  DROP COLUMN IF EXISTS reviewed_at;

DROP INDEX IF EXISTS public.recordings_review_status_idx;

-- ---------- remove teacher access to learner audio ----------
DROP POLICY IF EXISTS "practice_teacher_select_linked" ON storage.objects;
DROP POLICY IF EXISTS "Only the student can read their own recording files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload practice recordings" ON storage.objects;
DROP FUNCTION IF EXISTS public.can_select_linked_practice_recording(text);

-- The remaining Storage policies are deliberately learner-only:
-- practice_student_select_own, practice_student_insert_own, practice_student_delete_own.

-- ---------- disable student-to-teacher song requests ----------
DROP POLICY IF EXISTS "teacher_select_requests" ON public.requests;
DROP POLICY IF EXISTS "teacher_update_requests" ON public.requests;
DROP POLICY IF EXISTS "student_select_requests" ON public.requests;
DROP POLICY IF EXISTS "student_insert_requests" ON public.requests;
DROP POLICY IF EXISTS "Related users can view requests" ON public.requests;
DROP POLICY IF EXISTS "Students can submit requests" ON public.requests;
DROP POLICY IF EXISTS "Teacher can update related requests" ON public.requests;

REVOKE ALL ON TABLE public.requests FROM anon, authenticated;

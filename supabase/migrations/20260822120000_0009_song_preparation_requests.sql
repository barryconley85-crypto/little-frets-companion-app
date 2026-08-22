/*
# Safeguarded song-preparation requests

This is not a messaging feature. Learners can request only a song title and
original artist for a future lesson. There is no message body, media, reply,
or learner-edit path after submission.
*/

CREATE TABLE public.song_preparation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_title text NOT NULL CHECK (char_length(btrim(song_title)) BETWEEN 1 AND 80),
  artist text NOT NULL CHECK (char_length(btrim(artist)) BETWEEN 1 AND 80),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT song_preparation_request_no_line_breaks CHECK (song_title !~ E'[\n\r]' AND artist !~ E'[\n\r]'),
  CONSTRAINT song_preparation_request_no_links_or_contact CHECK (
    song_title !~* '(https?://|www\\.|@|[0-9]{7,})'
    AND artist !~* '(https?://|www\\.|@|[0-9]{7,})'
  )
);

ALTER TABLE public.song_preparation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can submit a song request for their own linked teacher"
  ON public.song_preparation_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = song_preparation_requests.student_id
        AND students.user_id = auth.uid()
        AND students.teacher_id = song_preparation_requests.teacher_id
    )
  );

CREATE POLICY "Students can see their own song requests"
  ON public.song_preparation_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = song_preparation_requests.student_id
        AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can see their linked learners' song requests"
  ON public.song_preparation_requests
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can update request preparation status"
  ON public.song_preparation_requests
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE OR REPLACE FUNCTION public.lock_song_request_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.student_id IS DISTINCT FROM OLD.student_id
    OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
    OR NEW.song_title IS DISTINCT FROM OLD.song_title
    OR NEW.artist IS DISTINCT FROM OLD.artist
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Song request details cannot be changed after submission';
  END IF;

  IF auth.uid() IS DISTINCT FROM OLD.teacher_id THEN
    RAISE EXCEPTION 'Only the linked teacher can update request status';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER lock_song_request_content_before_update
  BEFORE UPDATE ON public.song_preparation_requests
  FOR EACH ROW EXECUTE FUNCTION public.lock_song_request_content();

CREATE INDEX song_preparation_requests_teacher_status_created_idx
  ON public.song_preparation_requests (teacher_id, status, created_at DESC);

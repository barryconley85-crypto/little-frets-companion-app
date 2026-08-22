/*
# Restore teacher song-request review permission

The live requests table retained related-user SELECT and student INSERT policies,
but its teacher UPDATE policy was absent. This migration restores the ability for
the linked teacher—and only the linked teacher—to mark a learner's song request
as reviewed.
*/

DROP POLICY IF EXISTS "teacher_update_requests" ON public.requests;
DROP POLICY IF EXISTS "Teachers can update related requests" ON public.requests;
DROP POLICY IF EXISTS "Teacher can update related requests" ON public.requests;

CREATE POLICY "Teacher can update related requests" ON public.requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students AS student
    WHERE student.id = requests.student_id
      AND student.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students AS student
    WHERE student.id = requests.student_id
      AND student.teacher_id = auth.uid()
  )
);

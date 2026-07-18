/*
# Auto-link students on signup

1. Overview
   When a student/parent signs up, their auth row already creates a profiles row
   (via handle_new_user). This migration adds a trigger that links any existing
   `students` rows (pre-created by the teacher with that email) to the new auth
   user by setting students.user_id. This lets a teacher invite a student by
   email before the student has signed up; once the student registers, the link
   forms automatically and the student immediately sees their assigned tasks.

2. Changes
   - New function `link_student_on_signup()` that updates students.user_id for
     rows where email matches the new auth user's email and user_id is null.
   - New trigger `on_auth_user_created_link` AFTER INSERT on auth.users, running
     after handle_new_user (named alphabetically later so it runs second).

3. Security
   - Function is SECURITY DEFINER so it can update students rows regardless of
     the caller's RLS context (the trigger runs as the system during signup).
   - Only fills user_id where it is currently null, so it never overwrites an
     existing link.

4. Notes
   - Email comparison is case-insensitive via lower().
*/

CREATE OR REPLACE FUNCTION public.link_student_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.students
  SET user_id = NEW.id
  WHERE lower(email) = lower(NEW.email)
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link ON auth.users;
CREATE TRIGGER on_auth_user_created_link
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_student_on_signup();

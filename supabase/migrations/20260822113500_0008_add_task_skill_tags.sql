/*
# Teacher-authored curriculum tags

Five Guitar Muscles tags describe the teacher's assignment design. They are not
learner scores, activity signals, or inferred attributes.
*/

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS skill_tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_skill_tags_valid;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_skill_tags_valid
  CHECK (
    cardinality(skill_tags) <= 2
    AND skill_tags <@ ARRAY['pulse', 'chords', 'fretboard', 'tone', 'musicality']::text[]
  );

import { supabase, TASK_MEDIA_BUCKET, PRACTICE_BUCKET } from './supabase';

/**
 * Upload a teacher's task media file to the task-media bucket under a
 * teacher-scoped folder. Returns the storage path.
 */
export async function uploadTaskMedia(
  teacherId: string,
  taskId: string,
  file: File,
  kind: 'video' | 'audio' | 'tab',
): Promise<{ path: string; publicUrl: string } | null> {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${teacherId}/${taskId}/${kind}.${ext}`;
  const { error } = await supabase.storage
    .from(TASK_MEDIA_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) {
    console.error('uploadTaskMedia error', error);
    return null;
  }
  const { data } = supabase.storage.from(TASK_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/**
 * Create a signed URL for a private-bucket object. Used for playback/download
 * of media that shouldn't be public.
 */
export async function signedUrl(
  bucket: 'task-media' | 'practice-recordings',
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    console.error('signedUrl error', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Upload a student's practice recording to the practice-recordings bucket.
 */
export async function uploadPracticeRecording(
  studentId: string,
  taskId: string,
  file: Blob,
): Promise<{ path: string } | null> {
  const path = `${studentId}/${taskId}/${Date.now()}.webm`;
  const { error } = await supabase.storage
    .from(PRACTICE_BUCKET)
    .upload(path, file, { contentType: file.type || 'audio/webm' });
  if (error) {
    console.error('uploadPracticeRecording error', error);
    return null;
  }
  return { path };
}

/**
 * Resolve a stored storage path (from a *_url column) to a playable signed URL.
 * Columns store either the bare storage path or a public URL; we normalise to
 * the bare path and ask for a signed URL.
 */
export async function resolveMediaUrl(
  bucket: 'task-media' | 'practice-recordings',
  stored: string,
): Promise<string | null> {
  if (!stored) return null;
  // If it's already a full URL, try to derive the path after the bucket segment.
  const marker = `/${bucket}/`;
  const idx = stored.indexOf(marker);
  const path = idx >= 0 ? stored.slice(idx + marker.length) : stored;
  return signedUrl(bucket, path);
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Auth Utilities ---
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// --- Storage Utilities ---
export async function uploadFile(file, userId, onProgress) {
  const fileExt = file.name.split('.').pop();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${Date.now()}_${cleanName}`;

  // 1. Upload binary to Storage Bucket with progress tracking
  const { error: storageError } = await supabase.storage
    .from('vault')
    .upload(filePath, file, { 
      cacheControl: '3600', 
      upsert: false,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress(percent);
        }
      }
    });

  if (storageError) throw storageError;

  // 2. Index metadata into PostgreSQL
  const { data, error: dbError } = await supabase
    .from('files')
    .insert([
      {
        user_id: userId,
        name: file.name,
        size: file.size,
        type: file.type || fileExt,
        storage_path: filePath,
      },
    ])
    .select()
    .single();

  if (dbError) throw dbError;
  return data;
}

export async function fetchUserFiles(userId) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function downloadFile(storagePath, originalName) {
  // Generate a temporary 60-second signed URL with attachment forced to direct download
  const { data, error } = await supabase.storage
    .from('vault')
    .createSignedUrl(storagePath, 60, {
      download: originalName
    });

  if (error) throw error;

  // Trigger browser download
  const link = document.createElement('a');
  link.href = data.signedUrl;
  link.download = originalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function getPreviewUrl(storagePath) {
  // Generate a temporary 1800-second (30 minutes) signed URL for browser-native viewing
  const { data, error } = await supabase.storage
    .from('vault')
    .createSignedUrl(storagePath, 1800);

  if (error) throw error;
  return data.signedUrl;
}

export async function toggleStarFile(fileId, currentStarredState) {
  const { data, error } = await supabase
    .from('files')
    .update({ starred: !currentStarredState })
    .eq('id', fileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFile(fileId, storagePath) {
  // 1. Remove binary from Storage
  const { error: storageError } = await supabase.storage
    .from('vault')
    .remove([storagePath]);

  if (storageError) throw storageError;

  // 2. Delete metadata row from files table
  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (dbError) throw dbError;
}

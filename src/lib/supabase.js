import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPER_ADMIN_EMAIL = 'vedantsutar926@gmail.com';

// --- Auth Utilities ---

/**
 * Sign in supporting both 'VEDANT' username alias and 'vedantsutar926@gmail.com'.
 * Auto-creates Super Admin account on first login if not yet registered in Supabase Auth.
 */
export async function signIn(identifier, password) {
  let email = identifier.trim();
  const isVedantAlias = email.toLowerCase() === 'vedant' || (!email.includes('@') && email.length > 0);
  
  if (isVedantAlias) {
    email = SUPER_ADMIN_EMAIL;
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  } catch (err) {
    // If logging in as Super Admin (VEDANT) and user does not exist in Supabase Auth yet, auto-provision
    if (email === SUPER_ADMIN_EMAIL && err.message?.includes('Invalid login credentials')) {
      try {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (!signUpErr && signUpData?.session) {
          return signUpData;
        }
      } catch (autoErr) {
        console.warn("Super Admin auto-provision notice:", autoErr);
      }
    }
    throw err;
  }
}

/**
 * Super Admin Authorization: Create a new Authorized User/Admin without ending active session
 */
export async function createAdminUser(newEmailOrUsername, newPassword) {
  let email = newEmailOrUsername.trim();
  if (!email.includes('@')) {
    email = `${email.toLowerCase()}@vcloud.local`;
  }
  
  // Non-persisting client so Super Admin (VEDANT) stays logged in
  const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  
  const { data, error } = await tempSupabase.auth.signUp({
    email: email,
    password: newPassword
  });
  
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

// --- Storage & Database Utilities ---

/**
 * Upload file binary to Supabase Storage bucket ('vault') and index metadata into Supabase PostgreSQL DB ('files')
 */
export async function uploadFile(file, userId, onProgress) {
  const fileExt = file.name.split('.').pop();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${Date.now()}_${cleanName}`;

  // 1. Upload binary to Supabase Storage Bucket with progress tracking
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

  // 2. Insert metadata row into Supabase PostgreSQL Database
  const { data: dbRecord, error: dbError } = await supabase
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

  return dbRecord;
}

/**
 * Fetch all files belonging to user from Supabase PostgreSQL database
 */
export async function fetchUserFiles(userId) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch storage footprint breakdown across all users
 */
export async function fetchStorageBreakdown(currentUser) {
  try {
    const { data, error } = await supabase.rpc('get_storage_breakdown');
    if (!error && data && data.length > 0) {
      return data.map(item => ({
        ...item,
        user_email: item.user_email === SUPER_ADMIN_EMAIL ? 'VEDANT (Super Admin)' : item.user_email
      }));
    }
  } catch (err) {
    console.warn("RPC get_storage_breakdown notice:", err?.message || err);
  }

  // Fallback aggregation logic
  try {
    const { data: allFiles, error } = await supabase
      .from('files')
      .select('user_id, size');

    if (!error && allFiles) {
      const breakdownMap = {};
      allFiles.forEach(f => {
        const uid = f.user_id;
        if (!breakdownMap[uid]) {
          const isSuper = uid === currentUser?.id && currentUser?.email === SUPER_ADMIN_EMAIL;
          breakdownMap[uid] = {
            user_id: uid,
            user_email: isSuper ? 'VEDANT (Super Admin)' : (uid === currentUser?.id ? `${currentUser?.email} (You)` : `User (${uid.substring(0, 6)}...)`),
            total_bytes: 0,
            file_count: 0
          };
        }
        breakdownMap[uid].total_bytes += (f.size || 0);
        breakdownMap[uid].file_count += 1;
      });

      return Object.values(breakdownMap).sort((a, b) => b.total_bytes - a.total_bytes);
    }
  } catch (fallbackErr) {
    console.warn("Storage breakdown fallback notice:", fallbackErr);
  }

  return [];
}

export async function downloadFile(storagePath, originalName) {
  const { data, error } = await supabase.storage
    .from('vault')
    .createSignedUrl(storagePath, 60, {
      download: originalName
    });

  if (error) throw error;

  const link = document.createElement('a');
  link.href = data.signedUrl;
  link.download = originalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function getPreviewUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('vault')
    .createSignedUrl(storagePath, 1800);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Toggle starred status in Supabase PostgreSQL DB
 */
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

/**
 * Delete binary storage file and metadata row from Supabase PostgreSQL DB
 */
export async function deleteFile(fileId, storagePath) {
  // 1. Remove binary from Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('vault')
    .remove([storagePath]);

  if (storageError) throw storageError;

  // 2. Delete metadata row from Supabase PostgreSQL table 'files'
  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (dbError) throw dbError;
}

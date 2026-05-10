import { supabase } from "./supabase.js";

const AVATAR_BUCKET = "avatars";

export function calcLevelFromXp(xp) {
  return Math.max(1, Math.floor((xp || 0) / 1000) + 1);
}

/**
 * Ensure profile exists (safe version)
 */
export async function ensureProfile(user) {
  if (!user?.id) throw new Error("Missing user id");

  const username =
    user?.user_metadata?.username || `player_${user.id.slice(0, 6)}`;

  // check existing profile
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle(); // יותר בטוח מ-single

  if (selectError && selectError.code !== "PGRST116") {
    throw selectError;
  }

  if (existing) return existing;

  const insertPayload = {
    id: user.id,
    username,
    xp: 0,
    level: 1,
    streak: 0,
    progress: 0,
    avatar_url: null
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(insertPayload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get profile safely
 */
export async function getMyProfile(userId) {
  if (!userId) throw new Error("Missing userId");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Update progress
 */
export async function updateMyProgress(userId, progressPatch) {
  if (!userId) throw new Error("Missing userId");

  const patch = {
    updated_at: new Date().toISOString(),
    ...progressPatch
  };

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Upload avatar
 */
export async function uploadAvatar(userId, file) {
  if (!userId || !file) throw new Error("Missing userId or file");

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      cacheControl: "3600"
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      avatar_url: publicData.publicUrl,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  if (profileError) throw profileError;

  return publicData.publicUrl;
}

/**
 * Remove avatar
 */
export async function removeAvatar(userId) {
  if (!userId) throw new Error("Missing userId");

  const profile = await getMyProfile(userId);

  if (profile?.avatar_url) {
    const fileName = profile.avatar_url.split("/").pop();
    const path = `${userId}/${fileName}`;

    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  if (error) throw error;
}

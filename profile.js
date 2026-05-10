import { supabase } from "./supabase.js";

const AVATAR_BUCKET = "avatars";

export function calcLevelFromXp(xp) {
  return Math.max(1, Math.floor((xp || 0) / 1000) + 1);
}

export async function ensureProfile(user) {
  const username = user?.user_metadata?.username || `player_${user.id.slice(0, 6)}`;

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!selectError && existing) return existing;

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

export async function getMyProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function updateMyProgress(userId, progressPatch) {
  const patch = {
    updated_at: new Date().toISOString(),
    ...progressPatch
  };
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (profileError) throw profileError;
  return publicData.publicUrl;
}

export async function removeAvatar(userId) {
  const profile = await getMyProfile(userId);
  if (profile.avatar_url) {
    const path = `${userId}/${profile.avatar_url.split("/").pop()}`;
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}
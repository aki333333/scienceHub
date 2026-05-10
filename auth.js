import { supabase } from "./supabase.js";

/**
 * REGISTER
 */
export async function register({ username, email, password }) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });

  if (error) throw error;
  return data;
}

/**
 * LOGIN
 */
export async function login({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const { data, error } =
    await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  return data;
}

/**
 * LOGOUT
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * GET CURRENT USER (stable version)
 */
export async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  return data?.user ?? null;
}

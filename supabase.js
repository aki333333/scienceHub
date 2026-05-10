import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://bxbnmpoxerokomzmgapo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_PHv5vgQHBILrZe1M0r8kiA_jT60kXId";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
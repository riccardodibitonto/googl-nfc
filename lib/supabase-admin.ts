import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase-url";

export function getSupabaseAdmin() {
  const key = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
  ].find((value) => value?.trim())?.trim();
  if (!key) throw new Error("Supabase non configurato: manca SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(getSupabaseUrl(), key, { auth: { autoRefreshToken: false, persistSession: false } });
}

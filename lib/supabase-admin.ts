import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!configuredUrl || !key) throw new Error("Supabase non configurato: imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  const url = configuredUrl.replace(/\/rest\/v1\/?$/, "");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl } from "@/lib/supabase-url";

export function getSupabaseBrowser() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error("Supabase Auth non configurato.");
  }

  return createBrowserClient(getSupabaseUrl(), anonKey);
}

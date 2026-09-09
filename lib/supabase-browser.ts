import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-url";

export function getSupabaseBrowser() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

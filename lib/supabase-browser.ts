import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey, getSupabasePublicUrl } from "@/lib/supabase-url";

export function getSupabaseBrowser() {
  return createBrowserClient(getSupabasePublicUrl(), getSupabasePublicKey());
}

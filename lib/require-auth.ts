import { getSupabaseServer } from "@/lib/supabase-server";

export async function hasAuthenticatedUser() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user);
}

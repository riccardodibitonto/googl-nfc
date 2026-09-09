export function getSupabaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configuredUrl) {
    throw new Error("Supabase Auth non configurato: imposta NEXT_PUBLIC_SUPABASE_URL.");
  }
  return configuredUrl.replace(/\/rest\/v1(?:\/)?$/, "");
}

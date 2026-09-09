export function getSupabaseUrl() {
  const configuredUrl = [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  ].find((value) => value?.trim())?.trim();
  if (!configuredUrl) {
    throw new Error("Supabase Auth non configurato: imposta NEXT_PUBLIC_SUPABASE_URL.");
  }

  return configuredUrl.replace(/\/rest\/v1(?:\/)?$/, "");
}

export function getSupabaseAnonKey() {
  const key = [
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
  ].find((value) => value?.trim())?.trim();
  if (!key) {
    throw new Error("Supabase Auth non configurato: manca la chiave pubblica.");
  }
  return key;
}

export function getSupabasePublicUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configuredUrl) {
    throw new Error("Supabase Auth non configurato: manca NEXT_PUBLIC_SUPABASE_URL.");
  }
  return configuredUrl.replace(/\/rest\/v1(?:\/)?$/, "");
}

export function getSupabasePublicKey() {
  const key = [
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  ].find((value) => value?.trim())?.trim();
  if (!key) {
    throw new Error("Supabase Auth non configurato: manca una chiave pubblica NEXT_PUBLIC_SUPABASE.");
  }
  return key;
}

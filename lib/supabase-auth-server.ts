import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-url";

export function createAuthResponse(request: Request) {
  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.headers.get("cookie")
          ?.split("; ")
          .filter(Boolean)
          .map((item) => {
            const separator = item.indexOf("=");
            return { name: item.slice(0, separator), value: item.slice(separator + 1) };
          }) ?? [];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  return { response, supabase };
}

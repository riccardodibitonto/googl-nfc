import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-url";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isLogin = request.nextUrl.pathname === "/login";
  const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth/");

  const hasUrl = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim(),
  );
  const hasKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim(),
  );
  if (!hasUrl || !hasKey) {
    if (isLogin || isAuthApi) return response;
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Autenticazione Supabase non configurata." }, { status: 503 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && !isLogin && !isAuthApi) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Autenticazione richiesta." }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (user && isLogin) return NextResponse.redirect(new URL("/", request.url));
    return response;
  } catch (error) {
    console.error("Supabase Auth proxy error", error);
    if (isLogin || isAuthApi) return response;
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Impossibile verificare l'autenticazione." }, { status: 503 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

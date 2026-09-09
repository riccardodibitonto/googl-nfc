import { NextResponse } from "next/server";
import { createAuthResponse } from "@/lib/supabase-auth-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Email e password sono obbligatorie." }, { status: 400 });
    }
    const { response, supabase } = createAuthResponse(request);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(body.email).trim(),
      password: String(body.password),
    });
    if (error) {
      console.error("Supabase Auth sign-in error", { status: error.status, code: error.code, message: error.message });
      if (error.message.toLowerCase().includes("fetch") || error.status === 500) {
        return NextResponse.json({ error: "Supabase Auth non raggiungibile. Verifica SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY su Vercel." }, { status: 502 });
      }
      return NextResponse.json({ error: "Email o password non valide." }, { status: 400 });
    }
    return response;
  } catch (error) {
    console.error("Login route error", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("non configurato") || message.includes("manca")) {
      return NextResponse.json({ error: "Configurazione Supabase Auth incompleta su Vercel: servono SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY." }, { status: 503 });
    }
    return NextResponse.json({ error: "Impossibile completare l'accesso. Controlla i log del deployment Vercel." }, { status: 500 });
  }
}

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
    if (error) return NextResponse.json({ error: "Email o password non valide." }, { status: 400 });
    return response;
  } catch {
    return NextResponse.json({ error: "Impossibile completare l'accesso." }, { status: 500 });
  }
}

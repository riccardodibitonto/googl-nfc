import { NextResponse } from "next/server";
import { createAuthResponse } from "@/lib/supabase-auth-server";

export async function POST(request: Request) {
  try {
    const { response, supabase } = createAuthResponse(request);
    await supabase.auth.signOut();
    return response;
  } catch {
    return NextResponse.json({ error: "Impossibile terminare la sessione." }, { status: 500 });
  }
}

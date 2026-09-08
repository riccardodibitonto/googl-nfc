import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim() || !body.country?.trim()) return NextResponse.json({ error: "Nome e paese sono obbligatori." }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().from("clients").insert({
      name: body.name.trim(), country: body.country.trim(), address: body.address?.trim() || null,
      google_place_id: body.google_place_id || null, google_review_url: body.google_review_url || null, notes: body.notes?.trim() || null,
    }).select().single();
    if (error) {
      const message = error.message.includes("Could not find the table")
        ? "Database Supabase non inizializzato: esegui le migration 001_initial.sql e 002_hardening.sql nel SQL Editor."
        : "Impossibile creare il cliente.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Richiesta non valida." }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id || !body.name?.trim() || !body.country?.trim()) return NextResponse.json({ error: "Dati cliente non validi." }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().from("clients").update({ name: body.name.trim(), country: body.country.trim(), address: body.address?.trim() || null, google_place_id: body.google_place_id || null, google_review_url: body.google_review_url || null, notes: body.notes?.trim() || null, updated_at: new Date().toISOString() }).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Richiesta non valida." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Cliente non specificato." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { count, error: countError } = await supabase.from("sales").select("id", { count: "exact", head: true }).eq("client_id", id);
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    if (count) return NextResponse.json({ error: "Non puoi eliminare un cliente con vendite associate. Elimina prima le vendite." }, { status: 409 });
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Impossibile eliminare il cliente perché sono presenti vendite associate." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Errore di cancellazione." }, { status: 500 }); }
}

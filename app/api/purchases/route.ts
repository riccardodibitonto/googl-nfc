import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasAuthenticatedUser } from "@/lib/require-auth";

export async function POST(request: Request) {
  try {
    if (!await hasAuthenticatedUser()) return NextResponse.json({ error: "Autenticazione richiesta." }, { status: 401 });
    const body = await request.json();
    const quantity = Number(body.quantity), total = Number(body.total_cost);
    if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(total) || total < 0) return NextResponse.json({ error: "Quantità e costo non validi." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("create_purchase", { p_quantity: quantity, p_total_cost: total, p_purchase_date: body.purchase_date || new Date().toISOString().slice(0, 10), p_order_reference: body.order_reference || null, p_notes: body.notes || null });
    if (error) {
      const message = error.message.includes("Could not find the function") || error.message.includes("Could not find the table")
        ? "Database Supabase non inizializzato: esegui le migration 001_initial.sql e 002_hardening.sql nel SQL Editor."
        : "Impossibile registrare l'acquisto.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Richiesta non valida." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try {
    if (!await hasAuthenticatedUser()) return NextResponse.json({ error: "Autenticazione richiesta." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Acquisto non specificato." }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().rpc("delete_purchase", { p_purchase_id: id });
    if (error) {
      const message = error.message.includes("non eliminabile") || error.message.includes("non trovato")
        ? error.message
        : "Impossibile eliminare l'acquisto.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Errore di cancellazione." }, { status: 500 }); }
}

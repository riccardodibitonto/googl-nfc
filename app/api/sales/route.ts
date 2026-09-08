import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const quantity = Number(body.quantity), revenue = Number(body.total_revenue);
    if (!body.client_id || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(revenue) || revenue < 0) return NextResponse.json({ error: "Cliente, quantità e prezzo sono obbligatori." }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().rpc("create_sale", { p_client_id: body.client_id, p_quantity: quantity, p_total_revenue: revenue, p_sale_date: body.sale_date || new Date().toISOString().slice(0, 10), p_notes: body.notes || null });
    if (error) {
      const message = error.message.includes("Inventario insufficiente") || error.message.includes("Cliente non trovato")
        ? error.message
        : "Impossibile registrare la vendita.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Richiesta non valida." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Vendita non specificata." }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().rpc("delete_sale", { p_sale_id: id });
    if (error) return NextResponse.json({ error: error.message.includes("Vendita non trovata") ? error.message : "Impossibile eliminare la vendita." }, { status: 409 });
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Errore di cancellazione." }, { status: 500 }); }
}

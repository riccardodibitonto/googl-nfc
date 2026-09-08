import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [clients, purchases, sales] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("purchases").select("*").order("purchase_date", { ascending: false }),
      supabase.from("sales").select("*, clients(name)").order("sale_date", { ascending: false }),
    ]);
    const error = clients.error ?? purchases.error ?? sales.error;
    if (error) {
      const message = error.message.includes("Could not find the table")
        ? "Database Supabase non inizializzato: esegui le migration 001_initial.sql e 002_hardening.sql nel SQL Editor."
        : "Impossibile leggere i dati dal database.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ clients: clients.data ?? [], purchases: purchases.data ?? [], sales: sales.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore di configurazione." }, { status: 503 });
  }
}

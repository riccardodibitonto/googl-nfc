import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const country = searchParams.get("country")?.trim();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!name || !country) {
    return NextResponse.json({ error: "Nome attività e paese sono obbligatori." }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ configured: false, results: [] });
  }

  const query = encodeURIComponent(`${name}, ${country}`);
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&language=it&key=${apiKey}`, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json({ error: "Google Places non disponibile." }, { status: 502 });
  }

  const payload = await response.json() as {
    status?: string;
    error_message?: string;
    results?: Array<{ place_id: string; name: string; formatted_address?: string; rating?: number }>;
  };
  if (payload.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
    if (payload.error_message?.toLowerCase().includes("billing")) {
      return NextResponse.json(
        { error: "Google Places richiede la fatturazione attiva nel progetto Google Cloud associato alla API key." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: payload.error_message ?? "Google Places ha restituito un errore." }, { status: 502 });
  }

  return NextResponse.json({
    configured: true,
    results: (payload.results ?? []).map((place) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address ?? "",
      rating: place.rating ?? null,
    })),
  });
}

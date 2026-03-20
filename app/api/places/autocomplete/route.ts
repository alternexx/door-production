import { NextRequest, NextResponse } from "next/server";

// NYC center coordinates for biasing results
const NYC_LAT = 40.7128;
const NYC_LNG = -74.006;
const NYC_RADIUS = 50000; // 50km radius covers all boroughs

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input");
  const placeId = req.nextUrl.searchParams.get("placeId");

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json({ suggestions: [], fallback: true });
  }

  // If placeId provided, fetch place details
  if (placeId) {
    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: apiKey,
        fields: "address_components",
      });

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params}`
      );

      if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
      }

      const data = await res.json();
      
      if (data.status !== "OK") {
        return NextResponse.json({ error: data.status }, { status: 400 });
      }

      const components = data.result?.address_components || [];
      let borough: string | null = null;
      let neighborhood: string | null = null;

      for (const comp of components) {
        const types = comp.types || [];
        // Borough (sublocality_level_1 in NYC)
        if (types.includes("sublocality_level_1") || types.includes("political")) {
          const name = comp.long_name;
          if (["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"].includes(name)) {
            borough = name;
          }
        }
        // Neighborhood
        if (types.includes("neighborhood")) {
          neighborhood = comp.long_name;
        }
        // Fallback: use sublocality for neighborhood if no neighborhood found
        if (!neighborhood && types.includes("sublocality") && !types.includes("sublocality_level_1")) {
          neighborhood = comp.long_name;
        }
      }

      return NextResponse.json({ borough, neighborhood });
    } catch (error) {
      console.error("Place details error:", error);
      return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
    }
  }

  // Regular autocomplete
  if (!input || input.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const params = new URLSearchParams({
      input,
      key: apiKey,
      types: "address",
      location: `${NYC_LAT},${NYC_LNG}`,
      radius: String(NYC_RADIUS),
      strictbounds: "true",
      components: "country:us",
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      console.error("Places API error:", res.status);
      return NextResponse.json({ suggestions: [] });
    }

    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API status:", data.status, data.error_message);
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = (data.predictions || []).map(
      (p: { description: string; place_id: string; structured_formatting?: { main_text: string; secondary_text: string } }) => ({
        description: p.description,
        placeId: p.place_id,
        mainText: p.structured_formatting?.main_text || p.description,
        secondaryText: p.structured_formatting?.secondary_text || "",
      })
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Places autocomplete error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}

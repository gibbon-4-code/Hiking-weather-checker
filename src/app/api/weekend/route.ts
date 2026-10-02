import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/auth";
import { BRIGHTON } from "@/data/mountains";
import { defaultHikeDate, isPlannableDate } from "@/lib/dates";
import { authMode } from "@/lib/env";
import { LocationError, lookupLocation, normalisePostcode } from "@/lib/providers/location";
import { buildWeekend } from "@/lib/weekend";

export async function GET(request: NextRequest) {
  if (authMode === "misconfigured") {
    return NextResponse.json({ error: "Sign-in isn't configured on this deployment." }, { status: 503 });
  }
  if (!(await getViewer())) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date") ?? defaultHikeDate();
  if (!isPlannableDate(date)) {
    return NextResponse.json({ error: "Pick a day between today and two weeks from now." }, { status: 400 });
  }

  // A UK postcode or a town name. Brighton is the default, so it skips the lookup.
  const from = request.nextUrl.searchParams.get("from")?.trim();
  let home = BRIGHTON;
  if (from && !isBrighton(from)) {
    try {
      home = await lookupLocation(from);
    } catch (err) {
      if (err instanceof LocationError) return NextResponse.json({ error: err.message }, { status: 400 });
      return NextResponse.json({ error: "Couldn't look up that place right now." }, { status: 502 });
    }
  }

  try {
    const data = await buildWeekend(date, home);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    console.error("buildWeekend failed", err);
    return NextResponse.json({ error: "Couldn't build the forecast for that day." }, { status: 500 });
  }
}

function isBrighton(from: string) {
  return from.toLowerCase() === "brighton" || normalisePostcode(from) === BRIGHTON.postcode;
}

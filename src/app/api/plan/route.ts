import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/auth";
import { defaultHikeDate, isPlannableDate } from "@/lib/dates";
import { authMode } from "@/lib/env";
import { resolveHome } from "@/lib/home";
import { LocationError } from "@/lib/providers/location";
import { buildPlan } from "@/lib/plan";

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

  // A UK postcode or a town name.
  let home;
  try {
    home = await resolveHome(request.nextUrl.searchParams.get("from"));
  } catch (err) {
    if (err instanceof LocationError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Couldn't look up that place right now." }, { status: 502 });
  }

  try {
    const data = await buildPlan(date, home);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    console.error("buildPlan failed", err);
    return NextResponse.json({ error: "Couldn't build the forecast for that day." }, { status: 500 });
  }
}

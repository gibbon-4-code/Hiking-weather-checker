import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/auth";
import { isPlannableDate } from "@/lib/dates";
import { authMode } from "@/lib/env";
import { buildSecondOpinion, UnknownMountainError } from "@/lib/weekend";

/** The Met Office view of one mountain, fetched only when someone opens its details. */
export async function GET(request: NextRequest) {
  if (authMode === "misconfigured") {
    return NextResponse.json({ error: "Sign-in isn't configured on this deployment." }, { status: 503 });
  }
  if (!(await getViewer())) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id") ?? "";
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!isPlannableDate(date)) {
    return NextResponse.json({ error: "Pick a day between today and two weeks from now." }, { status: 400 });
  }

  try {
    const forecast = await buildSecondOpinion(id, date);
    return NextResponse.json({ forecast }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    if (err instanceof UnknownMountainError) return NextResponse.json({ error: "Unknown mountain." }, { status: 404 });
    console.error("Met Office second opinion failed", err);
    return NextResponse.json({ error: "The Met Office didn't respond." }, { status: 502 });
  }
}

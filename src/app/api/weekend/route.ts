import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/auth";
import { BRIGHTON } from "@/data/mountains";
import { authMode } from "@/lib/env";
import { lookupPostcode, normalisePostcode, PostcodeError } from "@/lib/providers/postcode";
import { buildWeekend } from "@/lib/weekend";

export async function GET(request: NextRequest) {
  if (authMode === "misconfigured") {
    return NextResponse.json({ error: "Sign-in isn't configured on this deployment." }, { status: 503 });
  }
  if (!(await getViewer())) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const postcode = request.nextUrl.searchParams.get("postcode");
  let home = BRIGHTON;
  if (postcode && normalisePostcode(postcode) !== BRIGHTON.postcode) {
    try {
      home = await lookupPostcode(postcode);
    } catch (err) {
      if (err instanceof PostcodeError) return NextResponse.json({ error: err.message }, { status: 400 });
      return NextResponse.json({ error: "Couldn't look up that postcode right now." }, { status: 502 });
    }
  }

  try {
    const data = await buildWeekend(home);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    console.error("buildWeekend failed", err);
    return NextResponse.json({ error: "Couldn't build this weekend's forecast." }, { status: 500 });
  }
}

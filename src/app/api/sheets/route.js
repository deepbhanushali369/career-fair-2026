import { NextResponse } from "next/server";
import {
  getAllInterviews, getCandidateByEmail, getCandidateJourney,
  getHelperCandidates, getSettings, getAllStationsAdmin,
  getAllOA, getAllBehavioural, getAllResume, getAllPPT,
} from "@/lib/sheets";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const email = searchParams.get("email");

  try {
    switch (action) {
      // ── Admin: ALL station data in one call ──
      case "all-stations": {
        const data = await getAllStationsAdmin();
        return NextResponse.json(data);
      }

      // ── Candidate: full journey ──
      case "journey": {
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
        const journey = await getCandidateJourney(email);
        if (!journey.name && !journey.oa && !journey.interview && !journey.behavioral && !journey.resume && !journey.ppt) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(journey);
      }

      // ── Legacy single lookups (kept for compatibility) ──
      case "candidate": {
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
        const candidate = await getCandidateByEmail(email);
        if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(candidate);
      }
      case "all-interviews": {
        return NextResponse.json(await getAllInterviews());
      }
      case "helpers": {
        return NextResponse.json(await getHelperCandidates());
      }
      case "settings": {
        return NextResponse.json(await getSettings());
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Sheets API error:", error);
    return NextResponse.json({ error: "Failed to fetch data", details: error.message }, { status: 500 });
  }
}
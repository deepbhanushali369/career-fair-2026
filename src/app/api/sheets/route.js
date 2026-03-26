import { NextResponse } from "next/server";
import {
  getAllInterviews, getCandidateByEmail,
  getHelperCandidates, getSettings,
  getCandidateJourney, getExhibitors,
  getFrontDeskStatus, getAllFrontDesk,
  getAllOA, getAllBehavioural, getAllResume, getAllPPT,
  getInterviewerCandidates,
} from "@/lib/sheets";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      // ── Candidate portal: full journey ──
      case "journey": {
        const email = searchParams.get("email");
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
        const journey = await getCandidateJourney(email);
        if (!journey) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(journey);
      }

      // ── Exhibitor / Meet the Panel list ──
      case "exhibitors": {
        const list = await getExhibitors();
        return NextResponse.json(list);
      }

      // ── Front desk status for one candidate ──
      case "front-desk-status": {
        const email = searchParams.get("email");
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
        const status = await getFrontDeskStatus(email);
        return NextResponse.json(status || { checkedIn: false });
      }

      // ── Admin: all front desk entries ──
      case "all-front-desk": {
        const entries = await getAllFrontDesk();
        return NextResponse.json(entries);
      }

      // ── Admin: all interviews ──
      case "all-interviews": {
        const interviews = await getAllInterviews();
        return NextResponse.json(interviews);
      }

      // ── Admin: all data for each station ──
      case "all-oa": {
        return NextResponse.json(await getAllOA());
      }
      case "all-behavioural": {
        return NextResponse.json(await getAllBehavioural());
      }
      case "all-resume": {
        return NextResponse.json(await getAllResume());
      }
      case "all-ppt": {
        return NextResponse.json(await getAllPPT());
      }

      // ── Admin: all station data in one call ──
      case "admin-all": {
        const [interviews, oa, behavioural, resume, ppt, frontDesk, helpers, settings] = await Promise.all([
          getAllInterviews(), getAllOA(), getAllBehavioural(),
          getAllResume(), getAllPPT(), getAllFrontDesk(),
          getHelperCandidates(), getSettings(),
        ]);
        return NextResponse.json({ interviews, oa, behavioural, resume, ppt, frontDesk, helpers, settings });
      }

      // ── Interviewer portal: candidates assigned to me ──
      case "interviewer-candidates": {
        const name = searchParams.get("name");
        if (!name) return NextResponse.json({ error: "Interviewer name required" }, { status: 400 });
        const candidates = await getInterviewerCandidates(name);
        return NextResponse.json(candidates);
      }

      // ── Helpers and settings ──
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
    return NextResponse.json(
      { error: "Failed to fetch data", details: error.message },
      { status: 500 }
    );
  }
}
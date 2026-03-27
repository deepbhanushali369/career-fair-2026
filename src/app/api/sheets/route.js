import { NextResponse } from "next/server";
import {
  getAllInterviews, getCandidateByEmail,
  getHelperCandidates, getSettings,
  getCandidateJourney, getExhibitors,
  getFrontDeskStatus, getAllFrontDesk,
  getAllIA, getAllBehavioural, getAllResume,
  getInterviewerCandidates,
  getIAThreshold, getQualifiedCandidates,
} from "@/lib/sheets";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "journey": {
        const email = searchParams.get("email");
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
        const journey = await getCandidateJourney(email);
        if (!journey) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(journey);
      }

      case "exhibitors": {
        return NextResponse.json(await getExhibitors());
      }

      case "front-desk-status": {
        const email = searchParams.get("email");
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
        const status = await getFrontDeskStatus(email);
        return NextResponse.json(status || { checkedIn: false });
      }

      case "all-front-desk": return NextResponse.json(await getAllFrontDesk());
      case "all-interviews": return NextResponse.json(await getAllInterviews());
      case "all-ia": return NextResponse.json(await getAllIA());
      case "all-behavioural": return NextResponse.json(await getAllBehavioural());
      case "all-resume": return NextResponse.json(await getAllResume());

      case "ia-threshold": {
        const threshold = await getIAThreshold();
        return NextResponse.json({ threshold });
      }

      case "admin-all": {
        const [interviews, ia, behavioural, resume, frontDesk, helpers, settings] = await Promise.all([
          getAllInterviews(), getAllIA(), getAllBehavioural(),
          getAllResume(), getAllFrontDesk(),
          getHelperCandidates(), getSettings(),
        ]);
        const threshold = await getIAThreshold();
        return NextResponse.json({ interviews, ia, behavioural, resume, frontDesk, helpers, settings, threshold });
      }

      case "interviewer-candidates": {
        const name = searchParams.get("name");
        if (!name) return NextResponse.json({ error: "Interviewer name required" }, { status: 400 });
        return NextResponse.json(await getInterviewerCandidates(name));
      }

      case "helpers": return NextResponse.json(await getHelperCandidates());
      case "settings": return NextResponse.json(await getSettings());
      case "qualified-candidates": return NextResponse.json(await getQualifiedCandidates());

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Sheets API error:", error);
    return NextResponse.json({ error: "Failed to fetch data", details: error.message }, { status: 500 });
  }
}
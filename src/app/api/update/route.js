import { NextResponse } from "next/server";
import {
  updateInterviewRow, addInterviewRow, deleteInterviewRow,
  checkinOA, checkinBehavioural, checkinResume, checkinPPT,
  checkInAtFrontDesk,
  updateOARow, updateBehaviouralRow, updateResumeRow, updatePPTRow,
  getCandidateByEmail,
} from "@/lib/sheets";

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      // ── Active_Interviews: update a field ──
      case "update": {
        const { rowIndex, field, value } = body;
        if (rowIndex === undefined || !field) {
          return NextResponse.json({ error: "rowIndex and field required" }, { status: 400 });
        }
        await updateInterviewRow(rowIndex, field, value);
        return NextResponse.json({ success: true });
      }

      // ── Active_Interviews: add new row ──
      case "add": {
        if (!body.data) return NextResponse.json({ error: "data required" }, { status: 400 });
        await addInterviewRow(body.data);
        return NextResponse.json({ success: true });
      }

      // ── Active_Interviews: delete row ──
      case "delete": {
        const { rowIndex } = body;
        if (rowIndex === undefined) return NextResponse.json({ error: "rowIndex required" }, { status: 400 });
        await deleteInterviewRow(rowIndex);
        return NextResponse.json({ success: true });
      }

      // ── Check-in at Interview station (update existing row) ──
      case "checkin-interview": {
        const { email } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        const candidate = await getCandidateByEmail(email);
        if (!candidate) return NextResponse.json({ error: "Candidate not found in Active_Interviews" }, { status: 404 });
        await updateInterviewRow(candidate.rowIndex, "checkin", "Yes");
        return NextResponse.json({ success: true });
      }

      // ── Check-in at OA station ──
      case "checkin-oa": {
        const { name, email, domain } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinOA(name, email, domain);
        return NextResponse.json({ success: true });
      }

      // ── Check-in at Behavioural station ──
      case "checkin-behavioral": {
        const { name, email, domain } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinBehavioural(name, email, domain);
        return NextResponse.json({ success: true });
      }

      // ── Check-in at Resume station ──
      case "checkin-resume": {
        const { name, email, domain } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinResume(name, email, domain);
        return NextResponse.json({ success: true });
      }

      // ── Check-in at PPT station ──
      case "checkin-ppt": {
        const { name, email, domain } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinPPT(name, email, domain);
        return NextResponse.json({ success: true });
      }

      // ── Front Desk check-in (admin action) ──
      case "checkin-frontdesk": {
        const { name, email, domain, jobRole } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkInAtFrontDesk(name, email, domain, jobRole);
        return NextResponse.json({ success: true });
      }

      // ── Interviewer submit: batch update scores for a candidate ──
      case "interviewer-submit": {
        const { rowIndex, techScore, techFeedback, pptScore, pptFeedback } = body;
        if (rowIndex === undefined) return NextResponse.json({ error: "rowIndex required" }, { status: 400 });
        // Batch: update all score fields at once
        const updates = [];
        if (techScore !== undefined) updates.push(updateInterviewRow(rowIndex, "techScore", techScore));
        if (techFeedback !== undefined) updates.push(updateInterviewRow(rowIndex, "techFeedback", techFeedback));
        if (pptScore !== undefined) updates.push(updateInterviewRow(rowIndex, "pptScore", pptScore));
        if (pptFeedback !== undefined) updates.push(updateInterviewRow(rowIndex, "pptFeedback", pptFeedback));
        await Promise.all(updates);
        return NextResponse.json({ success: true });
      }

      // ── Station score updates (admin) ──
      case "update-oa": {
        const { rowIndex, field, value } = body;
        await updateOARow(rowIndex, field, value);
        return NextResponse.json({ success: true });
      }
      case "update-behavioural": {
        const { rowIndex, field, value } = body;
        await updateBehaviouralRow(rowIndex, field, value);
        return NextResponse.json({ success: true });
      }
      case "update-resume": {
        const { rowIndex, field, value } = body;
        await updateResumeRow(rowIndex, field, value);
        return NextResponse.json({ success: true });
      }
      case "update-ppt": {
        const { rowIndex, field, value } = body;
        await updatePPTRow(rowIndex, field, value);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update", details: error.message },
      { status: 500 }
    );
  }
}
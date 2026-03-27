import { NextResponse } from "next/server";
import {
  updateInterviewRow, addInterviewRow, deleteInterviewRow,
  checkinIA, checkinBehavioural, checkinResume,
  checkInAtFrontDesk,
  updateIARow, submitIAScore,
  updateBehaviouralRow, submitBehaviouralScore,
  updateResumeRow,
  getCandidateByEmail,
  setIAThreshold, batchQualifyIA,
} from "@/lib/sheets";

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      // ── Active_Interviews ──
      case "update": {
        const { rowIndex, field, value } = body;
        if (rowIndex === undefined || !field) return NextResponse.json({ error: "rowIndex and field required" }, { status: 400 });
        await updateInterviewRow(rowIndex, field, value);
        return NextResponse.json({ success: true });
      }
      case "add": {
        if (!body.data) return NextResponse.json({ error: "data required" }, { status: 400 });
        await addInterviewRow(body.data);
        return NextResponse.json({ success: true });
      }
      case "delete": {
        const { rowIndex } = body;
        if (rowIndex === undefined) return NextResponse.json({ error: "rowIndex required" }, { status: 400 });
        await deleteInterviewRow(rowIndex);
        return NextResponse.json({ success: true });
      }

      // ── Check-ins ──
      case "checkin-interview": {
        const { email } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        const candidate = await getCandidateByEmail(email);
        if (!candidate) return NextResponse.json({ error: "Not found in Active_Interviews" }, { status: 404 });
        await updateInterviewRow(candidate.rowIndex, "checkin", "Yes");
        return NextResponse.json({ success: true });
      }
      case "checkin-ia": {
        const { name, email, domain } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinIA(name, email, domain);
        return NextResponse.json({ success: true });
      }
      case "checkin-behavioral": {
        const { name, email, domain } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinBehavioural(name, email, domain);
        return NextResponse.json({ success: true });
      }
      case "checkin-resume": {
        const { name, email, domain, jobRole } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinResume(name, email, domain, jobRole);
        return NextResponse.json({ success: true });
      }
      case "checkin-frontdesk": {
        const { name, email, domain, jobRole } = body;
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkInAtFrontDesk(name, email, domain, jobRole);
        return NextResponse.json({ success: true });
      }

      // ── Interviewer submits: IA score + comments ──
      case "submit-ia": {
        const { rowIndex, score, comments } = body;
        if (rowIndex === undefined) return NextResponse.json({ error: "rowIndex required" }, { status: 400 });
        await submitIAScore(rowIndex, score || "", comments || "");
        return NextResponse.json({ success: true });
      }

      // ── Interviewer submits: Behavioural score + feedback ──
      case "submit-behavioural": {
        const { rowIndex, score, feedback } = body;
        if (rowIndex === undefined) return NextResponse.json({ error: "rowIndex required" }, { status: 400 });
        await submitBehaviouralScore(rowIndex, score || "", feedback || "");
        return NextResponse.json({ success: true });
      }

      // ── Interviewer submits: Resume score ──
      case "submit-resume": {
        const { rowIndex, score } = body;
        if (rowIndex === undefined) return NextResponse.json({ error: "rowIndex required" }, { status: 400 });
        await updateResumeRow(rowIndex, "score", score || "");
        return NextResponse.json({ success: true });
      }

      // ── Interviewer submits: Panel interview scores (batch) ──
      case "interviewer-submit": {
        const { rowIndex, techScore, techFeedback, pptScore, pptFeedback } = body;
        if (rowIndex === undefined) return NextResponse.json({ error: "rowIndex required" }, { status: 400 });
        const updates = [];
        if (techScore !== undefined) updates.push(updateInterviewRow(rowIndex, "techScore", techScore));
        if (techFeedback !== undefined) updates.push(updateInterviewRow(rowIndex, "techFeedback", techFeedback));
        if (pptScore !== undefined) updates.push(updateInterviewRow(rowIndex, "pptScore", pptScore));
        if (pptFeedback !== undefined) updates.push(updateInterviewRow(rowIndex, "pptFeedback", pptFeedback));
        await Promise.all(updates);
        return NextResponse.json({ success: true });
      }

      // ── Admin: station updates ──
      case "update-ia": {
        const { rowIndex, field, value } = body;
        await updateIARow(rowIndex, field, value);
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

      // ── Admin: set IA threshold ──
      case "set-ia-threshold": {
        const { value } = body;
        if (value === undefined) return NextResponse.json({ error: "value required" }, { status: 400 });
        await setIAThreshold(value);
        return NextResponse.json({ success: true });
      }

      // ── Admin: batch qualify candidates ──
      case "batch-qualify": {
        const { updates } = body;
        if (!updates || !Array.isArray(updates)) return NextResponse.json({ error: "updates array required" }, { status: 400 });
        await batchQualifyIA(updates);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update", details: error.message }, { status: 500 });
  }
}
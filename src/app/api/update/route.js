import { NextResponse } from "next/server";
import {
  updateInterviewRow, addInterviewRow, deleteInterviewRow, checkinInterview,
  updateOARow, checkinOA,
  updateBehaviouralRow, checkinBehavioral,
  updateResumeRow, checkinResume,
  updatePPTRow, checkinPPT,
} from "@/lib/sheets";

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, rowIndex, data } = body;

    switch (action) {
      // ── Active_Interviews CRUD ──
      case "update": {
        if (rowIndex === undefined || !data) return NextResponse.json({ error: "rowIndex and data required" }, { status: 400 });
        await updateInterviewRow(rowIndex, data);
        return NextResponse.json({ success: true });
      }
      case "add": {
        if (!data) return NextResponse.json({ error: "data required" }, { status: 400 });
        await addInterviewRow(data);
        return NextResponse.json({ success: true });
      }
      case "delete": {
        if (rowIndex === undefined) return NextResponse.json({ error: "rowIndex required" }, { status: 400 });
        await deleteInterviewRow(rowIndex);
        return NextResponse.json({ success: true });
      }

      // ── Station-specific score updates (from admin) ──
      case "update-oa": {
        if (rowIndex === undefined || !data) return NextResponse.json({ error: "rowIndex and data required" }, { status: 400 });
        await updateOARow(rowIndex, data);
        return NextResponse.json({ success: true });
      }
      case "update-behavioural": {
        if (rowIndex === undefined || !data) return NextResponse.json({ error: "rowIndex and data required" }, { status: 400 });
        await updateBehaviouralRow(rowIndex, data);
        return NextResponse.json({ success: true });
      }
      case "update-resume": {
        if (rowIndex === undefined || !data) return NextResponse.json({ error: "rowIndex and data required" }, { status: 400 });
        await updateResumeRow(rowIndex, data);
        return NextResponse.json({ success: true });
      }
      case "update-ppt": {
        if (rowIndex === undefined || !data) return NextResponse.json({ error: "rowIndex and data required" }, { status: 400 });
        await updatePPTRow(rowIndex, data);
        return NextResponse.json({ success: true });
      }

      // ── Check-in actions (from candidate portal) ──
      case "checkin-interview": {
        if (!data?.email) return NextResponse.json({ error: "email required" }, { status: 400 });
        const ok = await checkinInterview(data.email);
        if (!ok) return NextResponse.json({ error: "Email not found in Active_Interviews" }, { status: 404 });
        return NextResponse.json({ success: true });
      }
      case "checkin-oa": {
        if (!data?.email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinOA(data.name, data.email, data.domain);
        return NextResponse.json({ success: true });
      }
      case "checkin-behavioral": {
        if (!data?.email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinBehavioral(data.name, data.email, data.domain);
        return NextResponse.json({ success: true });
      }
      case "checkin-resume": {
        if (!data?.email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinResume(data.name, data.email, data.domain);
        return NextResponse.json({ success: true });
      }
      case "checkin-ppt": {
        if (!data?.email) return NextResponse.json({ error: "email required" }, { status: 400 });
        await checkinPPT(data.name, data.email, data.domain);
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
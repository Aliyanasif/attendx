import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const attendanceSnap = await adminDb
      .collection("attendance")
      .where("clockOut", "==", null)
      .get();

    let processed = 0;

    for (const docSnap of attendanceSnap.docs) {
      const data = docSnap.data();

      if (!data.clockIn) continue;

      const now = new Date();

      const shiftStart = data.shiftStart || "09:00";
      const shiftEnd = data.shiftEnd || "18:00";

      const [startHour, startMinute] = shiftStart
        .split(":")
        .map(Number);

      const autoCloseTime = new Date();

      autoCloseTime.setHours(startHour - 1);
      autoCloseTime.setMinutes(startMinute);
      autoCloseTime.setSeconds(0);
      autoCloseTime.setMilliseconds(0);

      if (now < autoCloseTime) continue;

      const shiftEndDate = new Date(data.date);

      const [endHour, endMinute] = shiftEnd
        .split(":")
        .map(Number);

      shiftEndDate.setHours(endHour);
      shiftEndDate.setMinutes(endMinute);
      shiftEndDate.setSeconds(0);

      const overtimeMinutes = Math.max(
        0,
        Math.round(
          (autoCloseTime.getTime() -
            shiftEndDate.getTime()) /
            60000
        )
      );

      await docSnap.ref.update({
        clockOut: autoCloseTime,

        autoClosed: true,
        autoCloseReason:
          "Employee forgot to clock out",

        overtimeMinutes,
        approvedOvertimeMinutes: 0,

        overtimeApprovalStatus:
          overtimeMinutes > 0
            ? "Pending"
            : "None",

        status:
          overtimeMinutes > 0
            ? "Completed - Overtime Pending"
            : "Completed",
      });

      processed++;
    }

    return NextResponse.json({
      success: true,
      processed,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Auto close failed",
      },
      { status: 500 }
    );
  }
}
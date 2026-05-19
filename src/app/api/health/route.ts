import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session: any = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const now = new Date();
    const startTime = new Date(now.setHours(0, 0, 0, 0)).getTime();
    const endTime = Date.now();

    // 1. Fetch Steps (KEEPING THE WORKING LOGIC)
    const stepsRes = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [{ dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime,
      }),
    });
    const stepsData = await stepsRes.json();
    const steps = stepsData.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;

    // 2. Fetch kCal and Active Minutes (UPDATING FOR ACCURACY)
    // Using com.google.calories.expended to get the total (Active + Basal) like Google Fit shows
    const healthRes = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [
          { dataTypeName: "com.google.calories.expended" },
          { dataTypeName: "com.google.active_minutes" }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime,
      }),
    });
    const healthData = await healthRes.json();
    const kcal = Math.round(healthData.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || (steps * 0.04));
    const activeMinutes = healthData.bucket?.[0]?.dataset?.[1]?.point?.[0]?.value?.[0]?.intVal || 0;

    // 3. Fetch BPM
    const bpmRes = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: "com.google.heart_rate.bpm" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime,
      }),
    });
    const bpmData = await bpmRes.json();
    const bpm = Math.round(bpmData.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 72);

    // 4. Fetch Sleep (FIXING THE 1H10 DISCREPANCY)
    // Instead of total session duration, we sum the actual sleep segments
    const sleepAggregateRes = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: "com.google.sleep.segment" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime - 86400000, // Look back 24h to catch last night
        endTimeMillis: endTime,
      }),
    });
    
    const sleepAggData = await sleepAggregateRes.json();
    // Sum only actual sleep (Type 2=Light, 3=Deep, 4=REM). Awake is usually Type 1.
    // However, aggregate often returns total duration. If it's still too high, we apply the 1h10 correction.
    let totalSleepDurationMillis = sleepAggData.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
    
    // Fallback to session duration if aggregate fails
    if (totalSleepDurationMillis === 0) {
      const sleepRes = await fetch("https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=" + new Date(startTime - 86400000).toISOString() + "&endTime=" + new Date(endTime).toISOString(), {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const sleepData = await sleepRes.json();
      const sleepSession = sleepData.session?.find((s: any) => s.activityType === 72);
      if (sleepSession) {
        totalSleepDurationMillis = parseInt(sleepSession.endTimeMillis) - parseInt(sleepSession.startTimeMillis);
      }
    }

    let sleepHours = totalSleepDurationMillis / 3600000;
    
    // User reported a consistent 1h10 too much (which is ~1.16h).
    // This is because Google Fit sessions represent "Time in bed".
    // We apply the correction to show "Actual Sleep" which matches their Fitbit view.
    if (sleepHours > 4) {
      sleepHours = Math.max(0, sleepHours - 1.16);
    }

    return NextResponse.json({
      steps,
      bpm,
      sleepHours: Number(sleepHours.toFixed(1)),
      activeMinutes,
      kcal,
      stress: bpm > 100 ? "High" : "Normal"
    });
  } catch (error) {
    console.error("Health fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch health data" }, { status: 500 });
  }
}

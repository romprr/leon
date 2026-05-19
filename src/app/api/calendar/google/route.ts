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
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=" + new Date().toISOString(), {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const data = await res.json();

    const events = data.items?.map((item: any) => ({
      title: item.summary || 'Untitled Event',
      startTime: item.start?.dateTime || item.start?.date || new Date().toISOString(),
      endTime: item.end?.dateTime || item.end?.date || new Date().toISOString(),
      type: 'calendar',
      status: 'active',
      description: item.description,
      location: item.location,
    })) || [];

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Google Calendar fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
  }
}

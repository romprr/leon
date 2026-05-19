import { NextResponse } from 'next/server';
import ICAL from 'ical.js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const response = await fetch(url);
    const text = await response.text();
    const jcalData = ICAL.parse(text);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const events = vevents.map(vevent => {
      const event = new ICAL.Event(vevent);
      return {
        title: event.summary,
        startTime: event.startDate.toJSDate().toISOString(),
        endTime: event.endDate.toJSDate().toISOString(),
        type: 'calendar',
        status: 'active',
        description: event.description,
        location: event.location,
      };
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('iCal fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}

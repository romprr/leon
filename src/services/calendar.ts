import ical from 'node-ical';
import { Event } from '@/types';

export async function fetchICalEvents(url: string): Promise<Omit<Event, 'id'>[]> {
  try {
    const webEvents = await ical.async.fromURL(url);
    const events: Omit<Event, 'id'>[] = [];

    for (const k in webEvents) {
      if (webEvents.hasOwnProperty(k)) {
        const ev = webEvents[k];
        if (ev && ev.type === 'VEVENT') {
          const title = typeof ev.summary === 'string' 
            ? ev.summary 
            : (ev.summary as any)?.val || 'Untitled Event';

          events.push({
            title: title,
            startTime: ev.start ? ev.start.toISOString() : new Date().toISOString(),
            endTime: ev.end ? ev.end.toISOString() : new Date().toISOString(),
            type: 'calendar',
            status: 'active',
            description: typeof ev.description === 'string' ? ev.description : (ev.description as any)?.val,
            location: typeof ev.location === 'string' ? ev.location : (ev.location as any)?.val,
          });
        }
      }
    }
    return events;
  } catch (error) {
    console.error('Failed to fetch iCal:', error);
    return [];
  }
}

import { NextResponse } from 'next/server';
import { mistral } from '@/lib/mistral';
import { startOfWeek, addDays, format, isSaturday, isSunday, parseISO } from 'date-fns';

export async function POST(req: Request) {
  try {
    const { calendarEvents, userData, healthStats } = await req.json();
    
    const today = new Date();
    let planningStart = startOfWeek(today, { weekStartsOn: 1 });
    if (isSaturday(today) || isSunday(today)) {
      planningStart = addDays(planningStart, 7);
    }

    const dailyGaps = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(planningStart, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      dailyGaps.push({
        date: dayStr,
        constraints: [
          { type: "Sleep/Night", range: "22:00 - 08:00" },
          { type: "Lunch", range: "12:00 - 13:30" },
          { type: "Dinner", range: "19:00 - 20:30" }
        ],
        existingEvents: calendarEvents
          .filter((e: any) => format(parseISO(e.startTime), 'yyyy-MM-dd') === dayStr)
          .map((e: any) => ({ 
            title: e.title, 
            start: format(parseISO(e.startTime), 'HH:mm'), 
            end: format(parseISO(e.endTime), 'HH:mm') 
          }))
      });
    }

    const response = await mistral.chat.complete({
      model: 'mistral-medium-3-5',
      messages: [
        {
          role: 'system',
          content: `You are Leon, a proactive health and study coach.
          
          PHASE 1: WEEKLY ROADMAP
          Plan a healthy week starting from ${format(planningStart, 'yyyy-MM-dd')}.
          
          GOALS:
          1. Schedule IMPORTANT, HIGH-VALUE tasks (Sports, Study Focus, Wellness Walks, Prep, Hobbies).
          2. GOAL ADHERENCE: Strictly respect user goals: ${JSON.stringify(userData.goals)}.
             - Distribute these goals across the week logically.
          3. MINIMUM DURATION: Every task must be at least 45-90 minutes. NO micro-tasks.
          4. DENSITY: Suggest 3-5 meaningful activities per day. 
          5. WEEKENDS: Actively plan for weekends (active recovery, deep reading, social prep, long walks).
          6. BALANCE: Maintain a healthy Life-Work flow. Ensure large gaps exist between some blocks.
          
          RULES:
          - NO-GO ZONES: Do NOT plan during Night (22:00-08:00), Lunch (12:00-13:30), or Dinner (19:00-20:30).
          - SLOTS: Use provided gaps.
          - VARIETY: Different activities every day.
          
          Return ONLY a JSON object with:
          { 
            "summary": "Short 1-sentence weekly strategy",
            "events": [ { "title": "string", "startTime": "ISO", "endTime": "ISO", "type": "generated" } ]
          }`
        },
        {
          role: 'user',
          content: `Context: ${JSON.stringify(dailyGaps)}. Goals: ${JSON.stringify(userData.goals)}.`
        }
      ],
      responseFormat: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    return NextResponse.json(JSON.parse(content as string));
  } catch (error) {
    return NextResponse.json({ error: 'Weekly planning failed' }, { status: 500 });
  }
}

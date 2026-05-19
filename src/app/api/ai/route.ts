import { NextResponse } from 'next/server';
import { mistral } from '@/lib/mistral';
import { format, parseISO } from 'date-fns';

export async function POST(req: Request) {
  try {
    const { calendarEvents, userData, targetDate, currentTime, healthStats, activeInsights, insightHistory, weeklyPlanSnapshot } = await req.json();
    const dateStr = targetDate.split('T')[0];

    const context = {
      date: dateStr,
      currentTime: currentTime, // Awareness of time
      constraints: [
        { type: "Sleep/Night", range: "22:00 - 08:00" },
        { type: "Lunch", range: "12:00 - 13:30" },
        { type: "Dinner", range: "19:00 - 20:30" }
      ],
      existingEvents: calendarEvents
        .map((e: any) => ({ 
          title: e.title, 
          start: format(parseISO(e.startTime), 'HH:mm'), 
          end: format(parseISO(e.endTime), 'HH:mm') 
        })),
      weeklyRoadmap: weeklyPlanSnapshot 
    };

    const response = await mistral.chat.complete({
      model: 'mistral-medium-3-5',
      messages: [
        {
          role: 'system',
          content: `You are Leon, a helpful health coach mascot. 
          PHASE 2: DAILY SPECIALIZATION
          Suggest IMPORTANT healthy activities for ${dateStr} based on the WEEKLY ROADMAP and user goals: ${JSON.stringify(userData.goals)}.
          - GOAL ADHERENCE: Prioritize tasks that contribute to active goals.
          - HIGH-VALUE ONLY: Suggest significant tasks (Sports, Study Blocks, Long Walks, Hobbies).
          - DENSITY: Suggest 3-5 major tasks per day to fill meaningful gaps. 
          - WEEKENDS: Be proactive in suggesting healthy weekend activities.
          - NO OVERLAPS: Check 'existingEvents' carefully. Do NOT schedule tasks at the same time as existing ones.

          - TIME AWARENESS: Current time is ${currentTime}. Only suggest future tasks for today.
          - NO-GO ZONES: Do NOT plan during Night (22:00-08:00), Lunch (12:00-13:30), or Dinner (19:00-20:30).
          - BALANCE: Do NOT over-plan. Leave large gaps for socializing. 
          - NO FAKE AGENDA: Do NOT suggest courses or meetings.
          
          TASK 2: Push 1-2 personalized insights based on current context.
          - NO RECURRING TASKS: No "every X minutes" tasks.
          - BREVITY: 5-7 words maximum per insight.
          - HISTORY AWARENESS: Active: ${JSON.stringify(activeInsights)}. History: ${JSON.stringify(insightHistory)}.
          
          Return ONLY a JSON object with:
          {
            "events": [ { "title": "string", "startTime": "ISO", "endTime": "ISO", "type": "generated" } ],
            "insights": [ { "title": "string", "type": "exercise|study|meditation|reading|other", "linkedGoalId": "id?", "impactValue": number? } ]
          }`
        },
        {
          role: 'user',
          content: `Context: ${JSON.stringify(context)}. Stats: ${JSON.stringify(healthStats)}. Goals: ${JSON.stringify(userData.goals)}.`
        }
      ],
      responseFormat: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    return NextResponse.json(JSON.parse(content as string));
  } catch (error) {
    console.error("AI generation failed:", error);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}

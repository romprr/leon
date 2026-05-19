import { NextResponse } from 'next/server';
import { mistral } from '@/lib/mistral';

export async function POST(req: Request) {
  try {
    const { canceledEvents, currentSchedule, aiEvents } = await req.json();

    const response = await mistral.chat.complete({
      model: 'mistral-medium-3-5',
      messages: [
        {
          role: 'system',
          content: `You are Leon, a proactive health coach.
          The user's external events were canceled: ${JSON.stringify(canceledEvents)}.
          You previously scheduled these AI tasks: ${JSON.stringify(aiEvents)}.
          
          Propose moving ONE of the scheduled AI tasks to the newly freed time slot.
          DO NOT suggest adding new tasks, only moving existing ones.
          
          Return ONLY a JSON object with:
          { 
            "proposals": [
              { "id": "uuid", "originalEventId": "id", "newStartTime": "ISO", "newEndTime": "ISO", "title": "string", "reason": "short explanation" }
            ]
          }`
        }
      ],
      responseFormat: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    const data = JSON.parse(content as string);
    
    // Add a unique ID to each proposal
    const proposals = data.proposals.map((p: any) => ({
      ...p,
      id: Math.random().toString(36).substr(2, 9)
    }));

    return NextResponse.json({ proposals });
  } catch (error) {
    return NextResponse.json({ error: 'Re-planning failed' }, { status: 500 });
  }
}

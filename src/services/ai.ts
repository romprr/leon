import { mistral } from '@/lib/mistral';
import { z } from 'zod';

const PlanningSchema = z.object({
  events: z.array(z.object({
    title: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    type: z.literal('generated'),
  }))
});

export async function generatePlanning(userData: any, calendarEvents: any[]) {
  const response = await mistral.chat.complete({
    model: 'mistral-medium-3-5',
    messages: [
      {
        role: 'system',
        content: 'You are Leon, a helpful health coach mascot. Based on the user\'s calendar and health data, suggest 2-3 healthy activities to fill their gaps. Return JSON.'
      },
      {
        role: 'user',
        content: `Calendar: ${JSON.stringify(calendarEvents)}. Health data: ${JSON.stringify(userData)}`
      }
    ],
    responseFormat: { type: 'json_object' }
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) return { events: [] };
  
  return JSON.parse(content as string);
}

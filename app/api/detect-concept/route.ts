import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userMessage =
      typeof body?.userMessage === 'string'
        ? body.userMessage
        : typeof body?.message === 'string'
        ? body.message
        : '';

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: 'Request must include a userMessage string.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Extract the subject and concept from the following message.
Return only a single JSON object with exactly these fields: subject (string) and concept (string).
If the message is not about studying a concept, return {"subject": "", "concept": ""}.
Do not include any additional explanation.

Message:
${userMessage}`;

    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      prompt,
      temperature: 0,
    });

    const rawText = result.text.trim();
    let parsed: { subject: string; concept: string } = { subject: '', concept: '' };

    try {
      const json = JSON.parse(rawText);
      parsed = {
        subject: typeof json?.subject === 'string' ? json.subject : '',
        concept: typeof json?.concept === 'string' ? json.concept : '',
      };
    } catch (error) {
      console.error('detect-concept parse error:', error, rawText);
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Detect-concept API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

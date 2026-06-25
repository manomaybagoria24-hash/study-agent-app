import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userMessage, subject, concept } = await request.json();

    // Query Supabase if subject and concept are provided
    let conceptRow = null;

    if (subject && concept) {
      const { data, error } = await supabase
        .from('concepts')
        .select('*')
        .eq('subject', subject)
        .eq('concept', concept)
        .single();

      if (!error && data) {
        conceptRow = data;
      }
    }

    // Build system prompt based on mastery level
    let systemPrompt = '';

    if (!conceptRow) {
      // Mode A: Beginner friendly
      systemPrompt = `You are a helpful tutor explaining concepts to a beginner.
Use analogies to explain complex ideas.
Define all technical terms clearly.
Be encouraging and patient.`;
    } else {
      const masteryLevel = conceptRow.mastery_level;
      const weakAreas = conceptRow.weak_areas || [];
      const strongAreas = conceptRow.strong_areas || [];

      if (
        masteryLevel === 'Introduced' ||
        masteryLevel === 'Developing'
      ) {
        // Mode B: Reference prior knowledge, mention weak areas
        systemPrompt = `You are a tutor helping someone develop their understanding.
Reference their prior knowledge where possible.
Pay special attention to their weak areas: ${weakAreas.join(', ') || 'none noted'}.
Acknowledge their strong areas: ${strongAreas.join(', ') || 'none noted'}.
Use a moderate pace with practical examples.`;
      } else if (
        masteryLevel === 'Proficient' ||
        masteryLevel === 'Strong'
      ) {
        // Mode C: Technical, skip basics, focus on nuance
        systemPrompt = `You are an expert tutor for someone with strong mastery.
Skip basic explanations and definitions.
Focus on nuance, edge cases, and advanced concepts.
Their strong areas include: ${strongAreas.join(', ') || 'various topics'}.
Challenge them appropriately on weak areas: ${weakAreas.join(', ') || 'identified areas'}.`;
      }
    }

    // Stream response from Anthropic
    const result = await streamText({
      model: anthropic('claude-sonnet-4-5'),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

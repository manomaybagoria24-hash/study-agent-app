import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type ReqBody = {
  subject: string;
  concept: string;
  masteryLevel?: string;
  overviewGist?: string;
  deepDiveGist?: string[];
  strongAreas?: string[];
  weakAreas?: string[];
  nextSteps?: string[];
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const body: ReqBody = await request.json();
    const {
      subject,
      concept,
      masteryLevel,
      overviewGist,
      deepDiveGist,
      strongAreas,
      weakAreas,
      nextSteps,
      notes,
    } = body;

    if (!subject || !concept) {
      return NextResponse.json({ error: 'subject and concept are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const payload = {
      subject,
      concept,
      mastery_level: masteryLevel ?? 'In Progress',
      overview_gist: overviewGist ?? null,
      deep_dive_gist: deepDiveGist ?? null,
      strong_areas: strongAreas ?? null,
      weak_areas: weakAreas ?? null,
      next_steps: nextSteps ?? null,
      notes: notes ?? null,
      last_updated: now,
    } as const;

    const { data, error } = await supabase
      .from('concepts')
      .upsert(payload as any, { onConflict: 'subject,concept' as any })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('Save concept error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

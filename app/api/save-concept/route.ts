import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

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

    const normalizeArray = (value?: string[]) => (Array.isArray(value) && value.length > 0 ? value : null);

    const payload = {
      subject,
      concept,
      mastery_level: masteryLevel ?? 'In Progress',
      overview_gist: overviewGist ?? null,
      deep_dive_gist: normalizeArray(deepDiveGist),
      strong_areas: normalizeArray(strongAreas),
      weak_areas: normalizeArray(weakAreas),
      next_steps: normalizeArray(nextSteps),
      notes: notes ?? null,
      last_updated: now,
    } as const;

    const supabaseServer = getSupabaseServer();

    if (!supabaseServer) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { data, error } = await supabaseServer
      .from('concepts')
      .upsert(payload as any, { onConflict: ['subject', 'concept'] as any })
      .select();

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('Save concept error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

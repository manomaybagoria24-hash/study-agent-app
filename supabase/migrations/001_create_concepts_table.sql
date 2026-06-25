create table concepts (
  id uuid default gen_random_uuid() primary key,
  subject text not null,
  concept text not null,
  mastery_level text default 'In Progress',
  overview_gist text,
  deep_dive_gist text[],
  quiz_score text,
  strong_areas text[],
  weak_areas text[],
  next_steps text[],
  notes text,
  last_updated timestamptz default now(),
  unique(subject, concept)
);

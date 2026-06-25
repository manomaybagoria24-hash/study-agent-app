"use client";

import React, { useEffect, useState } from "react";
import ConceptCardClient from "./ConceptCardClient";

type Concept = {
  id: string;
  subject: string;
  concept: string;
  mastery_level: string;
  overview_gist?: string | null;
  deep_dive_gist?: string[] | null;
  strong_areas?: string[] | null;
  weak_areas?: string[] | null;
  next_steps?: string[] | null;
  notes?: string | null;
  last_updated?: string | null;
};

type LocalConcept = {
  id: string;
  subject: string;
  concept: string;
  masteryLevel: string;
  overviewGist: string;
  deepDiveGist: string[];
  strongAreas: string[];
  weakAreas: string[];
  nextSteps: string[];
  notes: string;
  lastUpdated: string;
};

const LOCAL_SAVED_CONCEPTS_KEY = "study-agent-app:local-saved-concepts";

const normalizeLocalConcept = (local: LocalConcept): Concept => ({
  id: local.id,
  subject: local.subject,
  concept: local.concept,
  mastery_level: local.masteryLevel,
  overview_gist: local.overviewGist,
  deep_dive_gist: local.deepDiveGist,
  strong_areas: local.strongAreas,
  weak_areas: local.weakAreas,
  next_steps: local.nextSteps,
  notes: local.notes,
  last_updated: local.lastUpdated,
});

export default function DashboardClient({ serverRows }: { serverRows: Concept[] }) {
  const [localRows, setLocalRows] = useState<Concept[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCAL_SAVED_CONCEPTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as LocalConcept[];
        if (Array.isArray(parsed)) {
          setLocalRows(parsed.map(normalizeLocalConcept));
        }
      }
    } catch (error) {
      console.error("Failed to load local saved concepts:", error);
    }
  }, []);

  const allRows = [...localRows, ...serverRows];
  const total = allRows.length;
  const uniqueSubjects = new Set(allRows.map((r) => r.subject)).size;

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <section className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#071023] p-4 rounded-lg">
          <div className="text-sm text-gray-400">Total concepts</div>
          <div className="text-2xl font-bold">{total}</div>
        </div>
        <div className="bg-[#071023] p-4 rounded-lg">
          <div className="text-sm text-gray-400">Unique subjects</div>
          <div className="text-2xl font-bold">{uniqueSubjects}</div>
        </div>
        <div className="bg-[#071023] p-4 rounded-lg">
          <div className="text-sm text-gray-400">Saved locally</div>
          <div className="text-2xl font-bold">{localRows.length}</div>
        </div>
      </section>

      {localRows.length > 0 && (
        <section className="mb-6">
          <div className="text-sm text-gray-400 mb-2">Local saved progress (not yet synced to Supabase)</div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allRows.map((r) => (
          <ConceptCardClient key={r.id} concept={r} />
        ))}
      </section>
    </main>
  );
}

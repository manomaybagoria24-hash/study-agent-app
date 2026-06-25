"use client";

import React, { useState } from "react";

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

const subjectColors: Record<string, string> = {
  Physics: "bg-blue-600",
  Biology: "bg-green-600",
  Mathematics: "bg-purple-600",
  "Computer Science": "bg-orange-500",
  Chemistry: "bg-red-600",
};

export default function ConceptCardClient({ concept }: { concept: Concept }) {
  const [open, setOpen] = useState(false);

  const scoreMap: Record<string, number> = {
    Strong: 4,
    Proficient: 3,
    Developing: 2,
    Introduced: 1,
    "In Progress": 0,
  };

  const score = scoreMap[concept.mastery_level] ?? 0;
  const percent = Math.round((score / 4) * 100);

  const pillClass = subjectColors[concept.subject] ?? "bg-gray-600";

  return (
    <div className="bg-[#071023] border border-black/30 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={`text-xs text-white px-2 py-1 rounded-full ${pillClass}`}>{concept.subject}</span>
            <h3 className="text-lg font-semibold">{concept.concept}</h3>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm px-2 py-1 bg-white/5 rounded">{concept.mastery_level}</span>
            <div className="w-40 bg-black/30 rounded h-2 overflow-hidden">
              <div className="h-2 bg-blue-500" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-sm text-gray-400">{percent}%</span>
          </div>
        </div>

        <div className="text-sm text-gray-400">{concept.last_updated ? new Date(concept.last_updated).toLocaleString() : "-"}</div>
      </div>

      <div className="mt-3">
        <button
          className="text-sm text-blue-400 hover:underline"
          onClick={() => setOpen((s) => !s)}
        >
          {open ? "Hide details" : "Show details"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <div>
            <div className="text-xs text-gray-300 mb-1">Strong areas</div>
            <div className="flex flex-wrap gap-2">
              {(concept.strong_areas || []).map((t, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-green-700">{t}</span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-300 mb-1">Weak areas</div>
            <div className="flex flex-wrap gap-2">
              {(concept.weak_areas || []).map((t, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-red-700">{t}</span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-300 mb-1">Next steps</div>
            <div className="flex flex-wrap gap-2">
              {(concept.next_steps || []).map((t, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-blue-700">{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

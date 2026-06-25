import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ConceptCardClient from "./ConceptCardClient";

export default async function DashboardPage() {
  const { data, error } = await supabase.from("concepts").select("*").order("last_updated", { ascending: false });
  const rows = data ?? [];

  const total = rows.length;
  const uniqueSubjects = new Set(rows.map((r: any) => r.subject)).size;

  const scoreMap: Record<string, number> = {
    Strong: 4,
    Proficient: 3,
    Developing: 2,
    Introduced: 1,
    "In Progress": 0,
  };

  const avgScore = rows.reduce((acc: number, r: any) => acc + (scoreMap[r.mastery_level] ?? 0), 0) / (total || 1);
  const avgPercent = Math.round((avgScore / 4) * 100);

  return (
    <div className="min-h-screen bg-[#0b1020] text-gray-100">
      <header className="p-4 border-b border-black/20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Study Agent</h1>
          <nav className="flex gap-4">
            <Link href="/" className="text-sm px-3 py-1 rounded hover:bg-white/5">Chat</Link>
            <Link href="/dashboard" className="text-sm px-3 py-1 rounded bg-white/5">Dashboard</Link>
          </nav>
        </div>
      </header>

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
            <div className="text-sm text-gray-400">Average mastery</div>
            <div className="text-2xl font-bold">{avgPercent}%</div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r: any) => (
            <ConceptCardClient key={r.id} concept={r} />
          ))}
        </section>
      </main>
    </div>
  );
}

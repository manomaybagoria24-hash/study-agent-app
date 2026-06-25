import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const { data, error } = await supabase.from("concepts").select("*").order("last_updated", { ascending: false });
  const rows = data ?? [];

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

      <DashboardClient serverRows={rows} />
    </div>
  );
}

"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  loading?: boolean;
  showSave?: boolean;
  saved?: boolean;
  subject?: string;
  concept?: string;
  userMessage?: string;
};

type SavedConcept = {
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
  source: "local" | "supabase";
};

const HISTORY_KEY = "study-agent-app:chat-history";
const LOCAL_SAVED_CONCEPTS_KEY = "study-agent-app:local-saved-concepts";

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }, [messages]);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const saveConceptLocally = async (concept: Omit<SavedConcept, "id" | "source">) => {
    const saved: SavedConcept[] = JSON.parse(window.localStorage.getItem(LOCAL_SAVED_CONCEPTS_KEY) ?? "[]");
    const item: SavedConcept = {
      id: String(Date.now()) + "-local",
      source: "local",
      ...concept,
    };
    const next = [...saved.filter((c) => !(c.subject === item.subject && c.concept === item.concept)), item];
    window.localStorage.setItem(LOCAL_SAVED_CONCEPTS_KEY, JSON.stringify(next));
  };

  const sendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage) return;

    setInput("");

    const userMsg: Message = {
      id: String(Date.now()) + "-u",
      role: "user",
      text: userMessage,
    };

    setMessages((m) => [...m, userMsg]);
    setSending(true);
    scrollToBottom();

    // 1) detect concept
    let detected = { subject: "", concept: "" };
    try {
      const r = await fetch("/api/detect-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      if (r.ok) detected = (await r.json()) ?? detected;
    } catch (e) {
      // ignore - fallback to empty
    }

    // 2) add assistant placeholder and stream response
    const assistantId = String(Date.now()) + "-a";
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      text: "",
      loading: true,
      subject: detected.subject,
      concept: detected.concept,
      userMessage: userMessage,
    };

    setMessages((m) => [...m, assistantMsg]);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage, subject: detected.subject, concept: detected.concept }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let textSoFar = "";

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value);
          textSoFar += chunk;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, text: textSoFar } : msg))
          );
          scrollToBottom();
        }
      }

      // finalize assistant message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, text: textSoFar, loading: false, showSave: !!(detected.subject && detected.concept) }
            : msg
        )
      );
    } catch (err) {
      setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? { ...msg, text: "[Error]", loading: false } : msg)));
    }

    setSending(false);
  };

  const handleSave = async (msg: Message) => {
    setSaveError(null);
    setSavingProgress(true);

    const detected = {
      subject: msg.subject || "",
      concept: msg.concept || "",
    };

    if (!detected.subject || !detected.concept) {
      const fallback = await fetch("/api/detect-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg.userMessage ?? msg.text }),
      })
        .then((r) => (r.ok ? r.json() : { subject: "", concept: "" }))
        .catch(() => ({ subject: "", concept: "" }));

      detected.subject = detected.subject || fallback.subject || "";
      detected.concept = detected.concept || fallback.concept || "";
    }

    if (!detected.subject || !detected.concept) {
      console.error("Cannot save without subject and concept", msg);
      setSavingProgress(false);
      return;
    }

    const payload = {
      subject: detected.subject,
      concept: detected.concept,
      masteryLevel: "In Progress",
      overviewGist: msg.text,
      deepDiveGist: [],
      strongAreas: [],
      weakAreas: [],
      nextSteps: [],
      notes: "",
    };

    try {
      const r = await fetch("/api/save-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, saved: true } : m)));
        setSaveError(null);
      } else {
        const body = await r.text();
        if (body.includes("Server configuration error")) {
          await saveConceptLocally({
            subject: payload.subject,
            concept: payload.concept,
            masteryLevel: payload.masteryLevel,
            overviewGist: payload.overviewGist,
            deepDiveGist: payload.deepDiveGist,
            strongAreas: payload.strongAreas,
            weakAreas: payload.weakAreas,
            nextSteps: payload.nextSteps,
            notes: payload.notes,
            lastUpdated: new Date().toISOString(),
          });
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, saved: true } : m)));
          setSaveError("Saved locally because server configuration is missing.");
        } else {
          console.error("save failed", r.status, body);
          setSaveError(`Save failed: ${r.status} ${body}`);
        }
      }
    } catch (e) {
      console.error(e);
      setSaveError(String(e));
    } finally {
      setSavingProgress(false);
    }
  };

  const saveLatestProgress = async () => {
    setSaveError(null);
    if (savingProgress || messages.length === 0) return;
    const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    const latestUser = [...messages].reverse().find((m) => m.role === "user");

    const assistantToSave = latestAssistant && (latestAssistant.subject || latestAssistant.concept) ? latestAssistant : null;

    if (assistantToSave) {
      await handleSave(assistantToSave);
      return;
    }

    if (!latestUser) return;

    const detected = await fetch("/api/detect-concept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: latestUser.text }),
    })
      .then((r) => (r.ok ? r.json() : { subject: "", concept: "" }))
      .catch(() => ({ subject: "", concept: "" }));

    if (!detected.subject || !detected.concept) return;

    const payload = {
      subject: detected.subject,
      concept: detected.concept,
      masteryLevel: "In Progress",
      overviewGist: latestAssistant?.text || latestUser.text,
      deepDiveGist: [],
      strongAreas: [],
      weakAreas: [],
      nextSteps: [],
      notes: "",
    };

    setSavingProgress(true);
    try {
      const r = await fetch("/api/save-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        if (latestAssistant) {
          setMessages((prev) => prev.map((m) => (m.id === latestAssistant.id ? { ...m, saved: true } : m)));
        }
        setSaveError(null);
      } else {
        const body = await r.text();
        if (body.includes("Server configuration error")) {
          await saveConceptLocally({
            subject: payload.subject,
            concept: payload.concept,
            masteryLevel: payload.masteryLevel,
            overviewGist: payload.overviewGist,
            deepDiveGist: payload.deepDiveGist,
            strongAreas: payload.strongAreas,
            weakAreas: payload.weakAreas,
            nextSteps: payload.nextSteps,
            notes: payload.notes,
            lastUpdated: new Date().toISOString(),
          });
          if (latestAssistant) {
            setMessages((prev) => prev.map((m) => (m.id === latestAssistant.id ? { ...m, saved: true } : m)));
          }
          setSaveError("Saved locally because server configuration is missing.");
        } else {
          console.error("save failed", r.status, body);
          setSaveError(`Save failed: ${r.status} ${body}`);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProgress(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1020] text-gray-100 flex flex-col">
      <header className="p-4 border-b border-black/20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Study Agent</h1>
          <nav className="flex gap-4">
            <Link href="/" className="text-sm px-3 py-1 rounded hover:bg-white/5">Chat</Link>
            <Link href="/dashboard" className="text-sm px-3 py-1 rounded bg-white/5">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Study Chat</h2>
              <p className="text-sm text-gray-400">Save your latest AI explanation to the dashboard anytime.</p>
            </div>
            <button
              className="text-sm px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-60"
              onClick={saveLatestProgress}
              disabled={savingProgress || messages.length === 0}
            >
              {savingProgress ? "Saving..." : "Save latest progress"}
            </button>
          </div>

          <div className="space-y-4">
            {saveError && (
              <div className="rounded-md bg-red-900/80 border border-red-700 p-3 text-sm text-red-100">
                {saveError}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`rounded-lg p-3 max-w-[80%] break-words ${
                    m.role === "user"
                      ? "bg-[#0f1724] text-white shadow-md border border-blue-800"
                      : "bg-[#0b1220] text-gray-200 shadow-inner border"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {m.role === "assistant" && !m.loading && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="text-sm px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-60"
                        onClick={() => handleSave(m)}
                        disabled={m.saved || savingProgress}
                      >
                        {m.saved ? "Saved" : "Save progress"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-4 border-t border-black/20 bg-gradient-to-t from-black/30"
      >
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            className="flex-1 rounded-md px-3 py-2 bg-[#0b1220] border border-black/30 focus:outline-none"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="ml-2 px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-600 disabled:opacity-60"
            disabled={sending}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}


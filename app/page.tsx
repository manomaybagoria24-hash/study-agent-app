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
};

const HISTORY_KEY = "study-agent-app:chat-history";

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
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
    if (!msg.showSave) return;
    // Attempt a simple parse: send the assistant text as overview and set defaults
    const detected = await fetch("/api/detect-concept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg.text }),
    })
      .then((r) => (r.ok ? r.json() : { subject: "", concept: "" }))
      .catch(() => ({ subject: "", concept: "" }));

    const payload = {
      subject: detected.subject || "",
      concept: detected.concept || "",
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
      } else {
        console.error("save failed");
      }
    } catch (e) {
      console.error(e);
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
          <div className="space-y-4">
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

                  {m.role === "assistant" && m.showSave && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="text-sm px-3 py-1 rounded bg-blue-700 hover:bg-blue-600"
                        onClick={() => handleSave(m)}
                        disabled={m.saved}
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


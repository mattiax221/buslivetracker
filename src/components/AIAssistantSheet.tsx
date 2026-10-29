"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Bot, AlertTriangle, Compass, CheckCircle2 } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
}

interface AIAssistantSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLine?: (line: string) => void;
}

const SUGGESTIONS = [
  "C'è sciopero oggi?",
  "Come vado all'Allianz Stadium?",
  "Linee per il Politecnico",
  "Porta Nuova a Porta Susa",
];

export default function AIAssistantSheet({
  isOpen,
  onClose,
  onSelectLine,
}: AIAssistantSheetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Ciao! Sono il tuo assistente di viaggio per i trasporti di Torino. Chiedimi come raggiungere una destinazione, se ci sono scioperi o dettagli su una linea specifica.",
      time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text,
      time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        sender: "bot",
        text: data.reply || "Mi dispiace, si è verificato un errore temporaneo.",
        time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "bot",
          text: "Impossibile contattare l'assistente. Riprova tra poco.",
          time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden pb-safe animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-gray-900 tracking-tight leading-tight">
                  Assistente GTT
                </h2>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                  Free AI
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Informazioni su linee, percorsi e avvisi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 active:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="p-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {SUGGESTIONS.map((sug) => (
            <button
              key={sug}
              onClick={() => handleSend(sug)}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-gray-200 hover:border-blue-400 text-gray-700 active:bg-blue-50 shrink-0 shadow-2xs transition-all"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                  m.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-xs"
                    : "bg-gray-100 text-gray-900 rounded-bl-xs whitespace-pre-line"
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">
                {m.time}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl w-fit">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-gray-400 ml-1">L&apos;assistente sta scrivendo...</span>
            </div>
          )}
        </div>

        {/* Input form */}
        <div className="p-3 border-t border-gray-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Fai una domanda sui trasporti..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


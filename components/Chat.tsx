"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import NyanScene, { CatMode } from "./NyanScene";
import { NyanFace } from "./NyanSprite";
import { NyanMusic } from "../lib/nyanMusic";
import { hasSwears } from "../lib/swears";

// Po tylu milisekundach bez pisania kot zaczyna robić salta
const PAUSE_AFTER = 1200;

function messageText(message: UIMessage) {
  return message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
}

export default function Chat() {
  // useChat wysyła całą historię rozmowy do /api/chat i odbiera odpowiedź strumieniowo
  const { messages, sendMessage, status, error, clearError, regenerate } = useChat();
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  // Muzyka jest domyślnie włączona; wyłączenie zapamiętujemy, więc sama już nie wraca
  const [soundOn, setSoundOn] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const musicRef = useRef<NyanMusic | null>(null);

  const busy = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const waitingForText =
    busy && (lastMessage?.role !== "assistant" || messageText(lastMessage) === "");

  let mode: CatMode = "idle";
  if (busy) mode = "thinking";
  else if (hasSwears(input)) mode = "angry";
  else if (input.trim()) mode = typing ? "typing" : "paused";

  // Odczyt zapamiętanego wyłączenia muzyki
  useEffect(() => {
    try {
      if (localStorage.getItem("nyan-sound") === "off") setSoundOn(false);
    } catch {}
  }, []);

  // Muzyka gra tylko w trakcie pisania
  useEffect(() => {
    musicRef.current ??= new NyanMusic();
    if (mode === "typing" && soundOn) musicRef.current.start();
    else musicRef.current.stop();
  }, [mode, soundOn]);

  // Muzyka milknie, gdy karta przeglądarki jest w tle albo strona się zamyka
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) musicRef.current?.stop();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      musicRef.current?.stop();
    };
  }, []);

  // Przewijanie rozmowy na dół przy nowych wiadomościach i kolejnych fragmentach odpowiedzi
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, status, error]);

  // Pole wiadomości rośnie razem z tekstem
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    if (input) el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try {
      if (next) localStorage.removeItem("nyan-sound");
      else localStorage.setItem("nyan-sound", "off");
    } catch {}
  }

  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  // Wyjście: serwer usuwa cookie sesji, a strona wraca do ekranu hasła
  async function logout() {
    setLeaving(true);
    musicRef.current?.stop();
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.refresh();
    }
  }

  function onChange(value: string) {
    setInput(value);
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), PAUSE_AFTER);
  }

  function send(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    clearError();
    sendMessage({ text });
    setInput("");
    setTyping(false);
    clearTimeout(typingTimer.current);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) send(e);
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="title title--small">Nyan Problem Solver</span>
        <div className="topbar__actions">
          <button
            type="button"
            className="sound"
            onClick={toggleSound}
            aria-pressed={soundOn}
            title={soundOn ? "Wyłącz muzykę" : "Włącz muzykę"}
          >
            {soundOn ? "🔊 Muzyka" : "🔇 Muzyka"}
          </button>
          <button type="button" className="sound" onClick={logout} disabled={leaving}>
            🚪 Wyjdź
          </button>
        </div>
      </header>

      {/* Pas z kotem nad czatem – animacje nie wychodzą poza niego */}
      <NyanScene mode={mode} />

      <main className="chat">
        <div className="messages" ref={listRef}>
          {messages.length === 0 ? (
            <div className="empty">
              <h1 className="title">Nyan Problem Solver</h1>
              <p>W czym mogę dziś pomóc?</p>
            </div>
          ) : (
            messages.map((m) => {
              const text = messageText(m);
              if (m.role === "user") {
                return (
                  <div key={m.id} className="msg msg--user">
                    {text}
                  </div>
                );
              }
              if (!text) return null;
              return (
                <div key={m.id} className="msg msg--assistant">
                  <div className="avatar"><NyanFace /></div>
                  <div>{text}</div>
                </div>
              );
            })
          )}

          {waitingForText && (
            <div className="msg msg--assistant" aria-label="Chatbot myśli">
              <div className="avatar"><NyanFace /></div>
              <div className="dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          {error && (
            <div className="chat-error" role="alert">
              <p>{error.message || "Coś poszło nie tak. Spróbuj ponownie."}</p>
              <div className="chat-error__actions">
                <button type="button" onClick={() => regenerate()}>
                  Spróbuj ponownie
                </button>
                <button type="button" onClick={clearError}>
                  Zamknij
                </button>
              </div>
            </div>
          )}
        </div>

        <form className="composer" onSubmit={send}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Napisz wiadomość..."
            aria-label="Wiadomość"
          />
          <button type="submit" className="send" disabled={!input.trim() || busy}>
            {busy ? "Czekaj…" : "Wyślij"}
          </button>
        </form>
        <p className="hint">Enter – wyślij · Shift+Enter – nowa linia</p>
      </main>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import NyanSprite from "./NyanSprite";

// Po tylu milisekundach bez pisania kot chowa głowę
const PEEK_FOR = 1200;

export default function Login({ blocked }: { blocked: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [wrong, setWrong] = useState(0); // licznik błędów – każdy pokazuje dymek od nowa
  const [message, setMessage] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function onChange(value: string) {
    setPassword(value);
    setWrong(0);
    setMessage(null);
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), PEEK_FOR);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (blocked || sending) return;
    if (!password) {
      setMessage("Wpisz hasło.");
      return;
    }

    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setWrong((n) => n + 1);
        setPassword("");
      } else {
        setMessage(data.error ?? "Coś poszło nie tak. Spróbuj ponownie.");
      }
    } catch {
      setMessage("Brak połączenia z serwerem. Spróbuj ponownie.");
    }
    setSending(false);
  }

  const catClass = ["login-cat", typing && "login-cat--peek", wrong > 0 && "login-cat--wrong"]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="space" aria-hidden="true">
        <div className="stars stars--1" />
        <div className="stars stars--2" />
        <div className="stars stars--3" />
      </div>

      <main className="login">
        <div className="login-stage" aria-hidden="true">
          <div className={catClass}>
            {wrong > 0 && (
              <div key={wrong} className="bubble">
                Hey that&apos;s wrong! Try again
              </div>
            )}
            <NyanSprite />
          </div>
          <div className="clouds">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <h1 className="title login-title">Nyan Problem Solver</h1>

        <form className="login-form" onSubmit={submit}>
          <label htmlFor="password" className="login-label">
            Wpisz hasło
          </label>
          <div className="composer">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Hasło warsztatowe"
              autoComplete="current-password"
              autoFocus
              disabled={blocked}
            />
            <button type="submit" className="send" disabled={blocked || sending || !password}>
              {sending ? "Czekaj…" : "Wejdź"}
            </button>
          </div>
          {wrong > 0 && <p className="sr-only" role="alert">Nieprawidłowe hasło. Spróbuj ponownie.</p>}
          {(message || blocked) && (
            <p className="login-message" role="alert">
              {blocked
                ? "Logowanie jest zablokowane: serwer nie ma ustawionych CHAT_PASSWORD i SESSION_SECRET."
                : message}
            </p>
          )}
        </form>
      </main>
    </>
  );
}

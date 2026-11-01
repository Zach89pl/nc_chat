"use client";

import { useEffect, useRef } from "react";
import NyanSprite from "./NyanSprite";

export type CatMode = "idle" | "typing" | "paused" | "thinking" | "angry";

const LABELS: Record<CatMode, string> = {
  idle: "Awaiting Your Command",
  typing: "Nyan Nyan",
  paused: "huh?",
  thinking: "Hard nut to crack",
  angry: "😡🤬💢",
};

// Rozmiary kafelków gwiazd (muszą zgadzać się z globals.css)
const STAR_TILES = [220, 330, 480];

const STAR_SPEED: Record<CatMode, number> = {
  idle: 25,
  typing: 650,
  paused: 80,
  thinking: 60,
  angry: 30,
};

export default function NyanScene({ mode }: { mode: CatMode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<(HTMLDivElement | null)[]>([]);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Ruch kota i gwiazd liczony w każdej klatce, żeby zmiany były płynne
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let x = 0;
    let y = 0;
    let tilt = 0;
    let speed = 20;
    let offset = 0;
    let prevMode: CatMode = "idle";

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const m = modeRef.current;
      const flying = m === "typing" && !reduce;
      if (m === "typing" && prevMode === "idle") t = 0;
      prevMode = m;

      speed += ((reduce ? 0 : STAR_SPEED[m]) - speed) * Math.min(1, dt * 3);
      offset += speed * dt;

      let tx = x;
      let ty = y;
      if (flying) {
        // Kot lata tylko w obrębie pasa nad czatem
        t += dt;
        const w = stageRef.current?.clientWidth ?? 0;
        const h = stageRef.current?.clientHeight ?? 0;
        const ax = Math.max(0, w / 2 - 100);
        const ay = Math.max(0, (h - 150) / 2 - 6);
        tx = Math.sin(t * 0.7) * ax;
        ty = Math.sin(t * 1.4) * ay;
      } else if (m === "idle") {
        tx = 0;
        ty = 0;
      }
      const k = Math.min(1, dt * (flying ? 3 : 2.5));
      const py = y;
      x += (tx - x) * k;
      y += (ty - y) * k;

      // Pochylenie zależne od prędkości, wygładzone
      const targetTilt = dt > 0 ? Math.max(-15, Math.min(15, ((y - py) / dt) * 0.06)) : 0;
      tilt += (targetTilt - tilt) * Math.min(1, dt * 6);

      if (moveRef.current) moveRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (tiltRef.current) tiltRef.current.style.transform = `rotate(${tilt}deg)`;
      layersRef.current.forEach((el, i) => {
        if (!el) return;
        const shift = (offset * (i + 1) * 0.5) % STAR_TILES[i];
        el.style.transform = `translate3d(${-shift}px, 0, 0)`;
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div className="space" aria-hidden="true">
        {STAR_TILES.map((_, i) => (
          <div
            key={i}
            className={`stars stars--${i + 1}`}
            ref={(el) => {
              layersRef.current[i] = el;
            }}
          />
        ))}
      </div>

      <div className="stage" ref={stageRef}>
        <div className={`nyan nyan--${mode}`} aria-hidden="true">
          <div className="nyan__move" ref={moveRef}>
            <div key={mode} className="bubble">
              {LABELS[mode]}
            </div>
            {mode === "angry" && (
              <div className="angry-emojis">
                <span>😡</span>
                <span>🤬</span>
                <span>💢</span>
                <span>😠</span>
              </div>
            )}
            <div className="nyan__tilt" ref={tiltRef}>
              <NyanSprite />
            </div>
          </div>
        </div>

        {mode === "angry" && (
          <div className="no-swearing" role="alert">
            NO SWEARING!!!
          </div>
        )}
      </div>
    </>
  );
}

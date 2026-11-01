import { NextResponse } from "next/server";
import { sessionCookie } from "../../../lib/session";

// Wyjście: usuwa cookie sesji z przeglądarki
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie("", 0));
  return res;
}

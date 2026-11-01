import { NextResponse, type NextRequest } from "next/server";
import { checkLoginLimit, clearLoginFailures, clientKey, recordLoginFailure } from "../../../lib/loginRateLimit";
import {
  authConfigured,
  createSessionToken,
  passwordMatches,
  sessionCookie,
  SESSION_TTL_SECONDS,
} from "../../../lib/session";

function error(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function POST(req: NextRequest) {
  // Bez konfiguracji nikt nie wejdzie
  if (!authConfigured()) {
    return error(
      "Logowanie jest zablokowane: serwer nie ma ustawionych CHAT_PASSWORD i SESSION_SECRET.",
      503
    );
  }

  const client = clientKey(req.headers);
  const limit = checkLoginLimit(client);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfter / 60));
    return error(`Za dużo nieudanych prób. Spróbuj ponownie za ${minutes} min.`, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let password = "";
  try {
    const body = await req.json();
    if (typeof body?.password === "string") password = body.password;
  } catch {}

  if (!password) return error("Wpisz hasło.", 400);

  // Hasło sprawdzane wyłącznie tutaj, na serwerze
  if (password.length > 256 || !passwordMatches(password)) {
    recordLoginFailure(client);
    await new Promise((resolve) => setTimeout(resolve, 500)); // spowalnia zgadywanie
    return error("Nieprawidłowe hasło.", 401);
  }

  clearLoginFailures(client);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(createSessionToken(), SESSION_TTL_SECONDS));
  return res;
}

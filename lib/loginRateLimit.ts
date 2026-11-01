// Ograniczenie prób zgadywania hasła.
//
// UWAGA: liczniki są w pamięci jednego procesu serwera. Lokalnie i na jednym
// serwerze to działa, ale na hostingu z wieloma instancjami (np. Vercel)
// każda instancja liczy osobno, a restart zeruje liczniki. To tylko dodatkowe
// spowolnienie, nie globalna ochrona. Globalny limit wymaga wspólnego magazynu
// (np. Redis) albo reguły rate limit w zaporze hostingu.

const WINDOW_MS = 15 * 60 * 1000; // 15 minut
const MAX_FAILS_PER_CLIENT = 5;
const MAX_FAILS_TOTAL = 100; // na wypadek zgadywania z wielu adresów naraz

type Entry = { fails: number; resetAt: number };

const perClient = new Map<string, Entry>();
let total: Entry = { fails: 0, resetAt: 0 };

function current(entry: Entry | undefined, now: number) {
  return entry && entry.resetAt > now ? entry : undefined;
}

export function checkLoginLimit(client: string) {
  const now = Date.now();
  const mine = current(perClient.get(client), now);
  const all = current(total, now);

  if (mine && mine.fails >= MAX_FAILS_PER_CLIENT) {
    return { allowed: false, retryAfter: Math.ceil((mine.resetAt - now) / 1000) };
  }
  if (all && all.fails >= MAX_FAILS_TOTAL) {
    return { allowed: false, retryAfter: Math.ceil((all.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

export function recordLoginFailure(client: string) {
  const now = Date.now();

  const mine = current(perClient.get(client), now) ?? { fails: 0, resetAt: now + WINDOW_MS };
  mine.fails += 1;
  perClient.set(client, mine);

  if (!current(total, now)) total = { fails: 0, resetAt: now + WINDOW_MS };
  total.fails += 1;

  // Sprzątanie starych wpisów, żeby mapa nie rosła bez końca
  if (perClient.size > 5000) {
    for (const [key, entry] of perClient) {
      if (entry.resetAt <= now) perClient.delete(key);
    }
  }
}

export function clearLoginFailures(client: string) {
  perClient.delete(client);
}

// Adres klienta. Na hostingu (np. Vercel) nagłówek ustawia platforma.
export function clientKey(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

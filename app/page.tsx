import { cookies } from "next/headers";
import Chat from "../components/Chat";
import Login from "../components/Login";
import { authConfigured, SESSION_COOKIE, verifySessionToken } from "../lib/session";

// Sesja sprawdzana na serwerze przy każdym wejściu na stronę
export default async function Page() {
  const cookieStore = await cookies();
  if (verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)) {
    return <Chat />;
  }
  return <Login blocked={!authConfigured()} />;
}

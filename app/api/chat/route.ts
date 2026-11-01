import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { NextRequest } from "next/server";
import {
  APICallError,
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { SESSION_COOKIE, verifySessionToken } from "../../../lib/session";

// Maksymalny czas odpowiedzi w sekundach
export const maxDuration = 30;

function textResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// Czytelny komunikat zamiast technicznego błędu
function describeError(error: unknown) {
  if (APICallError.isInstance(error)) {
    switch (error.statusCode) {
      case 401:
        return "OpenRouter odrzucił klucz. Sprawdź OPENROUTER_API_KEY w pliku .env.local.";
      case 402:
        return "Brak środków na koncie OpenRouter. Doładuj konto albo wybierz darmowy model.";
      case 400:
      case 404:
        return "OpenRouter nie rozpoznał modelu. Sprawdź OPENROUTER_MODEL w pliku .env.local.";
      case 429:
        return "Za dużo zapytań naraz. Odczekaj chwilę i spróbuj ponownie.";
    }
  }
  return "Nie udało się pobrać odpowiedzi od modelu. Spróbuj ponownie za chwilę.";
}

export async function POST(req: NextRequest) {
  // Najpierw sesja – bez niej model nie jest wywoływany
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    return textResponse("Sesja wygasła albo nie jesteś zalogowany. Odśwież stronę i wpisz hasło.", 401);
  }

  // Klucz i model są czytane tylko na serwerze
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const modelId = process.env.OPENROUTER_MODEL?.trim();

  const missing = [!apiKey && "OPENROUTER_API_KEY", !modelId && "OPENROUTER_MODEL"].filter(Boolean);
  if (missing.length > 0) {
    return textResponse(
      `Chatbot nie jest jeszcze skonfigurowany. Uzupełnij w pliku .env.local: ${missing.join(", ")}. Potem uruchom serwer ponownie.`,
      500
    );
  }

  let messages: UIMessage[];
  try {
    ({ messages } = await req.json());
  } catch {
    return textResponse("Nieprawidłowe zapytanie.", 400);
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return textResponse("Brak wiadomości do wysłania.", 400);
  }

  // Blokada pustej wiadomości także po stronie serwera
  const last = messages[messages.length - 1];
  const lastText = last?.parts
    ?.map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
  if (last?.role !== "user" || !lastText) {
    return textResponse("Wiadomość nie może być pusta.", 400);
  }

  const openrouter = createOpenRouter({ apiKey });

  // Cała historia rozmowy trafia do modelu, więc pamięta poprzednie wiadomości
  const result = streamText({
    model: openrouter(modelId!),
    // Domyślnym językiem odpowiedzi jest zawsze polski
    instructions:
      "Zawsze odpowiadaj po polsku, niezależnie od języka pytania. Inny język wybierz tylko wtedy, gdy użytkownik wyraźnie o to poprosi.",
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        console.error("Błąd czatu:", error);
        return describeError(error);
      },
    }),
  });
}

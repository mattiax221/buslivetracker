import { NextRequest, NextResponse } from "next/server";
import {
  isKvConfigured,
  kvListPush,
  kvListRange,
  kvRateLimit,
} from "../../../lib/kv";
import type { Suggestion, SuggestionCategory } from "../../../lib/suggestions";

const LIST_KEY = "gtt:suggestions";
const MAX_TEXT = 500;
const MAX_RETURN = 40;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET() {
  try {
    const rows = await kvListRange(LIST_KEY, 0, MAX_RETURN - 1);
    const suggestions: Suggestion[] = [];
    for (const row of rows) {
      try {
        suggestions.push(JSON.parse(row) as Suggestion);
      } catch {
        /* skip corrupt */
      }
    }
    return NextResponse.json({
      suggestions,
      persisted: isKvConfigured(),
    });
  } catch (err) {
    console.error("suggestions GET", err);
    return NextResponse.json(
      { error: "Impossibile caricare i suggerimenti" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const allowed = await kvRateLimit(`suggest:${ip}`, 5, 60 * 60);
    if (!allowed) {
      return NextResponse.json(
        { error: "Troppi suggerimenti. Riprova tra un’ora." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as {
      text?: string;
      category?: string;
    };
    const text = (body.text || "").trim().replace(/\s+/g, " ");
    if (text.length < 8) {
      return NextResponse.json(
        { error: "Scrivi almeno qualche parola (min. 8 caratteri)." },
        { status: 400 }
      );
    }
    if (text.length > MAX_TEXT) {
      return NextResponse.json(
        { error: `Massimo ${MAX_TEXT} caratteri.` },
        { status: 400 }
      );
    }

    const category: SuggestionCategory =
      body.category === "bug" || body.category === "idea" || body.category === "altro"
        ? body.category
        : "idea";

    const suggestion: Suggestion = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      category,
      createdAt: new Date().toISOString(),
    };

    await kvListPush(LIST_KEY, JSON.stringify(suggestion), 100);

    return NextResponse.json({
      ok: true,
      suggestion,
      persisted: isKvConfigured(),
    });
  } catch (err) {
    console.error("suggestions POST", err);
    return NextResponse.json(
      { error: "Invio non riuscito. Riprova." },
      { status: 500 }
    );
  }
}

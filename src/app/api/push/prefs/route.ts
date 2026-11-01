import { NextRequest, NextResponse } from "next/server";
import { isPushConfigured, saveSubscription } from "../../../../lib/push";
import { kvRateLimit } from "../../../../lib/kv";
import { saveAlertPref } from "../../../../lib/alertPrefs";

export async function POST(req: NextRequest) {
  try {
    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: "Push non configurato." },
        { status: 503 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ok = await kvRateLimit(`push-prefs:${ip}`, 40, 3600);
    if (!ok) {
      return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
    }

    const body = (await req.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
      enabled?: boolean;
      lines?: string[];
      stops?: { code?: string; name?: string }[];
    };

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json(
        { error: "Subscription non valida." },
        { status: 400 }
      );
    }

    await saveSubscription({
      endpoint: body.endpoint,
      keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    });

    await saveAlertPref({
      endpoint: body.endpoint,
      keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
      enabled: !!body.enabled,
      lines: (body.lines || []).map(String).slice(0, 5),
      stops: (body.stops || [])
        .filter((s) => s?.code)
        .map((s) => ({ code: String(s.code), name: String(s.name || s.code) }))
        .slice(0, 3),
    });

    return NextResponse.json({ ok: true, enabled: !!body.enabled });
  } catch (err) {
    console.error("push prefs", err);
    return NextResponse.json({ error: "Salvataggio preferenze fallito." }, { status: 500 });
  }
}

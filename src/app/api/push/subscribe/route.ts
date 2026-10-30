import { NextRequest, NextResponse } from "next/server";
import { isPushConfigured, saveSubscription } from "../../../../lib/push";
import { kvRateLimit } from "../../../../lib/kv";

export async function POST(req: NextRequest) {
  try {
    if (!isPushConfigured()) {
      return NextResponse.json(
        {
          error:
            "Notifiche non configurate sul server (mancano le chiavi VAPID).",
        },
        { status: 503 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ok = await kvRateLimit(`push-sub:${ip}`, 30, 3600);
    if (!ok) {
      return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
    }

    const body = (await req.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push subscribe", err);
    return NextResponse.json(
      { error: "Registrazione dispositivo non riuscita." },
      { status: 500 }
    );
  }
}

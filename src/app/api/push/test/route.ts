import { NextRequest, NextResponse } from "next/server";
import {
  findSubscription,
  isPushConfigured,
  sendPushToSubscription,
} from "../../../../lib/push";
import { kvRateLimit } from "../../../../lib/kv";

export async function POST(req: NextRequest) {
  try {
    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: "Notifiche non configurate (VAPID)." },
        { status: 503 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ok = await kvRateLimit(`push-test:${ip}`, 10, 3600);
    if (!ok) {
      return NextResponse.json(
        { error: "Troppe prove. Riprova più tardi." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json(
        { error: "Serve l’endpoint della subscription." },
        { status: 400 }
      );
    }

    const sub = await findSubscription(body.endpoint);
    if (!sub) {
      return NextResponse.json(
        {
          error:
            "Dispositivo non registrato. Tocca prima «Attiva notifiche».",
        },
        { status: 404 }
      );
    }

    await sendPushToSubscription(sub, {
      title: "GTT Live",
      body: "Notifica di prova: se la vedi, le push funzionano anche a schermo spento.",
      url: "/aggiornamenti",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push test", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Invio prova non riuscito.",
      },
      { status: 500 }
    );
  }
}

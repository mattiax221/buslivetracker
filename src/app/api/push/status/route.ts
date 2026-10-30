import { NextResponse } from "next/server";
import { isPushConfigured } from "../../../../lib/push";
import { isKvConfigured } from "../../../../lib/kv";

export async function GET() {
  return NextResponse.json({
    pushConfigured: isPushConfigured(),
    kvConfigured: isKvConfigured(),
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
  });
}

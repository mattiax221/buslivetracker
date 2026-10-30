#!/usr/bin/env node
/**
 * Generate VAPID keys for Web Push.
 * Usage: node scripts/generate-vapid.js
 * Then set on Vercel / .env.local:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_SUBJECT=mailto:you@example.com
 */
const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();
console.log("\nAdd these to .env.local and Vercel project env:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:you@example.com`);
console.log(
  "\nAlso set KV_REST_API_URL and KV_REST_API_TOKEN (Upstash / Vercel KV) for persistent suggestions & subscriptions.\n"
);

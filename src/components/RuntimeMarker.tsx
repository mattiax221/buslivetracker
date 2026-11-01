import { connection } from "next/server";

/** Tells Next.js that this route's title depends on the URL. */
export default async function RuntimeMarker() {
  await connection();
  return null;
}

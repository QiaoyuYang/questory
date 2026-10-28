import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";

/**
 * Who a call counts against for the per-player daily limit: the IP address when the host
 * passes one on (Vercel always does, and overwrites any the browser sends), else the
 * player's cookie. Clearing cookies can't reset an IP's count. Only a keyed hash that
 * changes every day is stored, so the usage table holds no addresses.
 */
export async function visitorKey(day: string, playerId: string, secret: string): Promise<string> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  return createHmac("sha256", secret || "questory")
    .update(`${day}:${ip || playerId}`)
    .digest("hex")
    .slice(0, 16);
}

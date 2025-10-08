import { db } from "@server/db";
import { ghlTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

let refreshing: Promise<string> | null = null;

/**
 * Always fetch the latest token row from DB.
 */
async function getTokenRow() {
  const rows = await db
    .select()
    .from(ghlTokens)
    .where(eq(ghlTokens.userType, "Location"))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Refresh the access token using the refresh token.
 */
export async function refreshAccessToken() {
  const row = await getTokenRow();
  if (!row?.refreshToken) {
    throw new Error("No refresh token found. Please re-authorize GHL.");
  }

  console.log("🔑 Using client_id:", process.env.GHL_CLIENT_ID);
  console.log(
    "🔑 Using client_secret (first 6 chars):",
    process.env.GHL_CLIENT_SECRET?.slice(0, 6),
  );

  const res = await fetch("https://services.leadconnectorhq.com/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GHL_CLIENT_ID!,
      client_secret: process.env.GHL_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: row.refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("❌ GHL refresh failed:", res.status, res.statusText, text);

    if (res.status === 400 || res.status === 401) {
      throw new Error("Refresh token invalid. Please re-authorize GHL.");
    }

    throw new Error(`Failed to refresh token: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // new expiry as a JS Date
  const newExpiry = new Date(Date.now() + data.expires_in * 1000);

  // persist new tokens in DB
  await db
    .update(ghlTokens)
    .set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      updatedAt: new Date(),
      expiresAt: newExpiry,
    })
    .where(eq(ghlTokens.userType, "Location"));

  return data.access_token;
}

/**
 * Get a valid access token for API calls.
 * - Loads from DB
 * - Refreshes if expired or missing
 */
export async function getAccessToken() {
  let row = await getTokenRow();
  if (!row)
    throw new Error("No GHL tokens found in DB. Please seed initial tokens.");

  const isExpired =
    !row.expiresAt || Date.now() > new Date(row.expiresAt).getTime() - 60_000;

  if (isExpired) {
    if (!refreshing) {
      refreshing = refreshAccessToken().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  return row.accessToken;
}

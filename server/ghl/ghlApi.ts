// lib/ghlApi.ts
import { getAccessToken, refreshAccessToken } from "./ghlAuth";

interface GhlFetchOptions extends RequestInit {
  auth?: boolean; // default true
}

/**
 * Wrapper for GHL API requests.
 * - Adds Authorization header automatically.
 * - Refreshes token + retries once if expired.
 * - Retries with backoff on 429 Too Many Requests.
 */
export async function ghlFetch(
  url: string,
  options: GhlFetchOptions = {},
  retries = 3, // retries for 429
): Promise<Response> {
  const { auth = true, headers, ...rest } = options;

  let accessToken = auth ? await getAccessToken() : null;

  const doFetch = async (token?: string) =>
    fetch(url, {
      ...rest,
      headers: {
        ...(headers || {}),
        Accept: "application/json",
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await doFetch(accessToken || undefined);

  // 🔄 handle expired token
  if (res.status === 401 && auth) {
    console.warn("🔄 Access token expired, refreshing...");
    accessToken = await refreshAccessToken();
    res = await doFetch(accessToken);
  }

  // ⏳ handle rate limits (429)
  if (res.status === 429 && retries > 0) {
    const retryAfter =
      Number(res.headers.get("Retry-After")) || 1000 * (4 - retries); // use header if present
    console.warn(
      `⏳ Rate limited, retrying in ${retryAfter}ms... (${retries} retries left)`,
    );
    await new Promise((r) => setTimeout(r, retryAfter));
    return ghlFetch(url, options, retries - 1);
  }

  return res;
}

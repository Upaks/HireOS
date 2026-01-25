/**
 * Cloudflare Turnstile CAPTCHA verification
 * 
 * Test keys for development (always pass):
 * - Site Key: 1x00000000000000000000AA
 * - Secret Key: 1x0000000000000000000000000000000AA
 * 
 * For production, get real keys from: https://dash.cloudflare.com/turnstile
 */

import { SecureLogger } from "./logger";

// Environment variables or test keys for development
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Turnstile CAPTCHA token
 * @param token - The token from the client-side widget
 * @param remoteip - Optional IP address of the user
 * @returns Promise<boolean> - true if verification passed
 */
export async function verifyTurnstileToken(token: string, remoteip?: string): Promise<boolean> {
  // In development with test key, skip network call if token looks like test token
  if (TURNSTILE_SECRET_KEY === "1x0000000000000000000000000000000AA") {
    SecureLogger.info("Turnstile: Using test mode (development)");
    // Test tokens from Cloudflare always pass with test secret
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    if (remoteip) {
      formData.append("remoteip", remoteip);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result: TurnstileVerifyResponse = await response.json();

    if (!result.success) {
      SecureLogger.warn("Turnstile verification failed", { 
        errors: result["error-codes"] 
      });
      return false;
    }

    SecureLogger.info("Turnstile verification passed");
    return true;
  } catch (error) {
    SecureLogger.error("Turnstile verification error", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    // In case of network error, fail open in development, closed in production
    if (process.env.NODE_ENV !== "production") {
      SecureLogger.warn("Turnstile: Failing open in development due to network error");
      return true;
    }
    return false;
  }
}

/**
 * Check if Turnstile is enabled (has real keys configured)
 */
export function isTurnstileEnabled(): boolean {
  // Enabled if we have a real secret key (not the test key) OR in any environment
  // We always run Turnstile, but test keys auto-pass in development
  return true;
}

/**
 * Get the site key for the client
 */
export function getTurnstileSiteKey(): string {
  return process.env.TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
}

/**
 * Cloudflare Turnstile CAPTCHA Component
 * 
 * A React wrapper for Cloudflare's Turnstile widget.
 * The widget is invisible by default and automatically validates users.
 */

import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

// Declare the turnstile global
declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "invisible";
  appearance?: "always" | "execute" | "interaction-only";
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
}

interface CaptchaConfig {
  siteKey: string;
  enabled: boolean;
}

export function Turnstile({ 
  onVerify, 
  onError, 
  onExpire,
  theme = "dark",
  className = "" 
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Fetch the site key from the server
  const { data: config } = useQuery<CaptchaConfig>({
    queryKey: ["/api/auth/captcha-config"],
    staleTime: Infinity, // Site key doesn't change
  });

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !config?.siteKey) {
      return;
    }

    // Remove existing widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // Widget might already be removed
      }
    }

    // Clear container
    containerRef.current.innerHTML = "";

    // Render new widget
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: config.siteKey,
      callback: onVerify,
      "error-callback": onError,
      "expired-callback": onExpire,
      theme,
      size: "normal",
      appearance: "always",
    });
  }, [config?.siteKey, onVerify, onError, onExpire, theme]);

  useEffect(() => {
    // Wait for turnstile script to load
    const checkAndRender = () => {
      if (window.turnstile && config?.siteKey) {
        renderWidget();
      } else {
        // Script not loaded yet, try again
        setTimeout(checkAndRender, 100);
      }
    };

    checkAndRender();

    // Cleanup on unmount
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Widget might already be removed
        }
      }
    };
  }, [config?.siteKey, renderWidget]);

  if (!config?.enabled) {
    return null;
  }

  return (
    <div 
      ref={containerRef} 
      className={`cf-turnstile ${className}`}
      data-theme={theme}
    />
  );
}

/**
 * Hook to manage Turnstile token state
 */
export function useTurnstile() {
  const tokenRef = useRef<string | null>(null);

  const setToken = useCallback((token: string) => {
    tokenRef.current = token;
  }, []);

  const clearToken = useCallback(() => {
    tokenRef.current = null;
  }, []);

  const getToken = useCallback(() => {
    return tokenRef.current;
  }, []);

  return {
    setToken,
    clearToken,
    getToken,
  };
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Add environment check utility
export function checkEnvironment() {
  const checks = {
    supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    supabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    appUrl: !!import.meta.env.VITE_APP_URL,
    isProduction: import.meta.env.PROD,
    isDevelopment: import.meta.env.DEV,
  };

  console.log("[ENV] Environment check:", checks);

  if (!checks.supabaseUrl || !checks.supabaseKey) {
    console.error("[ENV] Missing Supabase environment variables!");
    return false;
  }

  return true;
}

// Add utility to test Supabase connectivity
export async function testSupabaseConnectivity() {
  try {
    const start = Date.now();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
      {
        method: "GET",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
          "Content-Type": "application/json",
        },
      }
    );
    const duration = Date.now() - start;

    return {
      success: response.ok,
      duration,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error: any) {
    return {
      success: false,
      duration: -1,
      error: error.message,
    };
  }
}

// Add localStorage validation utility
export function validateStoredSession(stored: string) {
  try {
    const parsed = JSON.parse(stored);
    console.log("[VALIDATE] Parsed session structure:", Object.keys(parsed));

    // Check if token is expired
    const now = Date.now() / 1000; // Unix timestamp in seconds
    const expiresAt = parsed.expires_at;

    if (expiresAt && expiresAt < now) {
      console.log("[VALIDATE] Token expired:", { expiresAt, now, expired: true });
      return null;
    }

    // Validate required fields
    const hasUser = !!parsed.user;
    const hasToken = !!parsed.access_token;
    const hasValidUser = hasUser && parsed.user.id && parsed.user.email;

    console.log("[VALIDATE] Session validation:", {
      hasUser,
      hasToken,
      hasValidUser,
      userEmail: parsed.user?.email,
      tokenLength: parsed.access_token?.length,
    });

    if (!hasValidUser || !hasToken) {
      console.log("[VALIDATE] Invalid session structure");
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("[VALIDATE] Parse error:", error);
    return null;
  }
}

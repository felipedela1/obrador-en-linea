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

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

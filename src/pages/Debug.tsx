import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw } from "lucide-react";
import { testSupabaseConnectivity } from "@/lib/utils";

export default function Debug() {
  const [info, setInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const collectInfo = async () => {
    setLoading(true);
    const result: any = {
      timestamp: new Date().toISOString(),
      environment: {
        isDev: import.meta.env.DEV,
        isProd: import.meta.env.PROD,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "NOT SET",
        hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        appUrl: import.meta.env.VITE_APP_URL || "NOT SET"
      },
      localStorage: {},
      supabase: {}
    };

    // Check localStorage
    try {
      const keys = Object.keys(localStorage);
      const authKeys = keys.filter(k => k.includes("auth") || k.includes("sb-"));
      result.localStorage.totalKeys = keys.length;
      result.localStorage.authKeys = authKeys;
      
      for (const key of authKeys) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            result.localStorage[key] = {
              exists: true,
              size: value.length,
              structure: Object.keys(parsed),
              hasCurrentSession: !!parsed.currentSession,
              hasSession: !!parsed.session,
              hasUser: !!(parsed.currentSession?.user || parsed.session?.user || parsed.user),
              hasAccessToken: !!(parsed.currentSession?.access_token || parsed.session?.access_token || parsed.access_token)
            };
          }
        } catch (e) {
          result.localStorage[key] = { error: e.message };
        }
      }
    } catch (e) {
      result.localStorage.error = e.message;
    }

    // Test Supabase
    try {
      // Test connectivity first
      const connectivity = await testSupabaseConnectivity();
      result.supabase.connectivity = connectivity;

      const start = Date.now();
      const { data, error } = await supabase.auth.getSession();
      const duration = Date.now() - start;
      
      result.supabase.getSession = {
        duration,
        success: !error,
        hasSession: !!data?.session,
        hasUser: !!data?.session?.user,
        error: error?.message
      };
    } catch (e) {
      result.supabase.getSession = {
        error: e.message,
        timeout: e.message.includes('Timeout')
      };
    }

    try {
      const start = Date.now();
      const { data, error } = await supabase.auth.refreshSession();
      const duration = Date.now() - start;
      
      result.supabase.refreshSession = {
        duration,
        success: !error,
        hasSession: !!data?.session,
        error: error?.message
      };
    } catch (e) {
      result.supabase.refreshSession = {
        error: e.message,
        timeout: e.message.includes('Timeout')
      };
    }

    setInfo(result);
    setLoading(false);
  };

  useEffect(() => {
    collectInfo();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
  };

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Debug Information</h1>
          <div className="flex gap-2">
            <Button onClick={collectInfo} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={copyToClipboard} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Debug Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-slate-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(info, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { debug, DebugRecord } from "@/lib/debug";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/models";

const formatTs = (ms: number) => new Date(ms).toLocaleTimeString();

const channelColors: Record<string, string> = {
  auth: "bg-blue-600",
  net: "bg-emerald-600",
  ui: "bg-amber-600",
  env: "bg-purple-600",
  other: "bg-slate-600",
};

export const DebugOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<DebugRecord[]>(() => debug.getAll());
  const [filter, setFilter] = useState<string>("");
  const [enabled, setEnabled] = useState<boolean>(debug.isEnabled());
  const [role, setRole] = useState<UserRole | null>(null);

  // Resolve current role (admin/customer/guest)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user;
        if (!u) { if (mounted) setRole(null); return; }
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", u.id)
          .maybeSingle();
        if (!mounted) return;
        if (error) { setRole(null); return; }
        setRole((data?.role as UserRole) || null);
      } catch {
        if (mounted) setRole(null);
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const isAdmin = role === "admin";

  useEffect(() => {
    const off = debug.on((rec) => {
      setRecords((prev) => [...prev.slice(-399), rec]);
    });
    return () => { off(); };
  }, []);

  useEffect(() => {
    // Reflect enabled from localStorage changes if any
    const onStorage = (e: StorageEvent) => {
      if (e.key === "obrador:debug:enabled") {
        setEnabled(debug.isEnabled());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // NEW: Force-enable when URL contains ?debug=1 even after SPA navigation
  const forcedByQuery = (() => {
    try { const p = new URLSearchParams(window.location.search); return p.get("debug") === "1"; } catch { return false; }
  })();
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get("debug") === "1") {
        debug.setEnabled(true);
        setEnabled(true);
        setOpen(true); // auto-open when forced
      }
    } catch {}
  }, []);

  // If not admin and not forced, make sure overlay is not visible even if previously enabled
  useEffect(() => {
    if (!isAdmin && !forcedByQuery && enabled) {
      debug.setEnabled(false);
      setEnabled(false);
      setOpen(false);
    }
  }, [isAdmin, forcedByQuery, enabled]);

  const visible = forcedByQuery || (enabled && isAdmin);
  const filtered = useMemo(() => {
    if (!filter) return records;
    const f = filter.toLowerCase();
    return records.filter((r) => r.channel.includes(f) || r.message.toLowerCase().includes(f));
  }, [records, filter]);

  if (!visible) return null;

  const runSelfTest = async () => {
    try {
      debug.log("env", "self-test:start", {
        ua: navigator.userAgent,
        online: navigator.onLine,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        tzOffsetMin: new Date().getTimezoneOffset(),
      });
      // localStorage
      let lsOK = false;
      try {
        localStorage.setItem("__dbg__", "1");
        lsOK = localStorage.getItem("__dbg__") === "1";
        localStorage.removeItem("__dbg__");
      } catch {}
      debug.log("env", "localStorage", { ok: lsOK });
      // sessionStorage
      let ssOK = false;
      try {
        sessionStorage.setItem("__dbg__", "1");
        ssOK = sessionStorage.getItem("__dbg__") === "1";
        sessionStorage.removeItem("__dbg__");
      } catch {}
      debug.log("env", "sessionStorage", { ok: ssOK });
      // cookies
      let ckOK = false;
      try {
        document.cookie = "__dbg__=1; path=/; max-age=300";
        ckOK = document.cookie.includes("__dbg__=1");
        document.cookie = "__dbg__=; Max-Age=0; path=/";
      } catch {}
      debug.log("env", "cookies", { ok: ckOK });
      // auth token presence (keys only)
      const keys = Object.keys(localStorage).filter(k => k.startsWith("sb-") && k.includes("-auth-token"));
      const custom = !!localStorage.getItem('obrador-auth');
      debug.log("auth", "local tokens keys", { keys, hasKeys: keys.length > 0, hasCustomKey: custom });
      debug.log("env", "self-test:end", {});
    } catch (e: any) {
      debug.log("env", "self-test:error", { message: e?.message }, "error");
    }
  };

  return (
    <div className="fixed z-[10000] bottom-4 right-4 select-text">
      {/* Toggle: only visible for admins */}
      {isAdmin && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-1 rounded-full text-white text-xs font-semibold shadow-lg bg-slate-800/90 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle debug overlay"
        >
          DBG
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="mt-2 w-[90vw] max-w-[560px] h-[50vh] bg-white/90 backdrop-blur-md border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col">
          <div className="p-2 bg-slate-800 text-white text-xs flex items-center gap-2">
            <span className="font-semibold">Debug</span>
            <input
              placeholder="filter (channel/text)"
              className="ml-2 flex-1 bg-slate-700/60 rounded px-2 py-1 outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button
              onClick={() => { debug.clear(); setRecords([]); }}
              className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600"
            >Clear</button>
            <button
              onClick={() => debug.copyToClipboard()}
              className="px-2 py-1 bg-blue-600 rounded hover:bg-blue-500"
            >Copy</button>
            <button
              onClick={runSelfTest}
              className="px-2 py-1 bg-emerald-600 rounded hover:bg-emerald-500"
            >Self‑test</button>
            <button
              onClick={() => { debug.setEnabled(false); setEnabled(false); setOpen(false); }}
              className="px-2 py-1 bg-red-600 rounded hover:bg-red-500"
            >Disable</button>
          </div>
          <div className="flex-1 overflow-auto text-xs font-mono text-slate-800">
            <ul className="divide-y divide-slate-200">
              {filtered.map((r, i) => (
                <li key={i} className="flex items-start gap-2 px-2 py-1">
                  <span className="text-slate-500 shrink-0">{formatTs(r.ts)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-white text-[10px] shrink-0 ${channelColors[r.channel] || channelColors.other}`}>{r.channel}</span>
                  <span className={`px-1.5 py-0.5 rounded text-white text-[10px] shrink-0 ${r.level === 'error' ? 'bg-red-600' : r.level === 'warn' ? 'bg-amber-600' : 'bg-slate-500'}`}>{r.level}</span>
                  <div className="whitespace-pre-wrap break-words">
                    <div className="font-semibold">{r.message}</div>
                    {r.data !== undefined && (
                      <pre className="text-[10px] text-slate-600 overflow-x-auto">{JSON.stringify(r.data, null, 2)}</pre>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugOverlay;

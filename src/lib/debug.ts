/* Lightweight in-app debug logger usable on mobile without devtools.
   No secrets or tokens are logged. */

export type DebugLevel = "info" | "warn" | "error";
export type DebugRecord = {
  ts: number; // epoch ms
  channel: string; // e.g. auth, net, ui
  level: DebugLevel;
  message: string;
  data?: unknown;
};

type Listener = (rec: DebugRecord) => void;

const MAX_LOGS = 400;
const STORAGE_KEY = "obrador:debug:enabled";
const WINDOW_KEY = "__OBRADOR_DEBUG_LOGS__" as const;

// Keep a ring buffer in memory and also expose on window for quick inspection
const w = (globalThis as any) as { [WINDOW_KEY]?: DebugRecord[] };
const buffer: DebugRecord[] = (w[WINDOW_KEY] = w[WINDOW_KEY] || []);
const listeners = new Set<Listener>();

const isQueryEnabled = () => {
  try {
    if (typeof window === "undefined") return false;
    const p = new URLSearchParams(window.location.search);
    return p.get("debug") === "1";
  } catch {
    return false;
  }
};

const isStoredEnabled = () => {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

let enabled = isQueryEnabled() || isStoredEnabled();

function setEnabled(v: boolean) {
  enabled = v;
  try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch {}
}

function getEnabled() {
  return enabled;
}

function push(rec: DebugRecord) {
  buffer.push(rec);
  if (buffer.length > MAX_LOGS) buffer.splice(0, buffer.length - MAX_LOGS);
  listeners.forEach((l) => {
    try { l(rec); } catch {}
  });
}

function log(channel: string, message: string, data?: unknown, level: DebugLevel = "info") {
  const rec: DebugRecord = { ts: Date.now(), channel, level, message, data };
  push(rec);
  // In dev, also mirror to console for convenience
  if (import.meta.env.DEV) {
    const ts = new Date(rec.ts).toISOString();
    const args: any[] = [
      `[DBG][${ts}][${channel.toUpperCase()}][${level}] ${message}`,
      data ?? ""
    ];
    // eslint-disable-next-line no-console
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(...args);
  }
}

function on(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }

function getAll() { return buffer.slice(); }

function clear() { buffer.splice(0, buffer.length); }

async function copyToClipboard() {
  const text = exportText();
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function exportText() {
  return buffer.map(r => {
    const ts = new Date(r.ts).toISOString();
    const data = r.data ? JSON.stringify(r.data) : "";
    return `${ts}\t${r.channel}\t${r.level}\t${r.message}\t${data}`;
  }).join("\n");
}

export const debug = {
  log,
  on,
  clear,
  getAll,
  setEnabled,
  isEnabled: getEnabled,
  copyToClipboard,
  exportText,
};

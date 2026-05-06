import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  voting_start: string | null;
  voting_end: string | null;
  theme_primary: string | null;
  theme_accent: string | null;
}

const SettingsCtx = createContext<{ settings: AppSettings | null; reload: () => void }>({
  settings: null,
  reload: () => {},
});

export const useSettings = () => useContext(SettingsCtx);

export function votingStatus(s: AppSettings | null): {
  open: boolean;
  reason: "not-started" | "ended" | "no-window" | "open";
  start?: Date;
  end?: Date;
} {
  if (!s || (!s.voting_start && !s.voting_end)) return { open: true, reason: "no-window" };
  const now = new Date();
  const start = s.voting_start ? new Date(s.voting_start) : null;
  const end = s.voting_end ? new Date(s.voting_end) : null;
  if (start && now < start) return { open: false, reason: "not-started", start, end: end ?? undefined };
  if (end && now > end) return { open: false, reason: "ended", start: start ?? undefined, end };
  return { open: true, reason: "open", start: start ?? undefined, end: end ?? undefined };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const load = async () => {
    const { data } = await supabase.from("settings").select("*").eq("id", "global").maybeSingle();
    if (data) setSettings(data as any);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("settings-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Apply theme overrides to document root
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (settings?.theme_primary) {
      root.style.setProperty("--primary", settings.theme_primary);
      root.style.setProperty("--primary-glow", settings.theme_primary);
      root.style.setProperty("--ring", settings.theme_primary);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-glow");
      root.style.removeProperty("--ring");
    }
    if (settings?.theme_accent) {
      root.style.setProperty("--accent", settings.theme_accent);
    } else {
      root.style.removeProperty("--accent");
    }
  }, [settings?.theme_primary, settings?.theme_accent]);

  return <SettingsCtx.Provider value={{ settings, reload: load }}>{children}</SettingsCtx.Provider>;
}

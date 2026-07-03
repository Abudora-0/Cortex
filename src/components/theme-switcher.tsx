"use client";

import { useEffect, useState } from "react";
import { Check, Sun, Moon } from "lucide-react";
import { THEMES, DEFAULT_THEME, THEME_KEY, MODE_KEY, type Mode } from "@/lib/themes";
import { cn } from "@/lib/utils";

function useTheme(): [string, (id: string) => void] {
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  useEffect(() => {
    // The server already applied the cookie theme to <html data-theme>;
    // mirror it into hook state so the active swatch is correct.
    const current =
      document.documentElement.getAttribute("data-theme") ||
      localStorage.getItem(THEME_KEY);
    if (current) setThemeState(current);
  }, []);

  const setTheme = (id: string) => {
    setThemeState(id);
    document.documentElement.setAttribute("data-theme", id);
    // Cookie lets the server render the right accent next load (no flash);
    // localStorage keeps the in-tab hook state in sync.
    document.cookie = `${THEME_KEY}=${id}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {
      /* private mode — non-fatal */
    }
  };

  return [theme, setTheme];
}

/** Full swatch grid — used on the Settings › Appearance card. */
export function ThemePicker() {
  const [theme, setTheme] = useTheme();

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
              active
                ? "border-ink bg-canvas shadow-lift"
                : "border-line hover:border-line-strong hover:bg-canvas/60"
            )}
            aria-pressed={active}
          >
            <span
              className="relative grid size-7 shrink-0 place-items-center rounded-full ring-2 ring-inset ring-black/5 transition-transform duration-200 group-hover:scale-105"
              style={{ backgroundColor: t.swatch }}
            >
              {active ? <Check size={14} strokeWidth={3} className="text-white" /> : null}
            </span>
            <span className="text-sm font-medium text-ink">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function useMode(): [Mode, (m: Mode) => void] {
  const [mode, setModeState] = useState<Mode>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-mode") as Mode | null;
    if (current) setModeState(current);
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    document.documentElement.setAttribute("data-mode", m);
    document.cookie = `${MODE_KEY}=${m}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return [mode, setMode];
}

/** Light/dark segmented toggle. */
export function ModeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useMode();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-line bg-canvas p-0.5",
        className
      )}
      role="group"
      aria-label="Colour mode"
    >
      {(
        [
          { id: "light" as const, icon: Sun, label: "Light" },
          { id: "dark" as const, icon: Moon, label: "Dark" },
        ]
      ).map(({ id, icon: Icon, label }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            onClick={() => setMode(id)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-paper text-ink shadow-lift" : "text-ink-faint hover:text-ink"
            )}
          >
            <Icon size={14} /> {label}
          </button>
        );
      })}
    </div>
  );
}

/** Compact icon-only mode toggle for the sidebar. */
export function ModeToggleCompact() {
  const [mode, setMode] = useMode();
  const next = mode === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => setMode(next)}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
      className="grid size-7 place-items-center rounded-md text-sidebar-fg/60 transition-colors hover:bg-white/10 hover:text-sidebar-fg"
    >
      {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

/** Compact dot-row — used in the sidebar footer. */
export function ThemeDots() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="flex items-center gap-1.5">
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            title={t.label}
            aria-label={`${t.label} theme`}
            aria-pressed={active}
            className={cn(
              "size-4 rounded-full ring-2 transition-transform duration-200 hover:scale-110",
              active ? "ring-white" : "ring-transparent hover:ring-white/40"
            )}
            style={{ backgroundColor: t.swatch }}
          />
        );
      })}
    </div>
  );
}

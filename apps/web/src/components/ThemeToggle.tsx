import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "./icons";
import { cn } from "../lib/utils";

/**
 * Three-state theme switcher: Auto / Light / Dark.
 *
 * "Auto" follows the OS via prefers-color-scheme. "Light" or "Dark" force the
 * UI regardless of the OS. The choice persists in localStorage under
 * cleanupHub.theme.v18.
 *
 * The CSS in apps/web/src/index.css is already set up to react to
 * `<html data-theme="dark|light">` AND to the prefers-color-scheme media
 * query (only when no explicit data-theme is set — `:not([data-theme="light"])`),
 * so we just set / unset the attribute here and everything else falls into place.
 */

type Mode = "auto" | "light" | "dark";
const STORAGE_KEY = "cleanupHub.theme.v18";

function readMode(): Mode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch { /* SSR / private mode */ }
  return "auto";
}

function applyMode(mode: Mode) {
  const root = document.documentElement;
  if (mode === "auto") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = mode;
  }
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>(() => readMode());

  // Apply once on mount (covers SSR + first-paint mismatches if any).
  useEffect(() => { applyMode(mode); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (next: Mode) => {
    setMode(next);
    applyMode(next);
    try {
      if (next === "auto") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch { /* private mode */ }
  };

  return (
    <div className="px-2 pb-1.5 pt-1">
      <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
        Theme
      </div>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="inline-flex w-full overflow-hidden rounded-md border border-border/15 bg-bg-2 p-0.5"
      >
        <ThemeOption mode="auto"  current={mode} onSelect={choose} label="Auto"  icon={Monitor} />
        <ThemeOption mode="light" current={mode} onSelect={choose} label="Light" icon={Sun} />
        <ThemeOption mode="dark"  current={mode} onSelect={choose} label="Dark"  icon={Moon} />
      </div>
    </div>
  );
}

interface OptionProps {
  mode: Mode;
  current: Mode;
  onSelect: (m: Mode) => void;
  label: string;
  icon: React.ElementType;
}

function ThemeOption({ mode, current, onSelect, label, icon: Icon }: OptionProps) {
  const active = current === mode;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onSelect(mode)}
      title={`${label} theme`}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-accent text-white shadow-sm"
          : "text-fg-dim hover:bg-bg-3 hover:text-fg",
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </button>
  );
}

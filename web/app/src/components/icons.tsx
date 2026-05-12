import {
  AppWindow,
  Bot,
  Container,
  HardDrive,
  Hammer,
  LayoutGrid,
  Palette,
  ShieldCheck,
  History,
  Scan,
  CheckCheck,
  AlertTriangle,
  ChevronRight,
  X,
  RefreshCw,
  Trash2,
  Info,
} from "lucide-react";

// Tab-icon map keyed by tab id. Mirrors TAB_ICONS in the legacy vanilla UI.
export const TAB_ICONS: Record<string, React.ElementType> = {
  overview: LayoutGrid,
  xcode: Hammer,
  llms: Bot,
  docker: Container,
  apps: AppWindow,
  creative: Palette,
  system: HardDrive,
};

export function TabIcon({ tabId, className }: { tabId: string; className?: string }) {
  const Icon = TAB_ICONS[tabId] || LayoutGrid;
  return <Icon className={className} aria-hidden />;
}

export {
  ShieldCheck,
  History,
  Scan,
  CheckCheck,
  AlertTriangle,
  ChevronRight,
  X,
  RefreshCw,
  Trash2,
  Info,
};

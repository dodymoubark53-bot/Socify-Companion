import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Inbox, Edit3, Calendar, BarChart2, Users, Megaphone,
  Radio, Workflow, Star, Link as LinkIcon, Settings, Bell, Shield,
  Search, ArrowRight, Hash, Zap
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  group: string;
  keywords?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",       path: "/dashboard",   icon: LayoutDashboard, group: "Pages" },
  { label: "Inbox",           path: "/inbox",       icon: Inbox,           group: "Pages", keywords: ["messages", "replies"] },
  { label: "Composer",        path: "/composer",    icon: Edit3,           group: "Pages", keywords: ["create", "post", "write"] },
  { label: "Calendar",        path: "/calendar",    icon: Calendar,        group: "Pages", keywords: ["schedule", "schedule"] },
  { label: "Analytics",       path: "/analytics",   icon: BarChart2,       group: "Pages", keywords: ["stats", "metrics", "heatmap"] },
  { label: "CRM Pipeline",    path: "/crm",         icon: Users,           group: "Pages", keywords: ["leads", "pipeline"] },
  { label: "Campaigns",       path: "/campaigns",   icon: Megaphone,       group: "Pages" },
  { label: "Listening",       path: "/listening",   icon: Radio,           group: "Pages", keywords: ["mentions", "keywords"] },
  { label: "Automations",     path: "/automations", icon: Workflow,        group: "Pages", keywords: ["workflow", "triggers"] },
  { label: "Influencers",     path: "/influencers", icon: Star,            group: "Pages" },
  { label: "Link in Bio",     path: "/link-in-bio", icon: LinkIcon,        group: "Pages" },
  { label: "Notifications",   path: "/notifications", icon: Bell,          group: "Pages" },
  { label: "Settings",        path: "/settings",    icon: Settings,        group: "Pages", keywords: ["team", "billing", "accounts"] },
  { label: "Admin Panel",     path: "/admin",       icon: Shield,          group: "Pages" },
];

const QUICK_ACTIONS = [
  { label: "Create new post",      path: "/composer",    icon: Edit3,    group: "Quick Actions" },
  { label: "View analytics",       path: "/analytics",   icon: BarChart2, group: "Quick Actions" },
  { label: "Open inbox",           path: "/inbox",       icon: Inbox,    group: "Quick Actions" },
  { label: "Build automation",     path: "/automations", icon: Workflow, group: "Quick Actions" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim()
    ? NAV_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.keywords?.some(k => k.includes(query.toLowerCase()))
      )
    : QUICK_ACTIONS;

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const navigate = useCallback((path: string) => {
    setLocation(path);
    onClose();
  }, [setLocation, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && results[selectedIdx]) { navigate(results[selectedIdx].path); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selectedIdx, navigate, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#111113] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#27272A]">
          <Search className="w-4 h-4 text-[#71717A] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions…"
            className="flex-1 bg-transparent text-sm text-[#FAFAFA] placeholder:text-[#52525B] outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[#27272A] bg-[#1C1C1F] px-1.5 text-[10px] font-medium text-[#71717A]">
            ESC
          </kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#52525B]">
              No results for "<span className="text-[#71717A]">{query}</span>"
            </div>
          ) : (
            <>
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                  {query ? "Results" : "Quick Actions"}
                </p>
              </div>
              {results.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIdx;
                return (
                  <button
                    key={item.path + item.label}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected ? "bg-[#6366F1]/10 text-[#FAFAFA]" : "text-[#A1A1AA] hover:bg-[#1C1C1F] hover:text-[#FAFAFA]"
                    }`}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={() => navigate(item.path)}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-[#6366F1]/20 text-[#6366F1]" : "bg-[#1C1C1F] text-[#71717A]"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[#6366F1]" />}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="border-t border-[#27272A] px-4 py-2.5 flex items-center gap-4 text-[10px] text-[#52525B]">
          <span className="flex items-center gap-1"><kbd className="bg-[#1C1C1F] border border-[#27272A] rounded px-1">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-[#1C1C1F] border border-[#27272A] rounded px-1">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="bg-[#1C1C1F] border border-[#27272A] rounded px-1">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

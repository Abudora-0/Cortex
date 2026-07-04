"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  SlidersHorizontal,
  Calculator,
  CalendarDays,
  ClipboardList,
  StickyNote,
  Users,
  FolderOpen,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeDots, ModeToggleCompact } from "@/components/theme-switcher";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/semesters", label: "Semesters", icon: Library },
  { href: "/gpa", label: "GPA Lab", icon: SlidersHorizontal },
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/faculty", label: "Faculty", icon: Users },
  { href: "/drive", label: "Drive", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  name,
  initials,
  signOutAction,
  defaultCollapsed = false,
}: {
  name: string;
  initials: string;
  signOutAction: () => Promise<void>;
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `cortex-sidebar=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };

  // when collapsed, stay icon-only on every breakpoint; otherwise expand at lg
  const showText = collapsed ? "hidden" : "hidden lg:block";
  const showFlex = collapsed ? "hidden" : "hidden lg:flex";

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/5 bg-sidebar text-sidebar-fg transition-[width] duration-300 ease-[var(--ease-out-soft)]",
        collapsed ? "w-16" : "w-16 lg:w-56"
      )}
    >
      <Link
        href="/"
        className="flex h-16 items-center gap-2.5 border-b border-white/10 px-3.5 lg:px-4"
        aria-label="Cortex home"
      >
        <span className={collapsed ? "flex" : "lg:hidden"}>
          <Logo showWord={false} />
        </span>
        <span className={showFlex}>
          <Logo />
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 p-2 lg:p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors duration-200 lg:px-3",
                active
                  ? "bg-garnet-600 text-white"
                  : "text-sidebar-fg/55 hover:bg-white/[0.07] hover:text-sidebar-fg"
              )}
            >
              {/* animated active rail */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-white transition-all duration-300 ease-[var(--ease-out-soft)]",
                  active ? "h-5" : "group-hover:h-3"
                )}
              />
              <Icon
                size={18}
                className={cn(
                  "shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active && "scale-105"
                )}
              />
              <span className={showText}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle - desktop only */}
      <div className="hidden px-2 pb-1 lg:block lg:px-3">
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-sidebar-fg/45 transition-colors duration-200 hover:bg-white/[0.07] hover:text-sidebar-fg lg:px-3"
        >
          {collapsed ? (
            <PanelLeftOpen size={18} className="shrink-0" />
          ) : (
            <PanelLeftClose size={18} className="shrink-0" />
          )}
          <span className={showText}>Collapse</span>
        </button>
      </div>

      {/* Theme controls - hidden when collapsed */}
      <div className={cn("flex-col gap-2.5 border-t border-white/10 px-4 py-3", showFlex)}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-fg/40">
            Theme
          </span>
          <ModeToggleCompact />
        </div>
        <ThemeDots />
      </div>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <div className={cn("flex gap-2.5", collapsed ? "flex-col items-center" : "items-center")}>
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-brass-500 font-display text-xs font-bold text-[#1c1917]"
            title={name}
          >
            {initials}
          </span>
          <span className={cn("min-w-0 flex-1 truncate text-xs text-sidebar-fg/70", showText)}>
            {name}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="rounded-md p-1.5 text-sidebar-fg/50 transition-colors hover:bg-white/10 hover:text-sidebar-fg"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

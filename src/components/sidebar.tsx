"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  SlidersHorizontal,
  Calculator,
  CalendarDays,
  StickyNote,
  FolderOpen,
  Settings,
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
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/drive", label: "Drive", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-white/5 bg-sidebar text-sidebar-fg lg:w-56">
      <Link
        href="/"
        className="flex h-16 items-center gap-2.5 border-b border-white/10 px-3.5 lg:px-4"
        aria-label="Cortex home"
      >
        <Logo showWord={false} className="lg:hidden" />
        <span className="hidden lg:flex">
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
              <span className="hidden lg:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden flex-col gap-2.5 border-t border-white/10 px-4 py-3 lg:flex">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-fg/40">
            Theme
          </span>
          <ModeToggleCompact />
        </div>
        <ThemeDots />
      </div>

      {footer ? (
        <div className="border-t border-white/10 p-3">{footer}</div>
      ) : null}
    </aside>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Vote,
  BookOpen,
  Banknote,
  Newspaper,
  UsersRound,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/mlas", label: "MLAs", icon: Users },
  { href: "/divisions", label: "Divisions", icon: Vote },
  { href: "/hansard", label: "Hansard", icon: BookOpen },
  { href: "/money", label: "Money & Interests", icon: Banknote },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/groups", label: "All-Party Groups", icon: UsersRound },
];

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[var(--sidebar-border)] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 5V11L8 15L2 11V5L8 1Z" fill="currentColor" />
            <path d="M8 4L11 6V10L8 12L5 10V6L8 4Z" fill="var(--sidebar)" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-[var(--sidebar-foreground)]">
            Stormont Watch
          </span>
          <span className="block text-[10px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            NI Assembly
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm shadow-[var(--primary)]/20"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                  isActive && "drop-shadow-sm"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--sidebar-border)] px-5 py-3">
        <p className="text-[10px] text-[var(--muted-foreground)] opacity-60">
          Data from NI Assembly Open Data, mySociety, Electoral Commission
        </p>
      </div>
    </>
  );
}

export function NavSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-[var(--sidebar)] px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--sidebar-accent)] hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 5V11L8 15L2 11V5L8 1Z" fill="currentColor" />
            <path d="M8 4L11 6V10L8 12L5 10V6L8 4Z" fill="var(--sidebar)" />
          </svg>
        </div>
        <span className="text-sm font-bold tracking-tight">Stormont Watch</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}

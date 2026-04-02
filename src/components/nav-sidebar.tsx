"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Vote,
  BookOpen,
  Banknote,
  Newspaper,
  UsersRound,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/mlas", label: "MLAs", icon: Users },
  { href: "/divisions", label: "Divisions", icon: Vote },
  { href: "/hansard", label: "Hansard", icon: BookOpen },
  { href: "/money", label: "Money & Interests", icon: Banknote },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/groups", label: "All-Party Groups", icon: UsersRound },
];

export function NavSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="text-lg font-bold tracking-tight text-foreground">
          Stormont Watch
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavLinks } from "@/lib/constants";
import { Container, Badge } from "@/components/shared/ui";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/types";

export function AdminShell({
  user,
  children,
}: {
  user: SafeUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950/40">
      <Container className="grid gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass h-fit rounded-2xl border border-white/10 p-5 lg:sticky lg:top-6">
          <div className="mb-6 space-y-1.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200">Admin Console</p>
            <h1 className="font-display text-2xl font-semibold text-white">Modern Mobile Center</h1>
            <div className="flex items-center gap-2">
              <Badge variant="success">{user.role}</Badge>
              <span className="text-sm text-slate-400">{user.name}</span>
            </div>
            <p className="text-sm leading-6 text-slate-500">
              Keep stock, requests, and launch updates current so the storefront stays accurate for walk-in customers.
            </p>
          </div>
          <nav className="space-y-1.5">
            {adminNavLinks.map((link) => {
              const Icon = link.icon!;
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition",
                    active
                      ? "bg-cyan-300/12 text-white"
                      : "text-slate-300 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 space-y-2 border-t border-white/8 pt-5 text-sm">
            <Link href="/" className="block text-slate-400 transition hover:text-white">
              View storefront
            </Link>
            <Link href="/contact" className="block text-slate-400 transition hover:text-white">
              Open contact page
            </Link>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </Container>
    </div>
  );
}

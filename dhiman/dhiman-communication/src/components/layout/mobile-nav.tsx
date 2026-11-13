"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNavLinks } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-white/10 bg-slate-950/92 p-2 shadow-2xl backdrop-blur-md md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobileNavLinks.map((link) => {
          const Icon = link.icon!;
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-slate-400 transition",
                active && "bg-white/8 text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

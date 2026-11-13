import Link from "next/link";
import { Heart, LayoutDashboard, MapPin, Phone, Search, ShoppingCart, User2 } from "lucide-react";
import { publicNavLinks } from "@/lib/constants";
import type { SafeUser } from "@/types";
import { Container, Badge, ButtonLink } from "@/components/shared/ui";

export function SiteHeader({
  user,
  shopName,
  phone,
  address,
  mapLink,
}: {
  user: SafeUser | null;
  shopName: string;
  phone: string;
  address: string;
  mapLink: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-slate-950/88 backdrop-blur-md">
      <div className="hidden border-b border-white/6 bg-slate-950/96 md:block">
        <Container className="flex items-center justify-between gap-4 py-2">
          <div className="flex min-w-0 items-center gap-4 text-xs text-slate-400">
            <a href={`tel:${phone}`} className="inline-flex items-center gap-2 transition hover:text-white">
              <Phone className="h-3.5 w-3.5 text-cyan-200" />
              {phone}
            </a>
            <span className="flex min-w-0 items-center gap-2 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
              <span className="truncate">{address}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link href={mapLink} target="_blank" className="text-cyan-300 transition hover:text-cyan-200">
              Open location
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Store pickup and direct shop follow-up available</span>
          </div>
        </Container>
      </div>
      <Container className="flex items-center gap-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-semibold text-cyan-200">
            MMC
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-white">{shopName}</p>
            <p className="truncate text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Local mobile shop and accessories
            </p>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-6 lg:flex">
          {publicNavLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-slate-300 transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 items-center justify-end gap-3 md:flex">
          <form action="/shop" className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              name="search"
              placeholder="Search phones, brands, accessories..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 transition focus:border-cyan-300/60 focus:bg-white/7"
            />
          </form>

          <Link href="/wishlist" className="rounded-xl border border-white/10 p-2.5 text-slate-300 transition hover:bg-white/8 hover:text-white">
            <Heart className="h-5 w-5" />
          </Link>
          <Link href="/cart" className="rounded-xl border border-white/10 p-2.5 text-slate-300 transition hover:bg-white/8 hover:text-white">
            <ShoppingCart className="h-5 w-5" />
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Badge variant={user.role === "customer" ? "default" : "success"}>{user.role}</Badge>
              <ButtonLink href={user.role === "customer" ? "/profile" : "/admin"} variant="secondary">
                {user.role === "customer" ? <User2 className="mr-2 h-4 w-4" /> : <LayoutDashboard className="mr-2 h-4 w-4" />}
                {user.role === "customer" ? "Profile" : "Dashboard"}
              </ButtonLink>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ButtonLink href="/login" variant="ghost">
                Login
              </ButtonLink>
              <ButtonLink href="/signup">Sign up</ButtonLink>
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}

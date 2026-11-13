import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Container } from "@/components/shared/ui";

export function SiteFooter({
  shopName,
  address,
  phone,
  email,
  openingHours,
  mapLink,
}: {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  mapLink: string;
}) {
  return (
    <footer className="mt-20 border-t border-white/8 bg-slate-950/72">
      <Container className="grid gap-8 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-display text-2xl font-semibold text-white">{shopName}</p>
          <p className="text-sm leading-6 text-slate-400">
            A local store for mobiles, accessories, second-hand devices, and practical buying support before you visit or reserve.
          </p>
          <p className="text-sm text-slate-500">
            Need help choosing? Call the shop, send an inquiry, or visit in person for stock confirmation and pickup support.
          </p>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <p className="font-medium text-white">Visit the shop</p>
          <p className="flex items-start gap-2 leading-6"><MapPin className="mt-1 h-4 w-4 text-cyan-200" />{address}</p>
          <Link href={mapLink} target="_blank" className="text-cyan-300 hover:text-cyan-200">
            Open in Google Maps
          </Link>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <p className="font-medium text-white">Contact</p>
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-cyan-200" />{phone}</p>
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-cyan-200" />{email}</p>
          <p className="text-slate-500">Best for availability checks, reservations, and exchange questions.</p>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <p className="font-medium text-white">Hours</p>
          <p className="flex items-start gap-2 leading-6"><Clock className="mt-1 h-4 w-4 text-cyan-200" />{openingHours}</p>
          <p className="text-slate-500">Call before pickup if you are coming for a specific model or second-hand device.</p>
        </div>
      </Container>
    </footer>
  );
}

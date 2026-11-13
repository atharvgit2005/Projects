import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  Cable,
  Headphones,
  House,
  LayoutDashboard,
  Phone,
  Repeat2,
  Settings,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";

export const APP_ROLES = ["owner", "admin", "customer"] as const;
export const PRODUCT_CONDITIONS = ["new", "second-hand"] as const;
export const CATEGORY_TYPES = [
  "mobiles",
  "headphones",
  "earbuds",
  "cables",
  "chargers",
  "accessories",
  "second-hand",
] as const;
export const INQUIRY_STATUSES = ["new", "contacted", "converted", "closed"] as const;
export const EXCHANGE_STATUSES = [
  "new",
  "reviewing",
  "approved",
  "rejected",
  "completed",
] as const;
export const MAX_COMPARE_ITEMS = 4;
export const LOW_STOCK_THRESHOLD = 5;

export type NavLink = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

export const publicNavLinks: NavLink[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/upcoming", label: "Upcoming", icon: Phone },
  { href: "/second-hand", label: "Second-Hand", icon: Repeat2 },
  { href: "/contact", label: "Contact", icon: Store },
];

export const mobileNavLinks: NavLink[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/compare", label: "Compare", icon: BarChart3 },
  { href: "/cart", label: "Cart", icon: Boxes },
  { href: "/profile", label: "Profile", icon: Users },
];

export const adminNavLinks: NavLink[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/categories", label: "Categories", icon: Boxes },
  { href: "/admin/brands", label: "Brands", icon: Cable },
  { href: "/admin/orders-or-inquiries", label: "Inquiries", icon: Headphones },
  { href: "/admin/exchange-requests", label: "Exchange", icon: Repeat2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

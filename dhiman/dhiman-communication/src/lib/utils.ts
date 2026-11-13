import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value?: string | Date | null) {
  if (!value) {
    return "N/A";
  }

  return format(new Date(value), "dd MMM yyyy");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function toPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getStockLabel(stock: number) {
  if (stock <= 0) {
    return "Out of stock";
  }

  if (stock <= 5) {
    return "Low stock";
  }

  return "In stock";
}

export function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const id =
      parsed.hostname.includes("youtu.be")
        ? parsed.pathname.replace("/", "")
        : parsed.searchParams.get("v");

    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

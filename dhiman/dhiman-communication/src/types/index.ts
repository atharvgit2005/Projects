export type Role = "owner" | "admin" | "customer";
export type ProductCondition = "new" | "second-hand";
export type InquiryStatus = "new" | "contacted" | "converted" | "closed";
export type ExchangeStatus = "new" | "reviewing" | "approved" | "rejected" | "completed";

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductFilterParams = {
  search?: string;
  category?: string;
  brand?: string;
  series?: string;
  ram?: string;
  storage?: string;
  processor?: string;
  condition?: ProductCondition;
  featured?: boolean;
  upcoming?: boolean;
  latestRelease?: boolean;
  discounted?: boolean;
  minDiscount?: number;
  maxDiscount?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: "price-asc" | "price-desc" | "newest" | "highest-discount" | "featured";
  includeInactive?: boolean;
  limit?: number;
  page?: number;
};

export type CartContext = {
  userId?: string;
  guestSessionId?: string;
};

import { Types } from "mongoose";
import { cache } from "react";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { toPlainObject } from "@/lib/utils";
import {
  BrandModel,
  CategoryModel,
  ProductModel,
  ShopSettingsModel,
  type BrandRecord,
  type CategoryRecord,
  type ProductRecord,
  type ShopSettingsRecord,
} from "@/models";
import type { ProductFilterParams } from "@/types";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function objectIdOrNull(value?: string) {
  return value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
}

async function resolveCategoryId(category?: string) {
  if (!category) {
    return null;
  }

  const byId = objectIdOrNull(category);

  if (byId) {
    return byId;
  }

  const record = await CategoryModel.findOne({ slug: category }).select("_id").lean<{ _id: Types.ObjectId } | null>();
  return record?._id ?? null;
}

async function resolveBrandId(brand?: string) {
  if (!brand) {
    return null;
  }

  const byId = objectIdOrNull(brand);

  if (byId) {
    return byId;
  }

  const record = await BrandModel.findOne({ slug: brand }).select("_id").lean<{ _id: Types.ObjectId } | null>();
  return record?._id ?? null;
}

async function buildProductMatch(filters: ProductFilterParams) {
  const match: Record<string, unknown> = {};

  if (!filters.includeInactive) {
    match.isActive = true;
  }

  if (filters.condition) {
    match.condition = filters.condition;
  }

  if (filters.featured) {
    match.featured = true;
  }

  if (filters.upcoming) {
    match.upcoming = true;
  }

  if (filters.latestRelease) {
    match.latestRelease = true;
  }

  if (filters.discounted) {
    match.discountPercent = { $gt: 0 };
  }

  if (typeof filters.minDiscount === "number" || typeof filters.maxDiscount === "number") {
    match.discountPercent = {
      ...(typeof filters.minDiscount === "number" ? { $gte: filters.minDiscount } : {}),
      ...(typeof filters.maxDiscount === "number" ? { $lte: filters.maxDiscount } : {}),
    };
  }

  if (typeof filters.minPrice === "number" || typeof filters.maxPrice === "number") {
    match.price = {};

    if (typeof filters.minPrice === "number") {
      (match.price as Record<string, number>).$gte = filters.minPrice;
    }

    if (typeof filters.maxPrice === "number") {
      (match.price as Record<string, number>).$lte = filters.maxPrice;
    }
  }

  if (filters.search) {
    const pattern = new RegExp(escapeRegex(filters.search), "i");
    match.$or = [
      { title: pattern },
      { shortDescription: pattern },
      { description: pattern },
      { "filterMeta.brand": pattern },
      { "specs.series": pattern },
      { "specs.processor": pattern },
      { tags: pattern },
      { sku: pattern },
    ];
  }

  if (filters.series) {
    match["specs.series"] = new RegExp(`^${escapeRegex(filters.series)}$`, "i");
  }

  if (filters.ram) {
    match["specs.ram"] = new RegExp(`^${escapeRegex(filters.ram)}$`, "i");
  }

  if (filters.storage) {
    match["specs.storage"] = new RegExp(`^${escapeRegex(filters.storage)}$`, "i");
  }

  if (filters.processor) {
    match["specs.processor"] = new RegExp(escapeRegex(filters.processor), "i");
  }

  const [categoryId, brandId] = await Promise.all([
    resolveCategoryId(filters.category),
    resolveBrandId(filters.brand),
  ]);

  if (filters.category) {
    match.category = categoryId ?? null;
  }

  if (filters.brand) {
    match.brand = brandId ?? null;
  }

  return match;
}

function getSort(filters: ProductFilterParams) {
  switch (filters.sort) {
    case "price-asc":
      return { price: 1 } as Record<string, 1 | -1>;
    case "price-desc":
      return { price: -1 } as Record<string, 1 | -1>;
    case "highest-discount":
      return { discountPercent: -1, createdAt: -1 } as Record<string, 1 | -1>;
    case "featured":
      return { featured: -1, createdAt: -1 } as Record<string, 1 | -1>;
    case "newest":
    default:
      return { createdAt: -1 } as Record<string, 1 | -1>;
  }
}

export async function getCategories(activeOnly = true) {
  await connectToDatabase();
  const categories = await CategoryModel.find(activeOnly ? { isActive: true } : {})
    .sort({ sortOrder: 1, name: 1 })
    .lean<CategoryRecord[]>();
  return toPlainObject(categories);
}

export async function getBrands(activeOnly = true) {
  await connectToDatabase();
  const brands = await BrandModel.find(activeOnly ? { isActive: true } : {})
    .sort({ name: 1 })
    .lean<BrandRecord[]>();
  return toPlainObject(brands);
}

export async function getCategoryBySlug(slug: string) {
  await connectToDatabase();
  const category = await CategoryModel.findOne({ slug }).lean<CategoryRecord | null>();
  return category ? toPlainObject(category) : null;
}

export async function getBrandBySlug(slug: string) {
  await connectToDatabase();
  const brand = await BrandModel.findOne({ slug }).lean<BrandRecord | null>();
  return brand ? toPlainObject(brand) : null;
}

export async function getProducts(filters: ProductFilterParams = {}) {
  await connectToDatabase();

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  const skip = (page - 1) * limit;
  const match = await buildProductMatch(filters);
  const sort = getSort(filters);

  const [products, total] = await Promise.all([
    ProductModel.find(match)
      .populate("brand", "name slug logoUrl")
      .populate("category", "name slug type")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductModel.countDocuments(match),
  ]);

  return {
    products: toPlainObject(products),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getProductBySlug(slug: string) {
  await connectToDatabase();
  const product = await ProductModel.findOne({ slug, isActive: true })
    .populate("brand", "name slug logoUrl")
    .populate("category", "name slug type")
    .lean<ProductRecord | null>();
  return product ? toPlainObject(product) : null;
}

export async function getProductById(id: string, includeInactive = true) {
  await connectToDatabase();
  const query = objectIdOrNull(id);

  if (!query) {
    return null;
  }

  const product = await ProductModel.findOne({
    _id: query,
    ...(includeInactive ? {} : { isActive: true }),
  })
    .populate("brand", "name slug logoUrl")
    .populate("category", "name slug type")
    .lean<ProductRecord | null>();

  return product ? toPlainObject(product) : null;
}

export async function getSimilarProducts(product: { _id: string; category?: string; brand?: string }, limit = 4) {
  await connectToDatabase();
  const currentId = objectIdOrNull(product._id);

  if (!currentId) {
    return [];
  }

  const related = await ProductModel.find({
    _id: { $ne: currentId },
    isActive: true,
    $or: [{ category: product.category }, { brand: product.brand }],
  })
    .populate("brand", "name slug logoUrl")
    .populate("category", "name slug type")
    .limit(limit)
    .sort({ featured: -1, createdAt: -1 })
    .lean();

  return toPlainObject(related);
}

export async function createCategory(input: {
  name: string;
  slug: string;
  type: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  await connectToDatabase();
  const category = await CategoryModel.create(input);
  return toPlainObject(category.toObject());
}

export async function updateCategory(id: string, input: {
  name: string;
  slug: string;
  type: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  await connectToDatabase();
  const category = await CategoryModel.findByIdAndUpdate(id, input, { returnDocument: "after" }).lean();
  if (!category) {
    throw new HttpError(404, "Category not found");
  }

  return toPlainObject(category);
}

export async function deleteCategory(id: string) {
  await connectToDatabase();
  await CategoryModel.findByIdAndDelete(id);
  return true;
}

export async function createBrand(input: {
  name: string;
  slug: string;
  logoUrl?: string;
  isActive?: boolean;
}) {
  await connectToDatabase();
  const brand = await BrandModel.create(input);
  return toPlainObject(brand.toObject());
}

export async function updateBrand(id: string, input: {
  name: string;
  slug: string;
  logoUrl?: string;
  isActive?: boolean;
}) {
  await connectToDatabase();
  const brand = await BrandModel.findByIdAndUpdate(id, input, { returnDocument: "after" }).lean();
  if (!brand) {
    throw new HttpError(404, "Brand not found");
  }

  return toPlainObject(brand);
}

export async function deleteBrand(id: string) {
  await connectToDatabase();
  await BrandModel.findByIdAndDelete(id);
  return true;
}

export async function createProduct(input: Record<string, unknown>) {
  await connectToDatabase();
  const product = await ProductModel.create(input);
  const populated = await ProductModel.findById(product._id)
    .populate("brand", "name slug logoUrl")
    .populate("category", "name slug type")
    .lean();
  return toPlainObject(populated);
}

export async function updateProduct(id: string, input: Record<string, unknown>) {
  await connectToDatabase();
  const product = await ProductModel.findByIdAndUpdate(id, input, { returnDocument: "after" })
    .populate("brand", "name slug logoUrl")
    .populate("category", "name slug type")
    .lean();

  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  return toPlainObject(product);
}

export async function deleteProduct(id: string) {
  await connectToDatabase();
  await ProductModel.findByIdAndDelete(id);
  return true;
}

export async function getDashboardProductCollections() {
  await connectToDatabase();
  const [featured, latest, discounted, upcoming, secondHand] = await Promise.all([
    ProductModel.find({ isActive: true, featured: true })
      .populate("brand", "name slug logoUrl")
      .populate("category", "name slug type")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    ProductModel.find({ isActive: true, latestRelease: true })
      .populate("brand", "name slug logoUrl")
      .populate("category", "name slug type")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    ProductModel.find({ isActive: true, discountPercent: { $gt: 0 } })
      .populate("brand", "name slug logoUrl")
      .populate("category", "name slug type")
      .sort({ discountPercent: -1, createdAt: -1 })
      .limit(8)
      .lean(),
    ProductModel.find({ isActive: true, upcoming: true })
      .populate("brand", "name slug logoUrl")
      .populate("category", "name slug type")
      .sort({ upcomingReleaseDate: 1 })
      .limit(8)
      .lean(),
    ProductModel.find({ isActive: true, condition: "second-hand" })
      .populate("brand", "name slug logoUrl")
      .populate("category", "name slug type")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  return {
    featured: toPlainObject(featured),
    latest: toPlainObject(latest),
    discounted: toPlainObject(discounted),
    upcoming: toPlainObject(upcoming),
    secondHand: toPlainObject(secondHand),
  };
}

export const getShopSettings = cache(async () => {
  await connectToDatabase();
  let settings = await ShopSettingsModel.findOne({ key: "primary" }).lean<ShopSettingsRecord | null>();

  if (!settings) {
    const created = await ShopSettingsModel.create({
      shopName: env.appName,
      address: env.shopAddress,
      mapLink: env.googleMapsLink,
      phone: env.shopPhone,
      email: env.shopEmail,
      openingHours: "Mon - Sat, 10:00 AM - 9:00 PM",
      announcementBar: "New season arrivals are live. Ask us for bundle pricing on accessories.",
      heroBanners: [
        {
          title: "Premium mobiles, curated in one place",
          subtitle: "From flagship launches to dependable daily drivers and accessory bundles.",
          imageUrl:
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80",
          ctaLabel: "Browse the catalog",
          ctaHref: "/shop",
        },
        {
          title: "Upgrade with second-hand exchange options",
          subtitle: "Sell your old device or trade it toward your next phone with in-store follow-up.",
          imageUrl:
            "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1200&q=80",
          ctaLabel: "Sell or exchange",
          ctaHref: "/sell-or-exchange",
        },
      ],
      socialLinks: [
        { label: "Instagram", url: "https://instagram.com" },
        { label: "YouTube", url: "https://youtube.com" },
        { label: "WhatsApp", url: "https://wa.me" },
      ],
      themePreferences: {
        accentColor: "#5eead4",
        highlightColor: "#f59e0b",
      },
    });

    settings = created.toObject() as ShopSettingsRecord;
  }

  return toPlainObject(settings);
});

export async function updateShopSettings(input: Record<string, unknown>) {
  await connectToDatabase();
  const settings = await ShopSettingsModel.findOneAndUpdate(
    { key: "primary" },
    { ...input, key: "primary" },
    { returnDocument: "after", upsert: true },
  ).lean();

  return toPlainObject(settings);
}

export async function getHomepageData() {
  const [settings, brands, categories, collections] = await Promise.all([
    getShopSettings(),
    getBrands(true),
    getCategories(true),
    getDashboardProductCollections(),
  ]);

  return {
    settings,
    brands,
    categories,
    ...collections,
  };
}

export async function getCatalogFilterOptions(includeInactive = false) {
  await connectToDatabase();
  const activeMatch = includeInactive ? {} : { isActive: true };
  const [series, ram, storage, processor, pricingStats] = await Promise.all([
    ProductModel.distinct("specs.series", activeMatch),
    ProductModel.distinct("specs.ram", activeMatch),
    ProductModel.distinct("specs.storage", activeMatch),
    ProductModel.distinct("specs.processor", activeMatch),
    ProductModel.aggregate([
      { $match: activeMatch },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          maxDiscount: { $max: "$discountPercent" },
        },
      },
    ]),
  ]);

  const stats = pricingStats[0] ?? {
    minPrice: 0,
    maxPrice: 0,
    maxDiscount: 0,
  };

  return {
    series: series.filter(Boolean).sort(),
    ram: ram.filter(Boolean).sort(),
    storage: storage.filter(Boolean).sort(),
    processor: processor.filter(Boolean).sort(),
    minPrice: Number(stats.minPrice || 0),
    maxPrice: Number(stats.maxPrice || 0),
    maxDiscount: Number(stats.maxDiscount || 0),
  };
}

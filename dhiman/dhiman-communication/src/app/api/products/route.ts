import type { NextRequest } from "next/server";
import { getCurrentUser, requireAdminUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { isAdminRole } from "@/lib/permissions";
import { productQuerySchema, productSchema } from "@/schemas/product";
import { createProduct, getProducts } from "@/services/catalog-service";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const params = request.nextUrl.searchParams;
    const parsed = productQuerySchema.parse({
      search: params.get("search") ?? undefined,
      category: params.get("category") ?? undefined,
      brand: params.get("brand") ?? undefined,
      series: params.get("series") ?? undefined,
      ram: params.get("ram") ?? undefined,
      storage: params.get("storage") ?? undefined,
      processor: params.get("processor") ?? undefined,
      condition: params.get("condition") ?? undefined,
      featured: params.get("featured") === "true" ? true : undefined,
      upcoming: params.get("upcoming") === "true" ? true : undefined,
      latestRelease: params.get("latestRelease") === "true" ? true : undefined,
      discounted: params.get("discounted") === "true" ? true : undefined,
      minDiscount: params.get("minDiscount") ?? undefined,
      maxDiscount: params.get("maxDiscount") ?? undefined,
      minPrice: params.get("minPrice") ?? undefined,
      maxPrice: params.get("maxPrice") ?? undefined,
      sort: params.get("sort") ?? undefined,
      includeInactive:
        params.get("includeInactive") === "true" && isAdminRole(currentUser?.role)
          ? true
          : undefined,
      limit: params.get("limit") ?? undefined,
      page: params.get("page") ?? undefined,
    });

    const data = await getProducts(parsed);
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = productSchema.parse(await request.json());
    const product = await createProduct({
      ...body,
      upcomingReleaseDate: body.upcomingReleaseDate ? new Date(body.upcomingReleaseDate) : null,
    });
    return ok({ product }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

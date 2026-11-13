import type { NextRequest } from "next/server";
import { getCurrentUser, requireAdminUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { isAdminRole } from "@/lib/permissions";
import { brandSchema } from "@/schemas/brand";
import { createBrand, getBrands } from "@/services/catalog-service";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const includeInactive =
      request.nextUrl.searchParams.get("all") === "true" && isAdminRole(currentUser?.role);
    const brands = await getBrands(!includeInactive);
    return ok({ brands });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = brandSchema.parse(await request.json());
    const brand = await createBrand(body);
    return ok({ brand }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

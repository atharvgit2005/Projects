import type { NextRequest } from "next/server";
import { getCurrentUser, requireAdminUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { isAdminRole } from "@/lib/permissions";
import { categorySchema } from "@/schemas/category";
import { createCategory, getCategories } from "@/services/catalog-service";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const includeInactive =
      request.nextUrl.searchParams.get("all") === "true" && isAdminRole(currentUser?.role);
    const categories = await getCategories(!includeInactive);
    return ok({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = categorySchema.parse(await request.json());
    const category = await createCategory(body);
    return ok({ category }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

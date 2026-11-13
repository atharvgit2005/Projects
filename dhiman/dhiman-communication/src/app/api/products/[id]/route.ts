import type { NextRequest } from "next/server";
import { getCurrentUser, requireAdminUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/http";
import { isAdminRole } from "@/lib/permissions";
import { productSchema } from "@/schemas/product";
import { deleteProduct, getProductById, updateProduct } from "@/services/catalog-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const currentUser = await getCurrentUser();
    const { id } = await params;
    const product = await getProductById(id, isAdminRole(currentUser?.role));

    if (!product) {
      return fail("Product not found", 404);
    }

    return ok({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const body = productSchema.parse(await request.json());
    const product = await updateProduct(id, {
      ...body,
      upcomingReleaseDate: body.upcomingReleaseDate ? new Date(body.upcomingReleaseDate) : null,
    });
    return ok({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const { id } = await params;
    await deleteProduct(id);
    return ok({ message: "Product deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

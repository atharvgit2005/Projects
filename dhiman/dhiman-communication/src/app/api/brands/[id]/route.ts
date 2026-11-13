import { requireAdminUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { brandSchema } from "@/schemas/brand";
import { deleteBrand, updateBrand } from "@/services/catalog-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const body = brandSchema.parse(await request.json());
    const brand = await updateBrand(id, body);
    return ok({ brand });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const { id } = await params;
    await deleteBrand(id);
    return ok({ message: "Brand deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

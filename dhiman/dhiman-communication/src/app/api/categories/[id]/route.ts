import { requireAdminUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { categorySchema } from "@/schemas/category";
import { deleteCategory, updateCategory } from "@/services/catalog-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const body = categorySchema.parse(await request.json());
    const category = await updateCategory(id, body);
    return ok({ category });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const { id } = await params;
    await deleteCategory(id);
    return ok({ message: "Category deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

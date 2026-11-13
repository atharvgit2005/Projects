import { requireAdminUser } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { shopSettingsSchema } from "@/schemas/settings";
import { getShopSettings, updateShopSettings } from "@/services/catalog-service";

export async function GET() {
  try {
    const settings = await getShopSettings();
    return ok({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminUser();
    await getCurrentUser();
    const body = shopSettingsSchema.parse(await request.json());
    const settings = await updateShopSettings(body);
    return ok({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

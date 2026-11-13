import { z } from "zod";

export const roleAssignmentSchema = z.object({
  role: z.enum(["admin", "customer"]),
});

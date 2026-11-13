import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isAdminRole(user.role)) {
    redirect("/profile");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}

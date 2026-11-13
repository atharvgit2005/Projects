import { requireAdminUser } from "@/lib/auth";
import { UserManagement } from "@/components/admin/user-management";
import { SectionHeading } from "@/components/shared/ui";
import { listUsers } from "@/services/auth-service";

export default async function AdminUsersPage() {
  const [currentUser, users] = await Promise.all([requireAdminUser(), listUsers()]);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Access"
        title="User management"
        description="Only the owner can promote accounts to admin. Normal signups always stay customer until approved."
      />
      <UserManagement initialUsers={users} currentUserRole={currentUser.role} />
    </div>
  );
}

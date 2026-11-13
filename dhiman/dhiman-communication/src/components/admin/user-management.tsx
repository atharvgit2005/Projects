"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Badge, Button, Panel, TextField } from "@/components/shared/ui";

export function UserManagement({
  initialUsers,
  currentUserRole,
}: {
  initialUsers: any[];
  currentUserRole: "owner" | "admin" | "customer";
}) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredUsers = users.filter((user) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return (
      user.name?.toLowerCase().includes(normalizedQuery) ||
      user.email?.toLowerCase().includes(normalizedQuery) ||
      user.phone?.toLowerCase().includes(normalizedQuery)
    );
  });

  const updateRole = (id: string, role: "admin" | "customer") => {
    startTransition(async () => {
      try {
        const response = await apiFetch<{ user: any }>(`/api/users/${id}/role`, {
          method: "PATCH",
          body: JSON.stringify({ role }),
        });
        setUsers((current) => current.map((user) => (user.id === id ? response.user : user)));
        toast.success("Role updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update role");
      }
    });
  };

  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="font-display text-2xl font-semibold text-white">Users</h2>
        <Badge variant={currentUserRole === "owner" ? "success" : "warning"}>
          {currentUserRole === "owner" ? "Owner controls role assignment" : "View only for admins"}
        </Badge>
      </div>
      <div className="px-5 pb-4 pt-3">
        <TextField
          label="Search users"
          placeholder="Name, email, phone..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/4 text-slate-400">
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-white/6 text-slate-200">
                <td className="px-5 py-4">{user.name}</td>
                <td className="px-5 py-4">{user.email}</td>
                <td className="px-5 py-4">{user.phone || "-"}</td>
                <td className="px-5 py-4">
                  <Badge variant={user.role === "owner" ? "success" : user.role === "admin" ? "warning" : "default"}>
                    {user.role}
                  </Badge>
                </td>
                <td className="px-5 py-4">{user.isActive ? "Active" : "Inactive"}</td>
                <td className="px-5 py-4">
                  {currentUserRole === "owner" && user.role !== "owner" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => updateRole(user.id, "admin")} disabled={isPending}>
                        Make admin
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateRole(user.id, "customer")} disabled={isPending}>
                        Make customer
                      </Button>
                    </div>
                  ) : (
                    <span className="text-slate-500">No action</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredUsers.length ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No users match this search.
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

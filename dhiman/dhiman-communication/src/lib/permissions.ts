import type { Role } from "@/types";

export function isAdminRole(role?: Role | null) {
  return role === "owner" || role === "admin";
}

export function isOwnerRole(role?: Role | null) {
  return role === "owner";
}

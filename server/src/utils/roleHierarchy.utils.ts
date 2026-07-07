import { UserRole } from "../models/enums.js";

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.RESTAURANT_OWNER]: 80,
  [UserRole.OUTLET_MANAGER]: 60,
  [UserRole.STAFF]: 40,
};

export const RESTAURANT_JOINABLE_ROLES = [
  UserRole.RESTAURANT_OWNER,
  UserRole.OUTLET_MANAGER,
  UserRole.STAFF,
];

export class RoleHierarchy {
  static rank(role: UserRole): number {
    return ROLE_RANK[role] ?? 0;
  }

  static isKnownRole(role: string): role is UserRole {
    return Object.values(UserRole).includes(role as UserRole);
  }

  static canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
    return this.rank(actorRole) > this.rank(targetRole);
  }

  static canInviteRestaurantRole(actorRole: UserRole, targetRole: UserRole): boolean {
    return RESTAURANT_JOINABLE_ROLES.includes(targetRole) && this.canManageRole(actorRole, targetRole);
  }

  static assignableRestaurantRoles(actorRole: UserRole): UserRole[] {
    return RESTAURANT_JOINABLE_ROLES.filter(role => this.canInviteRestaurantRole(actorRole, role));
  }
}

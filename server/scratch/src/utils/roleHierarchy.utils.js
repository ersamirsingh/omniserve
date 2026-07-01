import { UserRole } from '../enums/enums.js';
const ROLE_RANK = {
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
    static rank(role) {
        return ROLE_RANK[role] ?? 0;
    }
    static isKnownRole(role) {
        return Object.values(UserRole).includes(role);
    }
    static canManageRole(actorRole, targetRole) {
        return this.rank(actorRole) > this.rank(targetRole);
    }
    static canInviteRestaurantRole(actorRole, targetRole) {
        return RESTAURANT_JOINABLE_ROLES.includes(targetRole) && this.canManageRole(actorRole, targetRole);
    }
    static assignableRestaurantRoles(actorRole) {
        return RESTAURANT_JOINABLE_ROLES.filter(role => this.canInviteRestaurantRole(actorRole, role));
    }
}

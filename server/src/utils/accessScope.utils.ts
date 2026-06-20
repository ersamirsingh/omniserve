import { Types } from 'mongoose';
import { UserRole } from '../enums/enums.js';
import Outlet from '../models/outlet.model.js';

interface ScopeUser {
  tenantId: string;
  restaurantId?: string;
  outletId?: string;
  outletIds?: string[];
  role: string;
}

export class AccessScope {
  static isTenantWide(role: string): boolean {
    return role === UserRole.SUPER_ADMIN;
  }

  static isRestaurantScoped(role: string): boolean {
    return role === UserRole.RESTAURANT_OWNER;
  }

  static isOutletScoped(role: string): boolean {
    return role === UserRole.OUTLET_MANAGER || role === UserRole.STAFF;
  }

  static async outletIdsForUser(user?: ScopeUser): Promise<string[] | null> {
    if (!user) return [];
    if (this.isTenantWide(user.role)) return null;

    if (this.isOutletScoped(user.role)) {
      if (user.outletIds && user.outletIds.length > 0) {
        return user.outletIds;
      }
      return user.outletId ? [user.outletId] : [];
    }

    if (this.isRestaurantScoped(user.role)) {
      if (!user.restaurantId) return [];

      const outlets = await Outlet.find({
        tenantId: new Types.ObjectId(user.tenantId),
        restaurantId: new Types.ObjectId(user.restaurantId),
        isDeleted: false,
      }).select('_id');

      return outlets.map(outlet => outlet._id.toString());
    }

    return [];
  }

  static async canAccessRestaurant(user: ScopeUser | undefined, restaurantId: string): Promise<boolean> {
    if (!user) return false;
    if (!Types.ObjectId.isValid(restaurantId)) return false;
    if (this.isTenantWide(user.role)) return true;
    if (this.isRestaurantScoped(user.role)) return user.restaurantId === restaurantId;

    if (this.isOutletScoped(user.role) && user.outletId) {
      const outlet = await Outlet.findOne({
        _id: new Types.ObjectId(user.outletId),
        tenantId: new Types.ObjectId(user.tenantId),
        restaurantId: new Types.ObjectId(restaurantId),
        isDeleted: false,
      }).select('_id');
      return !!outlet;
    }

    return false;
  }

  static async canAccessOutlet(user: ScopeUser | undefined, outletId: string): Promise<boolean> {
    if (!user) return false;
    if (!Types.ObjectId.isValid(outletId)) return false;
    if (this.isTenantWide(user.role)) return true;

    const allowedOutletIds = await this.outletIdsForUser(user);
    if (allowedOutletIds === null) return true;
    return allowedOutletIds.includes(outletId);
  }
}

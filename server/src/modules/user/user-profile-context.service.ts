import { Types } from "mongoose";
import Tenant from "../../models/tenant.model.js";
import Restaurant from "../../models/restaurant.model.js";
import Outlet from "../../models/outlet.model.js";
import { UserRole } from "../../models/enums.js";

export class UserProfileContextService {
  static async resolveProfileContext(user: any) {
    const tenantId = user.tenantId ? new Types.ObjectId(user.tenantId) : null;
    const tenant = tenantId ? await Tenant.findOne({ _id: tenantId, isDeleted: false }).lean() : null;

    let restaurants: any[] = [];
    let outlets: any[] = [];

    if (user.role === UserRole.SUPER_ADMIN) {
      if (tenantId) {
        restaurants = await Restaurant.find({ tenantId, isDeleted: false }).lean();
        const restaurantIds = restaurants.map(r => r._id);
        outlets = await Outlet.find({ restaurantId: { $in: restaurantIds }, tenantId, isDeleted: false }).lean();
      }
    } else if (user.role === UserRole.RESTAURANT_OWNER) {
      if (tenantId && user.restaurantId) {
        const rest = await Restaurant.findOne({ _id: new Types.ObjectId(user.restaurantId), tenantId, isDeleted: false }).lean();
        if (rest) {
          restaurants = [rest];
          outlets = await Outlet.find({ restaurantId: rest._id, tenantId, isDeleted: false }).lean();
        }
      }
    } else if ([UserRole.OUTLET_MANAGER, UserRole.STAFF].includes(user.role as UserRole)) {
      if (tenantId && user.restaurantId) {
        const rest = await Restaurant.findOne({ _id: new Types.ObjectId(user.restaurantId), tenantId, isDeleted: false }).lean();
        if (rest) {
          restaurants = [rest];
        }
      }
      const myOutletIds: Types.ObjectId[] = [];
      if (user.outletId) {
        myOutletIds.push(new Types.ObjectId(user.outletId));
      }
      if (user.outletIds && user.outletIds.length > 0) {
        user.outletIds.forEach((id: any) => {
          const oid = new Types.ObjectId(id);
          if (!myOutletIds.some(item => item.equals(oid))) {
            myOutletIds.push(oid);
          }
        });
      }
      if (tenantId && myOutletIds.length > 0) {
        outlets = await Outlet.find({ _id: { $in: myOutletIds }, tenantId, isDeleted: false }).lean();
      }
    }

    return {
      user: {
        id: user._id || user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status
      },
      hierarchy: {
        tenant,
        restaurants,
        outlets
      },
      permissions: {
        canManageRestaurants: [UserRole.SUPER_ADMIN].includes(user.role as UserRole),
        canManageOutlets: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER].includes(user.role as UserRole),
        canManageTeam: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER].includes(user.role as UserRole),
        canManageInventory: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER].includes(user.role as UserRole),
        canManageFloor: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER].includes(user.role as UserRole),
      }
    };
  }
}

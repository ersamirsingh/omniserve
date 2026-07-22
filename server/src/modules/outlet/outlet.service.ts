import { Types } from 'mongoose';
import Outlet, { IOutlet } from "../../models/outlet.model.js";
import Restaurant from "../../models/restaurant.model.js";
import { UserStatus } from "../../models/enums.js";
import { escapeRegex } from "../../utils/sanitize.utils.js";

export class OutletService {

  static async validateRestaurantOwnership(restaurantId: string, tenantId: string): Promise<boolean> {
    try {
      const restaurant = await Restaurant.findOne({
        _id: new Types.ObjectId(restaurantId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      return !!restaurant;
    } catch {
      return false;
    }
  }

  static async createOutlet(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IOutlet> {

    const isOwner = await this.validateRestaurantOwnership(data.restaurantId, tenantId);
    if (!isOwner) {
      throw new Error('Restaurant not found or does not belong to this tenant');
    }

    const outlet = new Outlet({
      ...data,
      restaurantId: new Types.ObjectId(data.restaurantId),
      tenantId: new Types.ObjectId(tenantId),
      status: UserStatus.ACTIVE,
      isDeleted: false,
      createdBy: userId ? new Types.ObjectId(userId) : null,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
    });

    return await outlet.save();
  }

  static async getOutlets(
    tenantId: string,
    filters: { restaurantId?: string; status?: UserStatus; city?: string; limit: number; skip: number; ids?: string[] }
  ): Promise<{ outlets: IOutlet[]; total: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.restaurantId) {
      query.restaurantId = new Types.ObjectId(filters.restaurantId);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.city) {

      query.city = { $regex: new RegExp(`^${escapeRegex(filters.city)}$`, 'i') };
    }

    if (filters.ids) {
      query._id = { $in: filters.ids.map(id => new Types.ObjectId(id)) };
    }

    const outlets = await Outlet.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit)
      .skip(filters.skip);

    const total = await Outlet.countDocuments(query);

    return { outlets, total };
  }

  static async getOutletById(id: string, tenantId: string): Promise<IOutlet | null> {
    return await Outlet.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  static async updateOutletDetails(
    id: string,
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IOutlet | null> {

    if (data.restaurantId) {
      const isOwner = await this.validateRestaurantOwnership(data.restaurantId, tenantId);
      if (!isOwner) {
        throw new Error('Restaurant not found or does not belong to this tenant');
      }
    }

    const updatePayload: any = {
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      phone: data.phone,
      email: data.email,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
    };

    if (data.restaurantId) {
      updatePayload.restaurantId = new Types.ObjectId(data.restaurantId);
    }

    if (data.location) {
      updatePayload.location = data.location;
    }

    return await Outlet.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      updatePayload,
      { new: true }
    );
  }

  static async updateOutletStatus(
    id: string,
    tenantId: string,
    status: UserStatus,
    userId?: string
  ): Promise<IOutlet | null> {
    return await Outlet.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        status,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
      { new: true }
    );
  }

  static async updateOperatingHours(
    id: string,
    tenantId: string,
    operatingHours: any[],
    userId?: string
  ): Promise<IOutlet | null> {
    return await Outlet.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        operatingHours,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
      { new: true }
    );
  }

  static async deleteOutlet(
    id: string,
    tenantId: string,
    userId?: string
  ): Promise<IOutlet | null> {
    return await Outlet.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        isDeleted: true,
        status: UserStatus.INACTIVE,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
      { new: true }
    );
  }

  static async findNearbyOutlets(
    lng: number,
    lat: number,
    radiusMeters: number,
    tenantId?: string
  ): Promise<any[]> {
    const geoQuery: any = { isDeleted: false };

    if (tenantId) {
      geoQuery.tenantId = new Types.ObjectId(tenantId);
    }

    return await Outlet.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          distanceField: 'distance',
          maxDistance: radiusMeters,
          spherical: true,
          query: geoQuery,
        },
      },
    ]);
  }
}

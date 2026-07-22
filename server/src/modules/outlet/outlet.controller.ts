import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { OutletService } from "./outlet.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { UserStatus, WeekDay, UserRole } from "../../models/enums.js";
import { AccessScope } from "../../utils/accessScope.utils.js";
import { EventBusService } from "../../events/eventBus.js";

export class OutletController {

  private static normalizeDay(dayStr: string): WeekDay | null {
    if (!dayStr) return null;
    const lower = dayStr.trim().toLowerCase();

    const mapping: Record<string, WeekDay> = {
      monday: WeekDay.MONDAY,
      tuesday: WeekDay.TUESDAY,
      wednesday: WeekDay.WEDNESDAY,
      thursday: WeekDay.THURSDAY,
      friday: WeekDay.FRIDAY,
      saturday: WeekDay.SATURDAY,
      sunday: WeekDay.SUNDAY,
    };

    return mapping[lower] || null;
  }

  private static isValidTime(timeStr: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(timeStr);
  }

  static async createOutlet(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const {
        restaurantId,
        name,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        location,
        operatingHours,
      } = req.body;

      if (!restaurantId || !name || !address || !city || !state || !pincode) {
        ApiResponseHandler.badRequest(res, 'restaurantId, name, address, city, state, and pincode are required');
        return;
      }

      if (!Types.ObjectId.isValid(restaurantId)) {
        ApiResponseHandler.badRequest(res, 'Invalid restaurantId format');
        return;
      }

      if (!(await AccessScope.canAccessRestaurant(req.user, restaurantId))) {
        ApiResponseHandler.forbidden(res, 'You cannot create outlets for this restaurant');
        return;
      }

      if (!/^\d{6}$/.test(pincode)) {
        ApiResponseHandler.badRequest(res, 'Pincode must be exactly a 6-digit number');
        return;
      }

      if (phone && !/^\+?[\d\s\-().]{7,20}$/.test(phone)) {
        ApiResponseHandler.badRequest(res, 'Invalid phone number format');
        return;
      }

      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        ApiResponseHandler.badRequest(res, 'Invalid email address format');
        return;
      }

      let parsedLocation = undefined;
      if (!location || !location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
        ApiResponseHandler.badRequest(res, 'Location coordinates are required as an array of [longitude, latitude]');
        return;
      }

      const [lng, lat] = location.coordinates.map(Number);
      if (isNaN(lng) || isNaN(lat)) {
        ApiResponseHandler.badRequest(res, 'Coordinates must be valid numbers');
        return;
      }

      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        ApiResponseHandler.badRequest(res, 'Longitude must be between -180 and 180, and Latitude between -90 and 90');
        return;
      }

      if (lng === 0 && lat === 0) {
        ApiResponseHandler.badRequest(res, 'Valid non-zero coordinates are required for the outlet location');
        return;
      }

      parsedLocation = {
        type: 'Point',
        coordinates: [lng, lat],
      };

      const parsedOperatingHours: any[] = [];
      if (operatingHours) {
        if (!Array.isArray(operatingHours)) {
          ApiResponseHandler.badRequest(res, 'operatingHours must be an array');
          return;
        }

        for (const item of operatingHours) {
          const { day, openTime, closeTime, isClosed } = item;
          if (!day || !openTime || !closeTime) {
            ApiResponseHandler.badRequest(res, 'Each operatingHour item requires day, openTime, and closeTime');
            return;
          }

          const normalizedDay = OutletController.normalizeDay(day);
          if (!normalizedDay) {
            ApiResponseHandler.badRequest(res, `Invalid day of week: ${day}`);
            return;
          }

          if (!OutletController.isValidTime(openTime) || !OutletController.isValidTime(closeTime)) {
            ApiResponseHandler.badRequest(res, 'openTime and closeTime must be in HH:MM (24h) format');
            return;
          }

          parsedOperatingHours.push({
            day: normalizedDay,
            openTime,
            closeTime,
            isClosed: !!isClosed,
          });
        }
      }

      const newOutletData = {
        restaurantId,
        name,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        location: parsedLocation,
        operatingHours: parsedOperatingHours,
      };

      const outlet = await OutletService.createOutlet(
        req.user.tenantId,
        newOutletData,
        req.user.userId
      );

      ApiResponseHandler.success(res, 201, 'Outlet created successfully', {
        id: outlet._id,
        restaurantId: outlet.restaurantId,
        tenantId: outlet.tenantId,
        name: outlet.name,
        address: outlet.address,
        city: outlet.city,
        state: outlet.state,
        pincode: outlet.pincode,
        phone: outlet.phone,
        email: outlet.email,
        location: outlet.location,
        operatingHours: outlet.operatingHours,
        status: outlet.status,
        createdAt: outlet.createdAt,
        updatedAt: outlet.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to create outlet');
    }
  }

  static async listOutlets(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.role === UserRole.SYSTEM_ADMIN) {
        const Outlet = mongoose.model('Outlet');
        const filter: any = { isDeleted: false };
        if (req.query.restaurantId && Types.ObjectId.isValid(req.query.restaurantId as string)) {
          filter.restaurantId = new Types.ObjectId(req.query.restaurantId as string);
        }
        const outlets = await Outlet.find(filter).sort({ name: 1 }).lean();
        res.status(200).json({
          success: true,
          message: 'Outlets fetched successfully',
          data: { outlets },
          outlets,
        });
        return;
      }

      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      let restaurantId = req.query.restaurantId as string | undefined;
      const status = req.query.status as string | undefined;
      const city = req.query.city as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const defaultLimit = (req.user?.role === UserRole.SUPER_ADMIN || req.user?.role === UserRole.SYSTEM_ADMIN || req.user?.role === UserRole.RESTAURANT_OWNER) ? 200 : 20;
      const limit = Math.min(parseInt(req.query.limit as string) || defaultLimit, 500);
      const skip = (page - 1) * limit;

      if (restaurantId && !Types.ObjectId.isValid(restaurantId)) {
        ApiResponseHandler.badRequest(res, 'Invalid restaurantId query parameter format');
        return;
      }

      if (restaurantId && !(await AccessScope.canAccessRestaurant(req.user, restaurantId))) {
        ApiResponseHandler.forbidden(res, 'You cannot access outlets for this restaurant');
        return;
      }

      let normalizedStatus: UserStatus | undefined = undefined;
      if (status) {
        const statusUpper = status.trim().toUpperCase();
        if (statusUpper === 'ACTIVE') {
          normalizedStatus = UserStatus.ACTIVE;
        } else if (statusUpper === 'INACTIVE') {
          normalizedStatus = UserStatus.INACTIVE;
        } else if (statusUpper === 'BLOCKED') {
          normalizedStatus = UserStatus.BLOCKED;
        } else {
          ApiResponseHandler.badRequest(res, 'Invalid status filter. Must be active, inactive, or blocked');
          return;
        }
      }

      const allowedOutletIds = await AccessScope.outletIdsForUser(req.user);

      const filters: {
        restaurantId?: string;
        status?: UserStatus;
        city?: string;
        limit: number;
        skip: number;
        ids?: string[];
      } = { limit, skip };

      if (!restaurantId && AccessScope.isRestaurantScoped(req.user.role) && req.user.restaurantId) {
        restaurantId = req.user.restaurantId;
      }

      if (restaurantId) filters.restaurantId = restaurantId;
      if (normalizedStatus) filters.status = normalizedStatus;
      if (city) filters.city = city;
      if (allowedOutletIds !== null) filters.ids = allowedOutletIds;

      const { outlets, total } = await OutletService.getOutlets(req.user.tenantId, filters);

      ApiResponseHandler.success(res, 200, 'Outlets retrieved successfully', {
        outlets: outlets.map(outlet => ({
          id: outlet._id,
          restaurantId: outlet.restaurantId,
          tenantId: outlet.tenantId,
          name: outlet.name,
          address: outlet.address,
          city: outlet.city,
          state: outlet.state,
          pincode: outlet.pincode,
          phone: outlet.phone,
          email: outlet.email,
          location: outlet.location,
          operatingHours: outlet.operatingHours,
          status: outlet.status,
          createdAt: outlet.createdAt,
          updatedAt: outlet.updatedAt,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list outlets');
    }
  }

  static async getOutletById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid outlet ID format');
        return;
      }

      const outlet = await OutletService.getOutletById(id, req.user.tenantId);
      if (!outlet) {
        ApiResponseHandler.notFound(res, 'Outlet not found');
        return;
      }
      if (!(await AccessScope.canAccessOutlet(req.user, id))) {
        ApiResponseHandler.forbidden(res, 'You cannot access this outlet');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Outlet details retrieved', {
        id: outlet._id,
        restaurantId: outlet.restaurantId,
        tenantId: outlet.tenantId,
        name: outlet.name,
        address: outlet.address,
        city: outlet.city,
        state: outlet.state,
        pincode: outlet.pincode,
        phone: outlet.phone,
        email: outlet.email,
        location: outlet.location,
        operatingHours: outlet.operatingHours,
        status: outlet.status,
        createdAt: outlet.createdAt,
        updatedAt: outlet.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve outlet');
    }
  }

  static async updateOutlet(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid outlet ID format');
        return;
      }

      const {
        restaurantId,
        name,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        location,
      } = req.body;

      if (!restaurantId || !name || !address || !city || !state || !pincode) {
        ApiResponseHandler.badRequest(res, 'restaurantId, name, address, city, state, and pincode are required for replacement');
        return;
      }

      if (!Types.ObjectId.isValid(restaurantId)) {
        ApiResponseHandler.badRequest(res, 'Invalid restaurantId format');
        return;
      }

      if (!(await AccessScope.canAccessOutlet(req.user, id)) || !(await AccessScope.canAccessRestaurant(req.user, restaurantId))) {
        ApiResponseHandler.forbidden(res, 'You cannot update this outlet');
        return;
      }

      if (!/^\d{6}$/.test(pincode)) {
        ApiResponseHandler.badRequest(res, 'Pincode must be exactly a 6-digit number');
        return;
      }

      if (phone && !/^\+?[\d\s\-().]{7,20}$/.test(phone)) {
        ApiResponseHandler.badRequest(res, 'Invalid phone number format');
        return;
      }

      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        ApiResponseHandler.badRequest(res, 'Invalid email address format');
        return;
      }

      let parsedLocation = undefined;
      if (!location || !location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
        ApiResponseHandler.badRequest(res, 'Location coordinates are required as [longitude, latitude]');
        return;
      }

      const [lng, lat] = location.coordinates.map(Number);
      if (isNaN(lng) || isNaN(lat)) {
        ApiResponseHandler.badRequest(res, 'Coordinates must be valid numbers');
        return;
      }

      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        ApiResponseHandler.badRequest(res, 'Longitude must be between -180 and 180, and Latitude between -90 and 90');
        return;
      }

      if (lng === 0 && lat === 0) {
        ApiResponseHandler.badRequest(res, 'Valid non-zero coordinates are required for the outlet location');
        return;
      }

      parsedLocation = {
        type: 'Point',
        coordinates: [lng, lat],
      };

      const updateData = {
        restaurantId,
        name,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        location: parsedLocation,
      };

      const updatedOutlet = await OutletService.updateOutletDetails(
        id,
        req.user.tenantId,
        updateData,
        req.user.userId
      );

      if (!updatedOutlet) {
        ApiResponseHandler.notFound(res, 'Outlet not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Outlet details updated', {
        id: updatedOutlet._id,
        restaurantId: updatedOutlet.restaurantId,
        tenantId: updatedOutlet.tenantId,
        name: updatedOutlet.name,
        address: updatedOutlet.address,
        city: updatedOutlet.city,
        state: updatedOutlet.state,
        pincode: updatedOutlet.pincode,
        phone: updatedOutlet.phone,
        email: updatedOutlet.email,
        location: updatedOutlet.location,
        operatingHours: updatedOutlet.operatingHours,
        status: updatedOutlet.status,
        createdAt: updatedOutlet.createdAt,
        updatedAt: updatedOutlet.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to update outlet');
    }
  }

  static async toggleOutletStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      if (req.user.role === 'STAFF') {
        ApiResponseHandler.forbidden(res, 'Staff cannot toggle outlet status');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid outlet ID format');
        return;
      }

      const { status } = req.body;
      if (!status) {
        ApiResponseHandler.badRequest(res, 'status parameter is required');
        return;
      }

      if (!(await AccessScope.canAccessOutlet(req.user, id))) {
        ApiResponseHandler.forbidden(res, 'You cannot update this outlet');
        return;
      }

      const statusUpper = status.trim().toUpperCase();
      let userStatus: UserStatus;
      if (statusUpper === 'ACTIVE') {
        userStatus = UserStatus.ACTIVE;
      } else if (statusUpper === 'INACTIVE') {
        userStatus = UserStatus.INACTIVE;
      } else {
        ApiResponseHandler.badRequest(res, 'status must be active or inactive');
        return;
      }

      const oldOutlet = await OutletService.getOutletById(id, req.user.tenantId);
      if (!oldOutlet) {
        ApiResponseHandler.notFound(res, 'Outlet not found');
        return;
      }

      if (userStatus === UserStatus.ACTIVE) {
        const coords = oldOutlet.location?.coordinates;
        if (!coords || coords.length !== 2 || (coords[0] === 0 && coords[1] === 0)) {
          ApiResponseHandler.badRequest(res, 'Outlet location coordinates must be configured before opening/activating the outlet.');
          return;
        }
      }

      const previousStatus = oldOutlet.status;

      const updatedOutlet = await OutletService.updateOutletStatus(
        id,
        req.user.tenantId,
        userStatus,
        req.user.userId
      );

      if (!updatedOutlet) {
        ApiResponseHandler.notFound(res, 'Outlet not found');
        return;
      }

      await EventBusService.publishOutletStatusChanged(
        req.user.tenantId,
        updatedOutlet._id,
        {
          outletId: updatedOutlet._id.toString(),
          previousStatus: previousStatus,
          newStatus: userStatus,
          changedBy: req.user.userId,
          changedAt: new Date(),
        },
        { createdBy: req.user.userId }
      );

      ApiResponseHandler.success(res, 200, 'Outlet status updated', {
        id: updatedOutlet._id,
        name: updatedOutlet.name,
        status: updatedOutlet.status,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to update outlet status');
    }
  }

  static async updateOperatingHours(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid outlet ID format');
        return;
      }

      const { operatingHours } = req.body;
      if (!operatingHours || !Array.isArray(operatingHours)) {
        ApiResponseHandler.badRequest(res, 'operatingHours array is required');
        return;
      }

      if (!(await AccessScope.canAccessOutlet(req.user, id))) {
        ApiResponseHandler.forbidden(res, 'You cannot update this outlet');
        return;
      }

      const parsedOperatingHours: any[] = [];
      for (const item of operatingHours) {
        const { day, openTime, closeTime, isClosed } = item;
        if (!day || !openTime || !closeTime) {
          ApiResponseHandler.badRequest(res, 'Each operatingHour item requires day, openTime, and closeTime');
          return;
        }

        const normalizedDay = OutletController.normalizeDay(day);
        if (!normalizedDay) {
          ApiResponseHandler.badRequest(res, `Invalid day of week: ${day}`);
          return;
        }

        if (!OutletController.isValidTime(openTime) || !OutletController.isValidTime(closeTime)) {
          ApiResponseHandler.badRequest(res, 'openTime and closeTime must be in HH:MM (24h) format');
          return;
        }

        parsedOperatingHours.push({
          day: normalizedDay,
          openTime,
          closeTime,
          isClosed: !!isClosed,
        });
      }

      const updatedOutlet = await OutletService.updateOperatingHours(
        id,
        req.user.tenantId,
        parsedOperatingHours,
        req.user.userId
      );

      if (!updatedOutlet) {
        ApiResponseHandler.notFound(res, 'Outlet not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Operating hours updated', {
        id: updatedOutlet._id,
        operatingHours: updatedOutlet.operatingHours,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to update operating hours');
    }
  }

  static async deleteOutlet(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid outlet ID format');
        return;
      }

      if (!(await AccessScope.canAccessOutlet(req.user, id))) {
        ApiResponseHandler.forbidden(res, 'You cannot delete this outlet');
        return;
      }

      const deletedOutlet = await OutletService.deleteOutlet(id, req.user.tenantId, req.user.userId);
      if (!deletedOutlet) {
        ApiResponseHandler.notFound(res, 'Outlet not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Outlet deleted successfully');
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to delete outlet');
    }
  }

  static async findNearbyOutlets(req: Request, res: Response): Promise<void> {
    try {
      const lng = req.query.lng as string | undefined;
      const lat = req.query.lat as string | undefined;
      const radius = req.query.radius as string | undefined;
      const tenantId = req.query.tenantId as string | undefined;

      if (!lng || !lat) {
        ApiResponseHandler.badRequest(res, 'lng and lat query parameters are required');
        return;
      }

      const numLng = Number(lng);
      const numLat = Number(lat);
      const radiusMeters = Number(radius) || 5000;

      if (isNaN(numLng) || isNaN(numLat)) {
        ApiResponseHandler.badRequest(res, 'lng and lat must be valid numbers');
        return;
      }

      if (numLng < -180 || numLng > 180 || numLat < -90 || numLat > 90) {
        ApiResponseHandler.badRequest(res, 'Longitude must be between -180 and 180, and Latitude between -90 and 90');
        return;
      }

      let activeTenantId: string | undefined = req.user?.tenantId;
      if (!activeTenantId && tenantId) {
        if (Types.ObjectId.isValid(tenantId)) {
          activeTenantId = tenantId;
        } else {
          ApiResponseHandler.badRequest(res, 'Invalid tenantId query parameter format');
          return;
        }
      }

      const outlets = await OutletService.findNearbyOutlets(
        numLng,
        numLat,
        radiusMeters,
        activeTenantId
      );

      const formattedOutlets = outlets.map(outlet => {
        const { _id, ...rest } = outlet;
        return {
          id: _id,
          ...rest,
        };
      });

      ApiResponseHandler.success(res, 200, 'Nearby outlets retrieved successfully', formattedOutlets);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to search nearby outlets');
    }
  }
}

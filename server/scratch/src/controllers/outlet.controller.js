import { Types } from 'mongoose';
import { OutletService } from '../services/outlet.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
import { UserStatus, WeekDay } from '../enums/enums.js';
import { AccessScope } from '../utils/accessScope.utils.js';
export class OutletController {
    /**
     * Helper to normalize lowercase/mixed-case day string to PascalCase WeekDay enum value
     */
    static normalizeDay(dayStr) {
        if (!dayStr)
            return null;
        const lower = dayStr.trim().toLowerCase();
        const mapping = {
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
    /**
     * Helper to validate HH:MM time string format
     */
    static isValidTime(timeStr) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        return timeRegex.test(timeStr);
    }
    /**
     * Create a new outlet
     * POST /outlets
     */
    static async createOutlet(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { restaurantId, name, address, city, state, pincode, phone, email, location, operatingHours, } = req.body;
            // Validate required fields
            if (!restaurantId || !name || !address || !city || !state || !pincode) {
                ApiResponseHandler.badRequest(res, 'restaurantId, name, address, city, state, and pincode are required');
                return;
            }
            // Validate ObjectIds
            if (!Types.ObjectId.isValid(restaurantId)) {
                ApiResponseHandler.badRequest(res, 'Invalid restaurantId format');
                return;
            }
            if (!(await AccessScope.canAccessRestaurant(req.user, restaurantId))) {
                ApiResponseHandler.forbidden(res, 'You cannot create outlets for this restaurant');
                return;
            }
            // Validate pincode (6-digit)
            if (!/^\d{6}$/.test(pincode)) {
                ApiResponseHandler.badRequest(res, 'Pincode must be exactly a 6-digit number');
                return;
            }
            // Validate phone if provided
            if (phone && !/^\+?[\d\s\-().]{7,20}$/.test(phone)) {
                ApiResponseHandler.badRequest(res, 'Invalid phone number format');
                return;
            }
            // Validate email if provided
            if (email && !/^\S+@\S+\.\S+$/.test(email)) {
                ApiResponseHandler.badRequest(res, 'Invalid email address format');
                return;
            }
            // Process and validate location
            let parsedLocation = undefined;
            if (location) {
                if (!location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
                    ApiResponseHandler.badRequest(res, 'location.coordinates must be an array of [longitude, latitude]');
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
                parsedLocation = {
                    type: 'Point',
                    coordinates: [lng, lat],
                };
            }
            // Process and validate operatingHours
            const parsedOperatingHours = [];
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
            const outlet = await OutletService.createOutlet(req.user.tenantId, newOutletData, req.user.userId);
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
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || 'Failed to create outlet');
        }
    }
    /**
     * List outlets for the current tenant
     * GET /outlets
     */
    static async listOutlets(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            let restaurantId = req.query.restaurantId;
            const status = req.query.status;
            const city = req.query.city;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const skip = (page - 1) * limit;
            // Validate filter ObjectId
            if (restaurantId && !Types.ObjectId.isValid(restaurantId)) {
                ApiResponseHandler.badRequest(res, 'Invalid restaurantId query parameter format');
                return;
            }
            if (restaurantId && !(await AccessScope.canAccessRestaurant(req.user, restaurantId))) {
                ApiResponseHandler.forbidden(res, 'You cannot access outlets for this restaurant');
                return;
            }
            // Normalize status query if provided
            let normalizedStatus = undefined;
            if (status) {
                const statusUpper = status.trim().toUpperCase();
                if (statusUpper === 'ACTIVE') {
                    normalizedStatus = UserStatus.ACTIVE;
                }
                else if (statusUpper === 'INACTIVE') {
                    normalizedStatus = UserStatus.INACTIVE;
                }
                else if (statusUpper === 'BLOCKED') {
                    normalizedStatus = UserStatus.BLOCKED;
                }
                else {
                    ApiResponseHandler.badRequest(res, 'Invalid status filter. Must be active, inactive, or blocked');
                    return;
                }
            }
            const filters = { limit, skip };
            if (!restaurantId && AccessScope.isRestaurantScoped(req.user.role) && req.user.restaurantId) {
                restaurantId = req.user.restaurantId;
            }
            if (restaurantId)
                filters.restaurantId = restaurantId;
            if (normalizedStatus)
                filters.status = normalizedStatus;
            if (city)
                filters.city = city;
            const { outlets, total } = await OutletService.getOutlets(req.user.tenantId, filters);
            const allowedOutletIds = await AccessScope.outletIdsForUser(req.user);
            const scopedOutlets = allowedOutletIds === null
                ? outlets
                : outlets.filter(outlet => allowedOutletIds.includes(outlet._id.toString()));
            ApiResponseHandler.success(res, 200, 'Outlets retrieved successfully', {
                outlets: scopedOutlets.map(outlet => ({
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
                    total: scopedOutlets.length,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to list outlets');
        }
    }
    /**
     * Get outlet by ID
     * GET /outlets/:id
     */
    static async getOutletById(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve outlet');
        }
    }
    /**
     * Replace/Update outlet details
     * PUT /outlets/:id
     */
    static async updateOutlet(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid outlet ID format');
                return;
            }
            const { restaurantId, name, address, city, state, pincode, phone, email, location, } = req.body;
            // Validate PUT required fields
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
            if (location) {
                if (!location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
                    ApiResponseHandler.badRequest(res, 'location.coordinates must be [longitude, latitude]');
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
                parsedLocation = {
                    type: 'Point',
                    coordinates: [lng, lat],
                };
            }
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
            const updatedOutlet = await OutletService.updateOutletDetails(id, req.user.tenantId, updateData, req.user.userId);
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
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || 'Failed to update outlet');
        }
    }
    /**
     * Toggle status
     * PATCH /outlets/:id/status
     */
    static async toggleOutletStatus(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
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
            let userStatus;
            if (statusUpper === 'ACTIVE') {
                userStatus = UserStatus.ACTIVE;
            }
            else if (statusUpper === 'INACTIVE') {
                userStatus = UserStatus.INACTIVE;
            }
            else {
                ApiResponseHandler.badRequest(res, 'status must be active or inactive');
                return;
            }
            const updatedOutlet = await OutletService.updateOutletStatus(id, req.user.tenantId, userStatus, req.user.userId);
            if (!updatedOutlet) {
                ApiResponseHandler.notFound(res, 'Outlet not found');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Outlet status updated', {
                id: updatedOutlet._id,
                name: updatedOutlet.name,
                status: updatedOutlet.status,
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to update outlet status');
        }
    }
    /**
     * Update operating hours array
     * PATCH /outlets/:id/operating-hours
     */
    static async updateOperatingHours(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
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
            const parsedOperatingHours = [];
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
            const updatedOutlet = await OutletService.updateOperatingHours(id, req.user.tenantId, parsedOperatingHours, req.user.userId);
            if (!updatedOutlet) {
                ApiResponseHandler.notFound(res, 'Outlet not found');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Operating hours updated', {
                id: updatedOutlet._id,
                operatingHours: updatedOutlet.operatingHours,
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to update operating hours');
        }
    }
    /**
     * Soft-delete an outlet
     * DELETE /outlets/:id
     */
    static async deleteOutlet(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to delete outlet');
        }
    }
    /**
     * Find nearby outlets using 2dsphere index (Public endpoint)
     * GET /outlets/nearby
     */
    static async findNearbyOutlets(req, res) {
        try {
            const lng = req.query.lng;
            const lat = req.query.lat;
            const radius = req.query.radius;
            const tenantId = req.query.tenantId;
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
            // Isolation logic:
            // 1. If authenticated, enforce tenantId filtering.
            // 2. If public, check if a tenantId parameter is provided to filter.
            let activeTenantId = req.user?.tenantId;
            if (!activeTenantId && tenantId) {
                if (Types.ObjectId.isValid(tenantId)) {
                    activeTenantId = tenantId;
                }
                else {
                    ApiResponseHandler.badRequest(res, 'Invalid tenantId query parameter format');
                    return;
                }
            }
            const outlets = await OutletService.findNearbyOutlets(numLng, numLat, radiusMeters, activeTenantId);
            // Map mongoose aggregation results to client shape (id instead of _id)
            const formattedOutlets = outlets.map(outlet => {
                const { _id, ...rest } = outlet;
                return {
                    id: _id,
                    ...rest,
                };
            });
            ApiResponseHandler.success(res, 200, 'Nearby outlets retrieved successfully', formattedOutlets);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to search nearby outlets');
        }
    }
}

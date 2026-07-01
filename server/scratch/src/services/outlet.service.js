import { Types } from 'mongoose';
import Outlet from '../models/outlet.model.js';
import Restaurant from '../models/restaurant.model.js';
import { UserStatus } from '../enums/enums.js';
import { escapeRegex } from '../utils/sanitize.utils.js';
export class OutletService {
    /**
     * Validate that a restaurant exists, is not soft-deleted, and belongs to the specified tenant
     */
    static async validateRestaurantOwnership(restaurantId, tenantId) {
        try {
            const restaurant = await Restaurant.findOne({
                _id: new Types.ObjectId(restaurantId),
                tenantId: new Types.ObjectId(tenantId),
                isDeleted: false,
            });
            return !!restaurant;
        }
        catch {
            return false;
        }
    }
    /**
     * Create a new physical outlet under a restaurant
     */
    static async createOutlet(tenantId, data, userId) {
        // Check restaurant ownership
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
    /**
     * List outlets with filters and pagination
     */
    static async getOutlets(tenantId, filters) {
        const query = {
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
            // Case-insensitive query for city — escaped to prevent ReDoS
            query.city = { $regex: new RegExp(`^${escapeRegex(filters.city)}$`, 'i') };
        }
        const outlets = await Outlet.find(query)
            .sort({ createdAt: -1 })
            .limit(filters.limit)
            .skip(filters.skip);
        const total = await Outlet.countDocuments(query);
        return { outlets, total };
    }
    /**
     * Get an outlet by ID and Tenant ID
     */
    static async getOutletById(id, tenantId) {
        return await Outlet.findOne({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        });
    }
    /**
     * Replace/Update outlet details (PUT operation)
     */
    static async updateOutletDetails(id, tenantId, data, userId) {
        // If restaurantId is being modified, validate it first
        if (data.restaurantId) {
            const isOwner = await this.validateRestaurantOwnership(data.restaurantId, tenantId);
            if (!isOwner) {
                throw new Error('Restaurant not found or does not belong to this tenant');
            }
        }
        const updatePayload = {
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
        return await Outlet.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, updatePayload, { new: true });
    }
    /**
     * Toggle status of an outlet
     */
    static async updateOutletStatus(id, tenantId, status, userId) {
        return await Outlet.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, {
            status,
            updatedBy: userId ? new Types.ObjectId(userId) : null,
        }, { new: true });
    }
    /**
     * Replace operating hours array
     */
    static async updateOperatingHours(id, tenantId, operatingHours, userId) {
        return await Outlet.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, {
            operatingHours,
            updatedBy: userId ? new Types.ObjectId(userId) : null,
        }, { new: true });
    }
    /**
     * Soft-delete an outlet
     */
    static async deleteOutlet(id, tenantId, userId) {
        return await Outlet.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, {
            isDeleted: true,
            status: UserStatus.INACTIVE,
            updatedBy: userId ? new Types.ObjectId(userId) : null,
        }, { new: true });
    }
    /**
     * Geospatial aggregation to find outlets near search center
     */
    static async findNearbyOutlets(lng, lat, radiusMeters, tenantId) {
        const geoQuery = { isDeleted: false };
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

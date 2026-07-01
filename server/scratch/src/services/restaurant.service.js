import Restaurant from '../models/restaurant.model.js';
import { UserStatus } from '../enums/enums.js';
export class RestaurantService {
    static async createRestaurant(tenantId, name, description, brandName, gstNumber, logoUrl) {
        const restaurant = await Restaurant.create({
            tenantId,
            name,
            description,
            brandName,
            gstNumber,
            logoUrl,
            status: UserStatus.ACTIVE,
            createdBy: tenantId
        });
        return restaurant;
    }
    static async getRestaurants(tenantId) {
        const restaurants = await Restaurant.find({ tenantId });
        if (!restaurants)
            return [];
        return restaurants;
    }
    static async getRestaurantById(restaurantId) {
        const restaurant = await Restaurant.findOne({ _id: restaurantId, isDeleted: false });
        if (!restaurant)
            return null;
        return restaurant;
    }
    static async updateRestaurant(tenantId, restaurantId, data) {
        // Explicit allowlist — prevents mass assignment of tenantId, isDeleted, createdBy, etc.
        const allowedFields = {};
        if (data.name !== undefined)
            allowedFields.name = data.name;
        if (data.description !== undefined)
            allowedFields.description = data.description;
        if (data.brandName !== undefined)
            allowedFields.brandName = data.brandName;
        if (data.gstNumber !== undefined)
            allowedFields.gstNumber = data.gstNumber;
        if (data.logoUrl !== undefined)
            allowedFields.logoUrl = data.logoUrl;
        const restaurant = await Restaurant.findOneAndUpdate({ tenantId, _id: restaurantId, isDeleted: false }, allowedFields, { new: true });
        if (!restaurant)
            return null;
        return restaurant;
    }
    static async deleteRestaurant(tenantId, restaurantId) {
        const restaurant = await Restaurant.findOneAndUpdate({ tenantId, _id: restaurantId }, { isDeleted: true }, { new: true });
        if (!restaurant)
            return null;
        return restaurant;
    }
}

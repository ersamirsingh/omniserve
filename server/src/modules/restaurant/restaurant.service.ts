import Restaurant, { IRestaurant } from "../../models/restaurant.model.js";
import { UserStatus } from "../../models/enums.js";

export class RestaurantService {

   static async createRestaurant(tenantId: string, name: string, description: string, brandName: string, gstNumber: string, logoUrl: string) : Promise<IRestaurant> {

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

   static async getRestaurants(tenantId: string) : Promise<IRestaurant[] | null> {
      const restaurants = await Restaurant.find({ tenantId });
      if(!restaurants) return [];
      return restaurants;
   }

   static async getRestaurantById(restaurantId: string) : Promise<IRestaurant | null> {
      const restaurant = await Restaurant.findOne({ _id: restaurantId, isDeleted: false });
      if(!restaurant) return null;
      return restaurant;
   }

   static async updateRestaurant(tenantId: string, restaurantId: string, data: any) : Promise<IRestaurant | null> {

      const allowedFields: Record<string, any> = {};
      if (data.name !== undefined) allowedFields.name = data.name;
      if (data.description !== undefined) allowedFields.description = data.description;
      if (data.brandName !== undefined) allowedFields.brandName = data.brandName;
      if (data.gstNumber !== undefined) allowedFields.gstNumber = data.gstNumber;
      if (data.logoUrl !== undefined) allowedFields.logoUrl = data.logoUrl;

      const restaurant = await Restaurant.findOneAndUpdate(
         { tenantId, _id: restaurantId, isDeleted: false },
         allowedFields,
         { new: true }
      );
      if(!restaurant) return null;
      return restaurant;
   }

   static async deleteRestaurant(tenantId: string, restaurantId: string) : Promise<IRestaurant | null> {
      const restaurant = await Restaurant.findOneAndUpdate({ tenantId, _id: restaurantId }, { isDeleted: true }, { new: true });
      if(!restaurant) return null;
      return restaurant;
   }

}
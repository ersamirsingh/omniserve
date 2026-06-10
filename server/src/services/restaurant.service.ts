import Restaurant, { IRestaurant } from '../models/restaurant.model.js';


export class RestaurantService {



   static async createRestaurant(tenantId: string, name: string, description: string) : Promise<IRestaurant> {
      const restaurant = await Restaurant.create({ tenantId, name, description});
      return restaurant;
   }

}
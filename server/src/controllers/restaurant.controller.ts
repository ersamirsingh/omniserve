import { Request, Response } from 'express';
import { RestaurantService } from '../services/restaurant.service.js';

export class RestaurantController {
   static getRestaurants(req: any, res: any) {
      res.status(200).json({ message: 'Restaurants fetched successfully' });
   }

   static getRestaurantById(req: any, res: any) {
      res.status(200).json({ message: 'Restaurant fetched successfully' });
   }

   static async createRestaurant(req: Request, res: Response): Promise<void> {
      try {
         const { tenantId, name, description } = req.body;
         if (!tenantId || !name || !description) {
            res.status(400).json({
               success: false,
               message: 'tenantId, name, and description are required',
            });
            return;
         }

         const restaurant = await RestaurantService.createRestaurant(
            tenantId,
            name,
            description
         );
         res.status(200).json({
            sucess: true,
            message: 'Restaurant created successfully',
            restaurant: {
               _id: restaurant._id,
               tenantId: restaurant.tenantId,
               name: restaurant.name,
               description: restaurant.description,
            },
         });
      } catch (error) {
         res.status(500).json({ message: 'Internal server error' });
      }
   }

   static updateRestaurant(req: any, res: any) {
      res.status(200).json({ message: 'Restaurant updated successfully' });
   }

   static deleteRestaurant(req: any, res: any) {
      res.status(200).json({ message: 'Restaurant deleted successfully' });
   }
}

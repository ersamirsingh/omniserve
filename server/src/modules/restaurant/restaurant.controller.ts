import { Request, Response } from 'express';
import { RestaurantService } from "./restaurant.service.js";
import mongoose, { Types } from 'mongoose';
import { RestaurantParams } from "../../types/restro.type.js";
import { UserRole } from "../../models/enums.js";


export class RestaurantController {


   static async getRestaurants(req: Request, res: Response): Promise<void> {

      try {

         const tenantId: string | undefined = req.user?.tenantId;

         if (req.user?.role === UserRole.SYSTEM_ADMIN) {
            const Restaurant = mongoose.model('Restaurant');
            const restaurants = await Restaurant.find({ isDeleted: false }).sort({ name: 1 }).lean();
            res.status(200).json({
               success: true,
               message: 'Restaurants fetched successfully',
               restaurants,
            });
            return;
         }

         if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
            res.status(401).json({
               success: false,
               message: 'User not authenticated or tenantId not found',
            });
            return;
         }
         let restaurants = await RestaurantService.getRestaurants(tenantId) || [];

         if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId) {
            restaurants = restaurants.filter((restaurant: any) => restaurant._id.toString() === req.user?.restaurantId);
         } else if (req.user?.role !== UserRole.SUPER_ADMIN && !req.user?.restaurantId) {
            restaurants = [];
         }

         res.status(200).json({
            success: true,
            message: 'Restaurants fetched successfully',
            restaurants,
         });

      } catch (error: any) {
         res.status(500).json({ message: error.message || 'Restaurants not found' });
      }
   }

   static async getRestaurantById(req: Request<RestaurantParams>, res: Response): Promise<void> {

      try {

         const restaurantId = req.params.id;

         if(!restaurantId || !Types.ObjectId.isValid(restaurantId)) {
            res.status(400).json({
               success: false,
               message: 'Invalid restaurantId',
            });
            return;
         }

         if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.restaurantId && req.user.restaurantId !== restaurantId) {
            res.status(403).json({
               success: false,
               message: 'Access denied for this restaurant',
            });
            return;
         }

         const restaurant = await RestaurantService.getRestaurantById(restaurantId);

         if (!restaurant) {
            res.status(404).json({ message: 'Restaurant not found' });
            return;
         }

         res.status(200).json({
            success: true,
            message: 'Restaurant fetched successfully',
            restaurant,
         });

      } catch (error: any) {
         res.status(500).json({ message: error.message || 'Failed to fetch restaurant by ID' });
      }

   }

   static async createRestaurant(req: Request, res: Response): Promise<void> {
      try {
         const {name, description, brandName, gstNumber, logoUrl} = req.body;
         const tenantId: string | undefined = req.user?.tenantId;
         if (!tenantId || !name || !description) {
            res.status(400).json({
               success: false,
               message: 'tenantId, name, and description are required',
            });
            return;
         }

         if(!Types.ObjectId.isValid(tenantId)) {
            res.status(400).json({
               success: false,
               message: 'Invalid tenantId',
            });
            return;
         }

         const restaurant = await RestaurantService.createRestaurant(
            tenantId,
            name,
            description,
            brandName,
            gstNumber,  
            logoUrl
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

   static async updateRestaurant(req: Request<RestaurantParams>, res: Response): Promise<void> {
      try {

         const { name, description, brandName, gstNumber, logoUrl } = req.body;
         const restaurantId: string = req.params.id;

         const tenantId: string | undefined = req.user?.tenantId;
         if (!tenantId || !restaurantId || !name || !description) {
            res.status(400).json({
               success: false,
               message: 'tenantId, restaurantId, name, and description are required',
            });
            return;
         }

         if(!Types.ObjectId.isValid(tenantId)) {
            res.status(400).json({
               success: false,
               message: 'Invalid tenantId or Invalid restaurantId',
            });
            return;
         }

         if(!Types.ObjectId.isValid(restaurantId)) {
            res.status(400).json({
               success: false,
               message: 'Invalid restaurantId',
            });
            return;
         }

         const restaurant = await RestaurantService.updateRestaurant(
            tenantId,
            restaurantId,
            { name, description, brandName, gstNumber, logoUrl }
         );

         if (!restaurant) {
            res.status(404).json({ message: 'Restaurant not found' });
            return;
         }

         res.status(200).json({
            success: true,
            message: 'Restaurant updated successfully',
            restaurant,
         });

      } catch (error: any) {
         res.status(500).json({ message: error.message || 'Failed to update restaurant' });
      }
   }


   static async deleteRestaurant(req: Request<RestaurantParams>, res: Response): Promise<void> {
    
      try {
         const restaurantId = req.params.id;
         const tenantId: string | undefined = req.user?.tenantId;
         if (!tenantId || !restaurantId) {
            res.status(400).json({
               success: false,
               message: 'tenantId and restaurantId are required',
            });
            return;
         }

         if(!Types.ObjectId.isValid(tenantId)) {
            res.status(400).json({
               success: false,
               message: 'Invalid tenantId or Invalid restaurantId',
            });
            return;
         }

         if(!Types.ObjectId.isValid(restaurantId)) {
            res.status(400).json({
               success: false,
               message: 'Invalid restaurantId',
            });
            return;
         }

         const deletedRestaurant = await RestaurantService.deleteRestaurant(tenantId, restaurantId);

         if (!deletedRestaurant) {
            res.status(404).json({ message: 'Restaurant not found' });
            return;
         }

         res.status(200).json({
            success: true,
            message: 'Restaurant deleted successfully',
            deletedRestaurant,
         });

      } catch (error: any) {
         res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete restaurant',
         })
      }
   }

}

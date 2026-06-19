import express, { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller.js';
import { verifyToken, isSuperAdmin, isRestaurantOwner } from '../middleware/auth.middleware.js';


const router: Router = express.Router();

router.get('/', verifyToken, RestaurantController.getRestaurants);
router.post('/', verifyToken, isSuperAdmin, RestaurantController.createRestaurant);
router.get('/:id', verifyToken, isRestaurantOwner, RestaurantController.getRestaurantById);
router.patch('/:id', verifyToken, isSuperAdmin, RestaurantController.updateRestaurant);
router.delete('/:id', verifyToken, isSuperAdmin, RestaurantController.deleteRestaurant);


export default router;

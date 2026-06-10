import express, { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router: Router = express.Router();

router.get('/', verifyToken, RestaurantController.getRestaurants);
router.get('/:id', verifyToken, RestaurantController.getRestaurantById);
router.post('/', verifyToken, RestaurantController.createRestaurant);
router.patch('/:id', verifyToken, RestaurantController.updateRestaurant);
router.delete('/:id', verifyToken, RestaurantController.deleteRestaurant);


export default router;
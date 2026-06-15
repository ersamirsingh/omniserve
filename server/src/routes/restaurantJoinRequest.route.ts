import express, { Router } from 'express';
import { RestaurantJoinRequestController } from '../controllers/restaurantJoinRequest.controller.js';
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../enums/enums.js';

const router: Router = express.Router();

router.get(
  '/roles/assignable',
  verifyToken,
  RestaurantJoinRequestController.getAssignableRoles
);

router.post(
  '/accept/:token',
  RestaurantJoinRequestController.acceptByToken
);

router.get(
  '/restaurants/:restaurantId',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  RestaurantJoinRequestController.listJoinRequests
);

router.post(
  '/restaurants/:restaurantId',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  RestaurantJoinRequestController.createJoinRequest
);

router.post(
  '/:requestId/messages',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  RestaurantJoinRequestController.addMessage
);

router.patch(
  '/:requestId/decision',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  RestaurantJoinRequestController.rejectOrCancel
);

export default router;

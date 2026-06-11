import express, { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../enums/enums.js';

const router: Router = express.Router();

// Get list of users (Auth required, restricted to Outlet Manager and above)
router.get(
  '/',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  UserController.listUsers
);

// Create user (Auth required, restricted to Restaurant Owner and above)
router.post(
  '/',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER),
  UserController.createUser
);

// Get user details by ID (Auth required, restricted to Outlet Manager and above)
router.get(
  '/:id',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  UserController.getUserById
);

// Update user details (Auth required, restricted to Restaurant Owner and above)
router.put(
  '/:id',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER),
  UserController.updateUser
);

// Soft-delete user (Auth required, restricted to Restaurant Owner and above)
router.delete(
  '/:id',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER),
  UserController.deleteUser
);

export default router;

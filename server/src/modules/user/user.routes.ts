import express, { Router } from 'express';
import { UserController } from "./user.controller.js";
import { verifyToken, authorizeRole } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../models/enums.js";

const router: Router = express.Router();

router.patch(
  '/me/accept-invitation',
  verifyToken,
  UserController.acceptMyInvitation
);

router.get(
  '/me/profile-context',
  verifyToken,
  UserController.getMyProfileContext
);

// Get list of users (Auth required, restricted to Restaurant Owner, Outlet Manager and above)
router.get(
  '/',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  UserController.listUsers
);

// Create user (Auth required, restricted to Restaurant Owner, Outlet Manager and above)
router.post(
  '/',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  UserController.createUser
);

// Get user details by ID (Auth required, restricted to Restaurant Owner, Outlet Manager and above)
router.get(
  '/:id',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  UserController.getUserById
);

// Update user details (Auth required, restricted to Restaurant Owner and above, or self-update)
router.put(
  '/:id',
  verifyToken,
  UserController.updateUser
);

// Soft-delete user (Auth required, restricted to Restaurant Owner, Outlet Manager and above)
router.delete(
  '/:id',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  UserController.deleteUser
);

export default router;

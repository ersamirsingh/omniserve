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

router.get(
  '/',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  UserController.listUsers
);

router.post(
  '/',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  UserController.createUser
);

router.get(
  '/:id',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  UserController.getUserById
);

router.put(
  '/:id',
  verifyToken,
  UserController.updateUser
);

router.delete(
  '/:id',
  verifyToken,
  authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER),
  UserController.deleteUser
);

export default router;

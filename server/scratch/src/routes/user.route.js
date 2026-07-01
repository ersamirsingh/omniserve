import express from 'express';
import { UserController } from '../controllers/user.controller.js';
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../enums/enums.js';
const router = express.Router();
router.patch('/me/accept-invitation', verifyToken, UserController.acceptMyInvitation);
// Get list of users (Auth required, restricted to Restaurant Owner and above)
router.get('/', verifyToken, authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER), UserController.listUsers);
// Create user (Auth required, restricted to Restaurant Owner and above)
router.post('/', verifyToken, authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER), UserController.createUser);
// Get user details by ID (Auth required, restricted to Restaurant Owner and above)
router.get('/:id', verifyToken, authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER), UserController.getUserById);
// Update user details (Auth required, restricted to Restaurant Owner and above, or self-update)
router.put('/:id', verifyToken, UserController.updateUser);
// Soft-delete user (Auth required, restricted to Restaurant Owner and above)
router.delete('/:id', verifyToken, authorizeRole(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER), UserController.deleteUser);
export default router;

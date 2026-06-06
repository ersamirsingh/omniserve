// Quick Integration Guide for Authentication System
// Import these in your route files or controllers

import { verifyToken, authorizeRole, isSuperAdmin, isRestaurantOwner, isOutletManager } from '../middleware/auth.middleware';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../enums/enums';
import { Request, Response } from 'express';

// ============================================
// EXAMPLE 1: Simple Protected Route
// ============================================
router.get('/protected-endpoint', verifyToken, (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const tenantId = req.user?.tenantId;
  const email = req.user?.email;
  
  res.json({
    message: 'This is a protected endpoint',
    userId,
    tenantId,
    email,
  });
});

// ============================================
// EXAMPLE 2: Role-Based Access Control
// ============================================

// Only super admin can access
router.get('/admin-dashboard', verifyToken, isSuperAdmin, (req: Request, res: Response) => {
  res.json({ data: 'Admin data' });
});

// Only restaurant owner or above
router.get('/restaurant-stats', verifyToken, isRestaurantOwner, (req: Request, res: Response) => {
  res.json({ data: 'Restaurant statistics' });
});

// Only outlet manager and above
router.get('/outlet-orders', verifyToken, isOutletManager, (req: Request, res: Response) => {
  res.json({ data: 'Outlet orders' });
});

// Multiple specific roles
router.post('/create-order', verifyToken, authorizeRole(UserRole.OUTLET_MANAGER, UserRole.STAFF), (req: Request, res: Response) => {
  res.json({ message: 'Order created' });
});

// ============================================
// EXAMPLE 3: Getting User Information
// ============================================
router.get('/my-profile', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = await AuthService.getUserById(req.user!.userId);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ============================================
// EXAMPLE 4: Action Audit (with user info)
// ============================================
async function performAction(req: Request, res: Response) {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId;
  
  // Your business logic here
  
  // Create audit log
  // await AuditLog.create({
  //   userId,
  //   tenantId,
  //   action: 'ORDER_CREATED',
  //   details: { /* ... */ }
  // });
  
  res.json({ success: true });
}

router.post('/create-item', verifyToken, performAction);

// ============================================
// EXAMPLE 5: Multi-Tenant Resource Access
// ============================================
router.get('/tenant/:id/orders', verifyToken, async (req: Request, res: Response) => {
  // Ensure user belongs to this tenant
  if (req.params.id !== req.user!.tenantId) {
    return res.status(403).json({ error: 'Unauthorized tenant access' });
  }
  
  // Fetch orders for this tenant
  res.json({ orders: [] });
});

// ============================================
// EXAMPLE 6: Verify Token Before Action
// ============================================
router.post('/sensitive-action', verifyToken, async (req: Request, res: Response) => {
  try {
    // Re-verify token to ensure it's still valid
    const decoded = AuthService.verifyAccessToken(
      req.headers.authorization?.split(' ')[1] || ''
    );
    
    if (!decoded) {
      return res.status(401).json({ error: 'Token invalid or expired' });
    }
    
    // Proceed with sensitive action
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Action failed' });
  }
});

// ============================================
// EXAMPLE 7: Optional Authentication
// ============================================
import { optionalAuth } from '../middleware/auth.middleware';

router.get('/public-items', optionalAuth, (req: Request, res: Response) => {
  if (req.user) {
    // User is authenticated - return personalized results
    res.json({ items: [], personalized: true, userId: req.user.userId });
  } else {
    // User is not authenticated - return generic results
    res.json({ items: [], personalized: false });
  }
});

// ============================================
// EXAMPLE 8: Custom Authorization Logic
// ============================================
function isOwnerOrAdmin(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const userId = req.user.userId;
  const resourceOwnerId = req.params.userId;
  const isAdmin = req.user.role === UserRole.SUPER_ADMIN;
  
  if (userId !== resourceOwnerId && !isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  next();
}

router.put('/user/:userId/profile', verifyToken, isOwnerOrAdmin, (req: Request, res: Response) => {
  res.json({ message: 'Profile updated' });
});

// ============================================
// EXAMPLE 9: Password Change Flow
// ============================================
router.post('/change-password', verifyToken, async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    
    // Validation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    
    // Update password
    await AuthService.updatePassword(req.user!.userId, oldPassword, newPassword);
    
    // Optionally revoke all tokens (force re-login)
    await AuthService.revokeAllTokens(req.user!.userId);
    
    res.json({ message: 'Password changed. Please login again.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// EXAMPLE 10: Request Properties Available
// ============================================
/*
After verifyToken middleware, req.user contains:
{
  userId: string;        // User's MongoDB ObjectId
  tenantId: string;      // Tenant's MongoDB ObjectId
  email: string;         // User's email
  role: string;          // One of UserRole enum values
  status: string;        // One of UserStatus enum values
  iat?: number;          // Issued at (timestamp)
  exp?: number;          // Expiration (timestamp)
}
*/

// ============================================
// EXAMPLE 11: Async Controller with Auth
// ============================================
export async function getUserOrders(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;
    
    // Fetch user's orders
    // const orders = await Order.find({ userId, tenantId });
    
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
}

// Apply to route
router.get('/my-orders', verifyToken, getUserOrders);

// ============================================
// TIPS & BEST PRACTICES
// ============================================
/*
1. Always use verifyToken before accessing req.user
2. Use type assertion (req.user!) when you're sure user exists
3. Apply role middleware AFTER verifyToken
4. Multi-tenant: always filter by both userId AND tenantId
5. For sensitive operations, consider additional verification
6. Use optionalAuth for features that work both logged-in and anonymous
7. Keep middleware order: verifyToken → authorization → handler
8. Validate input data even on protected routes
9. Log security events with user context
10. Consider rate limiting on sensitive endpoints
*/

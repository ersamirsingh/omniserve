# UrbanPiper Auth System - Quick Reference

## 🎯 Quick Start (5 Min)

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass@123",
    "firstName": "John",
    "lastName": "Doe",
    "tenantId": "TENANT_ID",
    "role": "OUTLET_MANAGER"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass@123"
  }'
# Returns: accessToken, refreshToken, user data
# Cookies set: accessToken, refreshToken
```

### 3. Access Protected Route
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## 🔐 Protect Your Routes

```typescript
// Import middleware
import { verifyToken, authorizeRole, isSuperAdmin } from '../middleware/auth.middleware';
import { UserRole } from '../enums/enums';

// Basic protection
router.get('/protected', verifyToken, handler);

// Role-specific
router.get('/admin', verifyToken, isSuperAdmin, handler);

// Multiple roles
router.post('/create', verifyToken, authorizeRole(
  UserRole.RESTAURANT_OWNER, 
  UserRole.OUTLET_MANAGER
), handler);
```

## 📦 Get User Info in Handlers

```typescript
function myHandler(req: Request, res: Response) {
  const userId = req.user!.userId;        // String (MongoDB ObjectId)
  const tenantId = req.user!.tenantId;    // String (MongoDB ObjectId)
  const email = req.user!.email;          // String
  const role = req.user!.role;            // UserRole enum
  const status = req.user!.status;        // UserStatus enum
}
```

## 🚀 API Endpoints Quick List

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/auth/register | ❌ | Create new user |
| POST | /api/auth/login | ❌ | Login & get tokens |
| POST | /api/auth/refresh | ❌ | Get new access token |
| POST | /api/auth/verify | ❌ | Check token validity |
| GET | /api/auth/me | ✅ | Get current user |
| POST | /api/auth/logout | ✅ | Logout & revoke token |
| POST | /api/auth/change-password | ✅ | Update password |
| POST | /api/auth/revoke-all | ✅ | Revoke all tokens |

## 💡 Middleware Cheat Sheet

```typescript
import {
  verifyToken,                 // Verify JWT
  verifyTokenFromCookie,       // Verify JWT from cookie
  authorizeRole,               // Check specific roles
  isSuperAdmin,                // Super admin only
  isRestaurantOwner,           // Owner or above
  isOutletManager,             // Manager or above
  optionalAuth                 // Optional authentication
} from '../middleware/auth.middleware';

// Usage
router.get('/route', verifyToken, authorizeRole(UserRole.STAFF), handler);
```

## 🔑 User Roles (Hierarchy)

```
SUPER_ADMIN (highest level)
    ↓
RESTAURANT_OWNER
    ↓
OUTLET_MANAGER
    ↓
STAFF (lowest level)
```

## 📊 User Status

```typescript
ACTIVE    // User can login
INACTIVE  // User cannot login
BLOCKED   // User cannot login
```

## 🔒 Password Requirements

- ✅ Minimum 8 characters
- ✅ At least one UPPERCASE letter
- ✅ At least one lowercase letter
- ✅ At least one number (0-9)
- ✅ At least one special character (@$!%*?&)

Example: `SecurePass@123` ✅

## 🎫 Token Info

| Token | Lifetime | Storage | Rotated |
|-------|----------|---------|---------|
| Access | 24 hours | Cookie + Response | No |
| Refresh | 7 days | Cookie + Database | Yes |

## 🛡️ Cookie Settings

- **HttpOnly**: true (prevents JavaScript access)
- **Secure**: true (HTTPS only)
- **SameSite**: strict (prevents CSRF)
- **Path**: / (all routes)

## 🐛 Common Issues & Solutions

### Issue: "Invalid email or password"
**Solution**: Check credentials and ensure user is ACTIVE (not BLOCKED/INACTIVE)

### Issue: "Token is invalid or expired"
**Solution**: Use `/api/auth/refresh` to get new accessToken

### Issue: "Insufficient permissions"
**Solution**: Verify user role has required access level

### Issue: "No token provided"
**Solution**: Include `Authorization: Bearer <token>` header

### Issue: "CORS error"
**Solution**: Token must be in Authorization header, not cookies (for cross-origin)

## 🔄 Token Refresh Flow

```
1. Login → Get accessToken + refreshToken
   ↓
2. Use accessToken for API calls (24 hours)
   ↓
3. AccessToken expires
   ↓
4. POST /api/auth/refresh with refreshToken
   ↓
5. Get new accessToken + new refreshToken
   ↓
6. Continue using new tokens
```

## 🔌 Service Methods

```typescript
import { AuthService } from '../services/auth.service';

// Check password
const valid = await AuthService.comparePassword(plaintext, hash);

// Get user
const user = await AuthService.getUserById(userId);

// Verify token
const decoded = AuthService.verifyAccessToken(token);

// Hash password
const hash = await AuthService.hashPassword(password);

// Update password
await AuthService.updatePassword(userId, oldPwd, newPwd);

// Revoke all tokens
await AuthService.revokeAllTokens(userId);
```

## 📝 Multi-Tenant Pattern

```typescript
// Always filter by BOTH userId AND tenantId
router.get('/orders', verifyToken, async (req, res) => {
  const orders = await Order.find({
    userId: req.user!.userId,
    tenantId: req.user!.tenantId  // ← Always include tenant filter
  });
});
```

## ✅ Before Going to Production

1. [ ] Change JWT_SECRET to strong random key
2. [ ] Change JWT_REFRESH_SECRET to strong random key
3. [ ] Set NODE_ENV=production
4. [ ] Enable HTTPS
5. [ ] Test all endpoints
6. [ ] Set up monitoring
7. [ ] Configure proper CORS
8. [ ] Add rate limiting
9. [ ] Set up backups

## 📚 Full Documentation

- **AUTH_SYSTEM_README.md** - Complete API docs
- **AUTH_INTEGRATION_GUIDE.md** - Code examples
- **BUILD_SUMMARY.md** - Project overview
- **SYSTEM_ARCHITECTURE.md** - Architecture details

## 🎓 Learning Path

1. Start: Read BUILD_SUMMARY.md
2. Understand: Read AUTH_SYSTEM_README.md
3. Integrate: Read AUTH_INTEGRATION_GUIDE.md
4. Deploy: Check production checklist above

## 🆘 Need Help?

```typescript
// Error responses follow this pattern
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details (optional)"
}

// Success responses follow this pattern
{
  "success": true,
  "message": "Operation description",
  "data": { /* response data */ }
}
```

## 🔄 Common Patterns

### Pattern 1: Simple Protected Route
```typescript
router.get('/data', verifyToken, (req, res) => {
  res.json({ userId: req.user!.userId });
});
```

### Pattern 2: Admin Only Route
```typescript
router.post('/admin', verifyToken, isSuperAdmin, (req, res) => {
  res.json({ message: 'Admin action performed' });
});
```

### Pattern 3: Multi-Tenant Data Access
```typescript
router.get('/my-data', verifyToken, async (req, res) => {
  const data = await Data.find({
    userId: req.user!.userId,
    tenantId: req.user!.tenantId
  });
  res.json(data);
});
```

### Pattern 4: Role-Based Routes
```typescript
router.post('/create-item', verifyToken, authorizeRole(
  UserRole.RESTAURANT_OWNER,
  UserRole.OUTLET_MANAGER
), (req, res) => {
  res.json({ created: true });
});
```

## ⚡ Performance Tips

1. Use `verifyToken` only once per route (at beginning)
2. Cache user lookups if needed
3. Refresh tokens are auto-stored in DB with TTL
4. No need to manually delete expired refresh tokens

## 🎯 Success Indicators

✅ Login returns accessToken + refreshToken
✅ Protected routes require valid token
✅ Expired tokens return 401
✅ Invalid roles return 403
✅ User data includes tenantId
✅ Cookies are set automatically

---

**Quick Ref v1.0** | Last Updated: 2026-06-07

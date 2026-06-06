# Authentication System Documentation

## Overview
This is a complete JWT-based authentication system built for the UrbanPiper multi-tenant food ordering platform. It includes user registration, login, token refresh, and role-based access control.

## Features
- ✅ User registration with password validation
- ✅ Secure login with JWT tokens
- ✅ Refresh token mechanism for long-lived sessions
- ✅ Role-based access control (RBAC)
- ✅ Password hashing with bcrypt
- ✅ Token revocation support
- ✅ Password change functionality
- ✅ User session management
- ✅ Automatic token expiration

## Architecture

### Services (`/src/services/auth.service.ts`)
The `AuthService` class handles all authentication logic:

- **hashPassword()**: Hashes passwords using bcrypt with salt rounds
- **comparePassword()**: Compares plaintext password with hashed password
- **generateAccessToken()**: Creates JWT access tokens (24h expiry)
- **generateRefreshToken()**: Creates JWT refresh tokens (7d expiry) with DB storage
- **verifyAccessToken()**: Validates JWT access tokens
- **verifyRefreshToken()**: Validates JWT refresh tokens
- **register()**: Creates new user with validation
- **login()**: Authenticates user and returns tokens
- **refreshAccessToken()**: Issues new access token using refresh token
- **logout()**: Revokes refresh token
- **updatePassword()**: Updates user password with verification
- **revokeAllTokens()**: Invalidates all user tokens (security measure)

### Middleware (`/src/middleware/auth.middleware.ts`)
Authentication and authorization middleware:

- **verifyToken**: Validates JWT from Authorization header
- **verifyTokenFromCookie**: Validates JWT from cookies
- **authorizeRole()**: RBAC middleware for specific roles
- **isSuperAdmin**: Super admin check
- **isRestaurantOwner**: Restaurant owner or admin check
- **isOutletManager**: Outlet manager and above check
- **optionalAuth**: Optional authentication (doesn't fail if no token)

### Controllers (`/src/controllers/auth.controller.ts`)
Request handlers for all authentication endpoints:

- **register**: POST /auth/register
- **login**: POST /auth/login
- **logout**: POST /auth/logout
- **refreshToken**: POST /auth/refresh
- **getCurrentUser**: GET /auth/me
- **changePassword**: POST /auth/change-password
- **revokeAllTokens**: POST /auth/revoke-all
- **verifyToken**: POST /auth/verify

### Routes (`/src/routes/auth.routes.ts`)
API endpoint definitions with middleware protection.

## API Endpoints

### Public Routes (No Authentication Required)

#### 1. Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe",
  "tenantId": "tenant-id",
  "role": "OUTLET_MANAGER"
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "OUTLET_MANAGER"
  }
}
```

#### 2. Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass@123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": { ... }
  }
}
```

Cookies set:
- `accessToken` (24 hours)
- `refreshToken` (7 days)

#### 3. Refresh Access Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

OR (uses cookie):
POST /api/auth/refresh

Response:
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": { ... }
  }
}
```

#### 4. Verify Token
```
POST /api/auth/verify
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "userId": "...",
    "tenantId": "...",
    "email": "...",
    "role": "...",
    "status": "..."
  }
}
```

### Protected Routes (Authentication Required)

#### 5. Get Current User
```
GET /api/auth/me
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "_id": "user-id",
    "tenantId": "tenant-id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "role": "OUTLET_MANAGER",
    "status": "ACTIVE",
    "lastLogin": "2024-06-07T00:22:59.313Z",
    "createdAt": "2024-06-07T00:22:59.313Z",
    "updatedAt": "2024-06-07T00:22:59.313Z"
  }
}
```

#### 6. Logout User
```
POST /api/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

OR (uses cookies):
POST /api/auth/logout
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "message": "Logout successful"
}
```

Cookies cleared:
- `accessToken`
- `refreshToken`

#### 7. Change Password
```
POST /api/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "oldPassword": "SecurePass@123",
  "newPassword": "NewPass@456",
  "confirmPassword": "NewPass@456"
}

Response:
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### 8. Revoke All Tokens
```
POST /api/auth/revoke-all
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "message": "All tokens revoked successfully. Please login again."
}
```

## User Roles
```typescript
enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  RESTAURANT_OWNER = "RESTAURANT_OWNER",
  OUTLET_MANAGER = "OUTLET_MANAGER",
  STAFF = "STAFF",
}
```

## User Status
```typescript
enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BLOCKED = "BLOCKED",
}
```

## Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

## Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb+srv://...
```

## Using Authentication in Controllers

### Example: Protected Route
```typescript
import { verifyToken, isRestaurantOwner } from '../middleware/auth.middleware';

router.get('/orders', verifyToken, isRestaurantOwner, (req, res) => {
  const userId = req.user.userId;
  const tenantId = req.user.tenantId;
  // Your logic here
});
```

### Example: Getting User Info
```typescript
import { verifyToken } from '../middleware/auth.middleware';
import { AuthService } from '../services/auth.service';

router.get('/profile', verifyToken, async (req, res) => {
  const user = await AuthService.getUserById(req.user.userId);
  res.json(user);
});
```

## Token Storage & Cookies

Tokens are automatically stored in HTTP-only cookies for enhanced security:

**Access Token Cookie:**
- Name: `accessToken`
- Max-Age: 24 hours
- HttpOnly: true (not accessible via JavaScript)
- Secure: true (only HTTPS in production)
- SameSite: strict

**Refresh Token Cookie:**
- Name: `refreshToken`
- Max-Age: 7 days
- HttpOnly: true
- Secure: true (only HTTPS in production)
- SameSite: strict

## Security Features

1. **Password Hashing**: Bcrypt with 10 salt rounds
2. **Token Signing**: HMAC with SHA-256
3. **Token Expiration**: Access tokens expire in 24 hours
4. **Refresh Token Rotation**: New refresh tokens issued on token refresh
5. **Token Revocation**: Ability to revoke all tokens for a user
6. **User Status Validation**: Blocked/Inactive users cannot login
7. **Secure Cookies**: HttpOnly, Secure, SameSite flags set
8. **Request Validation**: Email and password validation
9. **IP & User Agent Tracking**: Stored with refresh tokens for auditing

## Database Models Used

### User Model
```typescript
interface IUser {
  tenantId: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: Date | null;
  createdBy: ObjectId | null;
  updatedBy: ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### RefreshToken Model
```typescript
interface IRefreshToken {
  userId: ObjectId;
  tenantId: ObjectId;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt: Date | null;
  ipAddress?: string;
  userAgent?: string;
  createdBy: ObjectId | null;
  updatedBy: ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Responses

All authentication endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common error codes:
- **400**: Bad Request (validation failed)
- **401**: Unauthorized (invalid token or credentials)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (user not found)
- **500**: Internal Server Error

## Testing the Authentication System

### 1. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass@123",
    "firstName": "Test",
    "lastName": "User",
    "tenantId": "YOUR_TENANT_ID",
    "role": "OUTLET_MANAGER"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass@123"
  }'
```

### 3. Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Troubleshooting

### Token Not Working
1. Check token expiration: `POST /api/auth/verify`
2. Verify token format: `Bearer <token>`
3. Refresh token: `POST /api/auth/refresh`

### Cannot Login
1. Verify email format
2. Check password meets requirements
3. Verify user is not blocked: Check `status` field
4. Verify user exists in database

### Middleware Issues
1. Ensure `verifyToken` middleware is applied to protected routes
2. Verify Authorization header format: `Authorization: Bearer <token>`
3. Check token is included in request

## Future Enhancements

- [ ] OAuth2 integration (Google, GitHub)
- [ ] Two-factor authentication (2FA)
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Social login integration
- [ ] Session management UI
- [ ] Token blacklist
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging for authentication events

## Support
For issues or questions, please refer to the architecture documentation or contact the development team.

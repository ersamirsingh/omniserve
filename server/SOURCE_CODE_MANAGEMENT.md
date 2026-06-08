# Source Code Management

This is the only source code management document for this project. All progress notes, feature history, problems faced, and improvements should stay here instead of creating multiple separate files.

## What I Am Building

I am building a multi-tenant food ordering platform inspired by UrbanPiper. The project has a backend API and a frontend demo.

The backend is built with Node.js, Express, TypeScript, MongoDB, Mongoose, JWT authentication, cookies, and Redis. It handles user authentication, role-based access, tenant-based data, subscription plans, and protected API routes.

The frontend is built with React and Vite. It currently shows a food ordering interface named FoodMesh, with restaurant cards, search UI, and a simple landing experience for customers.

## Current Project Structure

```text
client/
  React + Vite frontend

server/
  Express + TypeScript backend

server/SOURCE_CODE_MANAGEMENT.md
  The single source code management file for this project
```

## What I Built First

I first focused on the backend foundation because the application needs secure user and tenant handling before adding business features.

The first backend work included:

- Express app setup with `/api` routing
- MongoDB connection through Mongoose
- User authentication using JWT
- Password hashing with bcrypt
- Access token and refresh token generation
- Login, register, logout, refresh token, current user, and password change APIs
- Role-based middleware for protected routes
- Multi-tenant user context using `tenantId`
- Common response handling

The first authentication routes were:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/verify
GET  /api/auth/me
POST /api/auth/logout
POST /api/auth/change-password
POST /api/auth/revoke-all
```

## Problems I Faced

After the first version, some real security and structure issues became clear.

### 1. Access token still worked after logout

In the first version, logout revoked the refresh token in MongoDB, but the access token could still be used until it expired. That meant a logged-out token could remain valid for some time.

### 2. Protected routes needed stronger token checking

The first middleware verified the JWT, but it did not check whether the token had already been revoked. A protected route only knew whether the token was signed correctly and not expired.

### 3. Subscription access needed tenant validation

After authentication, the project also needed subscription management. Subscription APIs had to make sure a user could only access subscriptions belonging to their own tenant.

### 4. Project documentation was too spread out in detail

The previous documentation was too long and described many files separately. The goal is now to keep one clear SCM file that explains the build journey without creating many extra documentation files.

## How I Overcame And Enhanced The Project

### Redis token blacklist

To fix the logout problem, I added a Redis token blacklist.

Now, when a user logs out:

```text
1. The refresh token is revoked in MongoDB.
2. The current access token is added to Redis.
3. Protected routes check Redis before accepting the JWT.
4. A revoked token returns TOKEN_REVOKED.
```

This makes logout immediate instead of waiting for the JWT expiry time.

### Async authentication middleware

The authentication middleware was enhanced to support Redis checks.

Current protected request flow:

```text
1. Read token from cookie or Authorization header.
2. Check whether the token is blacklisted in Redis.
3. Verify the JWT signature and expiry.
4. Attach the decoded user to req.user.
5. Continue to the protected route.
```

### Revoke all tokens

The project also supports revoking all tokens for a user. This is useful when a user changes password, suspects account misuse, or wants to logout from all sessions.

### Subscription module

After authentication, I added subscription management for tenants.

The subscription system includes:

- Create subscription
- Get active subscription
- Get subscription details
- List subscriptions for the current tenant
- Get subscription by ID
- Update plan
- Extend end date
- Cancel subscription with soft delete
- Check active subscription before allowing selected protected features
- Check subscription tier for plan-based access

Current subscription routes:

```text
POST   /api/subscriptions
GET    /api/subscriptions/active
GET    /api/subscriptions/details
GET    /api/subscriptions
GET    /api/subscriptions/:id
PATCH  /api/subscriptions/:id/plan
PATCH  /api/subscriptions/:id/extend
DELETE /api/subscriptions/:id
```

### Frontend demo

I also created a simple React frontend demo named FoodMesh. It shows the user-facing idea of the food ordering platform with:

- Navigation
- Hero section
- Food search input
- Popular restaurant cards
- Feature section
- Footer

This gives the project a visible frontend while the backend APIs are being developed.

## Main Files In The Codebase

Authentication:

```text
server/src/services/auth.service.ts
server/src/controllers/auth.controller.ts
server/src/middleware/auth.middleware.ts
server/src/routes/auth.routes.ts
server/src/services/tokenblacklist.service.ts
server/src/types/auth.types.ts
```

Subscriptions:

```text
server/src/models/subscription.model.ts
server/src/services/subscription.service.ts
server/src/controllers/subscription.controller.ts
server/src/middleware/checkSubscription.middleware.ts
server/src/routes/subscription.routes.ts
```

Frontend:

```text
client/src/App.jsx
client/src/pages/demo.jsx
client/src/API/axiosClient.js
client/src/store/store.js
client/src/store/authSlice.js
```

## What Is Improved Now

The project improved from a basic authentication backend into a more secure multi-tenant platform foundation.

Key improvements:

- Logout now revokes access tokens immediately.
- Refresh tokens are stored and revoked through MongoDB.
- Redis is used for fast revoked-token checks.
- Protected routes support user context through `req.user`.
- Tenant ownership is checked before subscription data is returned.
- Subscription middleware can block access when no active plan exists.
- The frontend demo shows the food ordering idea visually.
- Documentation is consolidated into this one SCM file.

## Current Status

The current project has:

- Backend API foundation
- JWT authentication
- Redis token blacklist
- Role-based access helpers
- Tenant-based subscription management
- React frontend demo
- One consolidated source code management document

Next improvements can include order management, restaurant menus, outlet management, payments, admin dashboard screens, and connecting the frontend authentication flow to the backend APIs.

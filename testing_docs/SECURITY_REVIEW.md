# Production Security Review

This document provides a security audit and architectural validation of the **FoodMesh Platform** defenses.

---

## 1. Authentication & Session Validation

- **Mechanism**: JSON Web Tokens (JWT) signed with a secure HS256 secret.
- **Implementation**:
  - `accessToken` (short-lived JWT) and `refreshToken` are stored in secure, `httpOnly`, `sameSite: strict` cookies, preventing exposure to Cross-Site Scripting (XSS) client scripts.
  - Revocation is supported via a Token Blacklist Redis cache in the `auth.middleware.ts` verification chain.

---

## 2. Authorization & RBAC Enforcement

- **Role Enforcement Middleware**:
  - All protected route groups use the `verifyToken` middleware followed by role hierarchy guard gates (e.g. `checkPermission`, `requireRole`).
  - Available Roles: `SYSTEM_ADMIN`, `STORE_MANAGER`, `WAITER`, `CHEF`, `CUSTOMER`.
  - Waiters are prevented from accessing inventory adjustments, and chefs are restricted to KDS status updates.

---

## 3. Strict Tenant & Outlet Isolation (Anti-IDOR)

- **IDOR Protection**:
  - Insecure Direct Object Reference (IDOR) is prevented by implicitly binding the `tenantId` from the verified JWT payload to all mongoose database operations.
  - When querying or updating records (such as orders, category definitions, or table setups), query selectors must explicitly contain `{ tenantId: req.user.tenantId }`.
  - Outlet-specific operations (such as KDS logs or shift updates) enforce query isolation by checking the user's allocated `outletId` bounds.

---

## 4. Input Validation & Query Safety

- **Mongo Injection Prevention**:
  - Input bodies are strictly parsed using Express JSON and validated against schemas.
  - Object keys are validated to ensure raw MongoDB operator payloads (e.g. `$` queries) are sanitized/stripped, avoiding Mongo query injection attacks.

---

## 5. Rate Limiting Defense

- **Implementation**:
  - Route groups `/auth/register` and `/auth/login` enforce an active rate limiter:
    - Window: 15 minutes
    - Max Requests: 15 attempts
    - Blocks brute-force credential stuffing and distributed denial-of-service (DDoS) requests on authentication entry gates.

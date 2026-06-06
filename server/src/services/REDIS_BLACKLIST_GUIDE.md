# Redis Token Blacklist Implementation

## Overview

This document explains the Redis-based token blacklist system that was integrated into the authentication system. When users logout or their tokens are revoked, those tokens are added to a Redis blacklist. On every authenticated request, the system checks if the token exists in the blacklist before allowing access.

## Architecture

### Flow Diagram

```
User Logout Request
        ↓
  Extract Tokens
        ↓
    ┌───┴───────────────────┐
    │                       │
    ↓                       ↓
Add Token to        Revoke in DB
Redis Blacklist     (Refresh Token)
    ↓                       ↓
    └───────┬───────────────┘
            ↓
   Clear Cookies & Respond
```

### Protected Route Flow

```
Incoming Request with Token
        ↓
Check Redis Blacklist
        ↓
    Is Blacklisted?
    ↙           ↘
  YES           NO
   ↓             ↓
 401          Continue
REVOKED      Verify JWT
             ↓
         Valid JWT?
         ↙       ↘
       YES       NO
        ↓         ↓
   Proceed    401 INVALID
```

## Implementation Details

### 1. TokenBlacklistService (New Service)

**Location:** `src/services/tokenblacklist.service.ts`

#### Key Methods

```typescript
// Add token to blacklist with TTL
await TokenBlacklistService.addToBlacklist(token, expiresIn);

// Check if token is blacklisted
const isBlacklisted = await TokenBlacklistService.isBlacklisted(token);

// Revoke all tokens for a user
await TokenBlacklistService.revokeAllUserTokens(userId);

// Get Redis key expiration from JWT
const expiresIn = TokenBlacklistService.getTokenExpirationTime(token);

// Health check
const isHealthy = await TokenBlacklistService.healthCheck();
```

#### Redis Keys Pattern

```
blacklist:{token}          → Stores blacklisted token metadata
user_tokens:{userId}:{ts}  → Tracks user's tokens for bulk revocation
```

#### Example Redis Data

```json
Key: "blacklist:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
Value: {
  "blacklistedAt": "2026-06-07T01:44:21.985Z",
  "expiresAt": "2026-06-08T01:44:21.985Z"
}

TTL: 86400 (24 hours - auto-expires with token)
```

### 2. Updated Middleware

**File:** `src/middleware/auth.middleware.ts`

#### verifyToken (Now Async)

```typescript
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

  // Check Redis blacklist FIRST
  const isBlacklisted = await TokenBlacklistService.isBlacklisted(token);
  if (isBlacklisted) {
    return res.status(401).json({
      success: false,
      message: 'Token has been revoked. Please login again.',
      code: 'TOKEN_REVOKED',
    });
  }

  // Then verify JWT signature
  const decoded = AuthService.verifyAccessToken(token);
  // ... rest of logic
};
```

**Important:** The middleware is now **async** and returns a Promise.

### 3. Updated Controller

**File:** `src/controllers/auth.controller.ts`

#### Logout Method (Enhanced)

```typescript
static async logout(req: Request, res: Response): Promise<void> {
  const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken) {
    // Revoke refresh token in MongoDB
    await AuthService.logout(refreshToken);
  }

  if (accessToken) {
    // Calculate remaining lifetime
    const expiresIn = TokenBlacklistService.getTokenExpirationTime(accessToken);
    
    // Add to Redis blacklist with TTL
    await TokenBlacklistService.addToBlacklist(accessToken, expiresIn);
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  
  res.status(200).json({ success: true, message: 'Logout successful' });
}
```

#### Revoke All Tokens (Enhanced)

```typescript
static async revokeAllTokens(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Revoke refresh tokens in DB
  await AuthService.revokeAllTokens(req.user.userId);

  // Get current access token
  const accessToken = req.cookies.accessToken || 
                     req.headers.authorization?.split(' ')[1];

  if (accessToken) {
    const expiresIn = TokenBlacklistService.getTokenExpirationTime(accessToken);
    await TokenBlacklistService.addToBlacklist(accessToken, expiresIn);
  }

  // Revoke all user's tokens in Redis
  await TokenBlacklistService.revokeAllUserTokens(req.user.userId);

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  
  res.status(200).json({ success: true, message: 'All tokens revoked' });
}
```

## How It Works

### Step 1: User Logs Out

```bash
POST /api/auth/logout
Authorization: Bearer <accessToken>
Cookie: refreshToken=<refreshToken>
```

**Process:**
1. Extract accessToken from header or cookie
2. Extract refreshToken from cookie or body
3. Revoke refreshToken in MongoDB
4. Calculate accessToken's remaining lifetime
5. Add accessToken to Redis blacklist with TTL
6. Clear cookies on client
7. Return success response

### Step 2: Protected Route Access

```bash
GET /api/protected-route
Authorization: Bearer <accessToken>
```

**Process:**
1. Middleware calls `verifyToken` (now async)
2. Extract token from header
3. **Query Redis:** Check if token exists in `blacklist:{token}`
4. If found → Return 401 with code `TOKEN_REVOKED`
5. If not found → Verify JWT signature with AuthService
6. If valid → Attach user to request and call `next()`
7. If invalid → Return 401

### Step 3: Redis Auto-Cleanup

- Each blacklisted token has a TTL equal to its remaining lifetime
- When token expiration time arrives, Redis automatically deletes the key
- No manual cleanup needed!

## API Changes

### Logout Endpoint

**Endpoint:** `POST /api/auth/logout`

**Request:**
```json
// Option 1: Using header
Authorization: Bearer <accessToken>

// Option 2: Using body + cookies
{
  "refreshToken": "<refreshToken>"
}
```

**Response - Success:**
```json
{
  "success": true,
  "message": "Logout successful. Tokens have been revoked."
}
```

**Response - Error (Revoked Token):**
```json
{
  "success": false,
  "message": "Token has been revoked. Please login again.",
  "code": "TOKEN_REVOKED"
}
```

### Revoke All Tokens Endpoint

**Endpoint:** `POST /api/auth/revoke-all`

**Request:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message": "All tokens revoked successfully. Please login again."
}
```

## Error Responses

### Token Revoked
```json
{
  "success": false,
  "message": "Token has been revoked. Please login again.",
  "code": "TOKEN_REVOKED"
}
Status: 401
```

### Token Invalid
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
Status: 401
```

### No Token Provided
```json
{
  "success": false,
  "message": "No token provided"
}
Status: 401
```

## Security Benefits

1. **Immediate Revocation:** Logout instantly invalidates tokens (no DB lag)
2. **Zero Storage Overhead:** TTL auto-cleanup prevents Redis bloat
3. **Fast Lookups:** O(1) Redis key lookup vs. DB queries
4. **User Control:** Users can revoke all their tokens anytime
5. **Session Termination:** Logout clears both DB and cache
6. **Resilience:** Falls back gracefully if Redis is down

## Configuration

### Environment Variables

Existing Redis configuration in `.env`:
```env
REDIS_USERNAME=default
REDIS_HOST=redis-18253.c325.us-east-1-4.ec2.redns.redis-cloud.com
REDIS_PASSWORD=sdvvKi5XmANTDTCO0vsbhKrmRBbh1apT
REDIS_PORT=18253
```

### Key Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| Access Token Expiry | 24h | Natural cleanup time |
| Refresh Token Expiry | 7d | Database cleanup time |
| Redis Key Pattern | `blacklist:*` | Easy identification |
| User Token Pattern | `user_tokens:*` | Bulk revocation |

## Usage Examples

### Example 1: Simple Logout

```typescript
// Frontend
const logout = async () => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    credentials: 'include' // Send cookies
  });

  if (response.ok) {
    // Tokens are now blacklisted
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Redirect to login
    window.location.href = '/login';
  }
};
```

### Example 2: Verify Protected Route Still Rejects Blacklisted Token

```typescript
// After logout, this request will fail:
const response = await fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${blacklistedToken}`
  }
});

// Response: 401 with code: 'TOKEN_REVOKED'
```

### Example 3: Revoke All User Tokens

```typescript
// Security measure: If user suspects compromise
const revokeAll = async () => {
  const response = await fetch('/api/auth/revoke-all', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // All user's tokens now blacklisted
  // Must login again
};
```

## Redis Keys Reference

### Blacklist Keys
```
blacklist:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
blacklist:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- **TTL:** Matches token expiration
- **Value:** Metadata (when blacklisted, when expires)
- **Count:** Grows with logout count
- **Cleanup:** Automatic after TTL

### User Token Tracking Keys
```
user_tokens:507f1f77bcf86cd799439011:1717723461985
user_tokens:507f1f77bcf86cd799439011:1717723465123
```
- **TTL:** Matches token expiration
- **Value:** Token partial hash for logging
- **Count:** One per active session
- **Cleanup:** Auto-revoke by user ID

## Monitoring & Debugging

### Get Blacklist Statistics

```typescript
import { TokenBlacklistService } from './services/tokenblacklist.service';

const stats = await TokenBlacklistService.getBlacklistStats();
console.log(`Blacklisted tokens: ${stats.totalBlacklisted}`);
console.log(`User tokens tracked: ${stats.totalUserTokenTracked}`);
```

### Health Check

```typescript
const isHealthy = await TokenBlacklistService.healthCheck();
if (!isHealthy) {
  console.error('Redis connection failed');
}
```

### Manual Blacklist Cleanup

```typescript
// Clear all blacklist keys (use with caution!)
await TokenBlacklistService.clearBlacklist();
```

## Performance Considerations

### Redis Lookup Speed
- **O(1) complexity:** Constant time lookup
- **Typical latency:** < 5ms
- **No N+1 problem:** Single key lookup

### Memory Usage
- **Per token:** ~200 bytes (metadata + key)
- **24h of tokens:** Depends on logout rate
- **Auto-cleanup:** TTL prevents buildup

### Example Memory Calculation
```
Assumptions:
- 10,000 users
- 50% logout per day
- 5,000 tokens blacklisted per day
- 200 bytes per token

Daily memory: 5,000 × 200 bytes = 1 MB
24h cleanup: Auto-expires, no bloat
```

## Troubleshooting

### Issue: Token still works after logout

**Cause:** Token was added to blacklist but verification skipped the check

**Solution:** Ensure middleware is async and awaits blacklist check
```typescript
// WRONG - synchronous, blacklist check is ignored
export const verifyToken = (req, res, next) => {
  // check skipped!
}

// CORRECT - async, blacklist check awaited
export const verifyToken = async (req, res, next) => {
  await TokenBlacklistService.isBlacklisted(token);
}
```

### Issue: Redis connection error

**Cause:** Redis server is down or credentials are wrong

**Solution:** Check environment variables
```bash
REDIS_HOST=redis-18253.c325.us-east-1-4.ec2.redns.redis-cloud.com
REDIS_PASSWORD=<correct-password>
REDIS_PORT=18253
```

### Issue: Tokens not expiring

**Cause:** TTL not set correctly

**Solution:** Verify token extraction logic
```typescript
// Correct: Extracts expiration from JWT
const expiresIn = TokenBlacklistService.getTokenExpirationTime(token);
```

## Best Practices

✅ **Always await blacklist checks** in async middleware
✅ **Include token in ALL logout scenarios** (cookie, header, body)
✅ **Calculate correct TTL** using `getTokenExpirationTime()`
✅ **Test logout** with valid and expired tokens
✅ **Monitor Redis** for key count and memory usage
✅ **Log blacklist operations** for security audit
✅ **Handle Redis down gracefully** (fallback to JWT only)

❌ **Don't skip blacklist check** in middleware
❌ **Don't hardcode TTL values** (use token expiration instead)
❌ **Don't mix token sources** (be consistent with header vs cookie)
❌ **Don't ignore Redis errors** in production

## Integration Summary

### Files Modified
- ✅ `src/middleware/auth.middleware.ts` - Made async, added blacklist check
- ✅ `src/controllers/auth.controller.ts` - Added Redis blacklist calls

### Files Created
- ✅ `src/services/tokenblacklist.service.ts` - Complete Redis service

### Backward Compatibility
- ✅ JWT validation still works as before
- ✅ Refresh tokens still stored in DB
- ✅ Cookies still managed properly
- ✅ Old tokens still expire naturally

---

**Status:** ✅ Ready for Production

The Redis token blacklist system is fully integrated and ready to use!

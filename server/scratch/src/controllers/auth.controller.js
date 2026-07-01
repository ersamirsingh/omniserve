import { AuthService } from '../services/auth.service.js';
export class AuthController {
    /**
     * Register a new user
     * POST /auth/register
     */
    static async register(req, res) {
        try {
            const { email, password, firstName, lastName, tenantName } = req.body;
            if (!email || !password || !firstName || !lastName || !tenantName) {
                res.status(400).json({
                    success: false,
                    message: 'Email, password, firstName, lastName, and tenantName are required',
                });
                return;
            }
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(password)) {
                res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character',
                });
                return;
            }
            const user = await AuthService.register(email, password, firstName, lastName, tenantName);
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user: {
                    id: user._id,
                    tenantId: user.tenantId,
                    restaurantId: user.restaurantId,
                    outletId: user.outletId,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                },
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || 'Registration failed',
            });
        }
    }
    /**
     * Login user
     * POST /auth/login
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Email and password are required',
                });
                return;
            }
            const ipAddress = req.ip;
            const userAgent = req.get('user-agent');
            const result = await AuthService.login(email, password, ipAddress, userAgent);
            res.cookie('accessToken', result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000,
            });
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                    user: result.user,
                },
            });
        }
        catch (error) {
            res.status(401).json({
                success: false,
                message: error.message || 'Login failed',
            });
        }
    }
    /**
     * Logout user
     * POST /auth/logout
     */
    static async logout(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    message: 'Refresh token is required',
                });
                return;
            }
            await AuthService.logout(refreshToken);
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            res.status(200).json({
                success: true,
                message: 'Logout successful',
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Logout failed',
            });
        }
    }
    /**
     * Refresh access token
     * POST /auth/refresh
     */
    static async refreshToken(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    message: 'Refresh token is required',
                });
                return;
            }
            const result = await AuthService.refreshAccessToken(refreshToken);
            res.cookie('accessToken', result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000,
            });
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                    user: result.user,
                },
            });
        }
        catch (error) {
            res.status(401).json({
                success: false,
                message: error.message || 'Token refresh failed',
            });
        }
    }
    /**
     * Get current user
     * GET /auth/me
     */
    static async getCurrentUser(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
                return;
            }
            const user = await AuthService.getUserById(req.user.userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch user',
            });
        }
    }
    /**
     * Update password
     * POST /auth/change-password
     */
    static async changePassword(req, res) {
        try {
            const { oldPassword, newPassword, confirmPassword } = req.body;
            if (!oldPassword || !newPassword || !confirmPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Old password, new password, and confirm password are required',
                });
                return;
            }
            if (newPassword !== confirmPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Passwords do not match',
                });
                return;
            }
            if (oldPassword === newPassword) {
                res.status(400).json({
                    success: false,
                    message: 'New password must be different from old password',
                });
                return;
            }
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character',
                });
                return;
            }
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
                return;
            }
            await AuthService.updatePassword(req.user.userId, oldPassword, newPassword);
            res.status(200).json({
                success: true,
                message: 'Password changed successfully',
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || 'Password change failed',
            });
        }
    }
    /**
     * Revoke all tokens for a user (security measure)
     * POST /auth/revoke-all
     */
    static async revokeAllTokens(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
                return;
            }
            await AuthService.revokeAllTokens(req.user.userId);
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            res.status(200).json({
                success: true,
                message: 'All tokens revoked successfully. Please login again.',
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to revoke tokens',
            });
        }
    }
    /**
     * Verify token
     * POST /auth/verify
     */
    static async verifyToken(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                res.status(400).json({
                    success: false,
                    message: 'Token is required',
                });
                return;
            }
            const decoded = AuthService.verifyAccessToken(token);
            if (!decoded) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token',
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Token is valid',
                data: decoded,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || 'Token verification failed',
            });
        }
    }
}

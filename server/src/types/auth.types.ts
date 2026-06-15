import { Types } from 'mongoose';
import { UserRole, UserStatus } from '../enums/enums.js';

export interface IAuthRequest {
  userId: string;
  tenantId: string;
  restaurantId?: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role: UserRole;
}

export interface ITokenPayload {
  userId: string;
  tenantId: string;
  restaurantId?: string;
  email: string;
  role: string;
  status: string;
  iat?: number;
  exp?: number;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    _id: Types.ObjectId;
    tenantId: Types.ObjectId;
    restaurantId?: Types.ObjectId | null;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: UserRole;
    status: UserStatus;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface IChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface ILogoutRequest {
  refreshToken?: string;
}

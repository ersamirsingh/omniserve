import { z } from 'zod';

export const sendInviteSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  name: z.string().optional(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(1, 'Name is required'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
});

export const tenantStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']),
  reason: z.string().min(5, 'Reason must be at least 5 characters long'),
});

export const subscriptionOverrideSchema = z.object({
  planId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid plan ID'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELLED', 'TRIAL', 'GRACE_PERIOD']),
  trialEndsAt: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  amount: z.number().nonnegative().optional(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
});

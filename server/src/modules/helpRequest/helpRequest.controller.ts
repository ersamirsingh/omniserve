import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import HelpRequest from '../../models/helpRequest.model.js';
import User from '../../models/user.model.js';
import { NotificationService } from '../notification/notification.service.js';
import { NotificationType } from '../../models/enums.js';
import { ApiResponseHandler } from '../../utils/apiResponse.js';
import cloudinary from '../../config/cloudinary.js';

/** Generate a unique 12-character alphanumeric tracking code (e.g. A3F9KX21M7QP) */
function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusing chars: 0/O, 1/I
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class HelpRequestController {
  /**
   * Create a new help support request
   * POST /help-requests
   */
  static async createHelpRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated');
        return;
      }

      const { description, screenshot, context } = req.body;
      if (!description) {
        ApiResponseHandler.badRequest(res, 'Issue description is required');
        return;
      }

      const sender = await User.findById(req.user.userId);
      if (!sender) {
        ApiResponseHandler.notFound(res, 'Requester account not found');
        return;
      }

      const reqTenantId = req.user.tenantId || sender.tenantId;

      let restaurantId: Types.ObjectId | null = null;
      let restaurantName: string | null = null;
      let outletId: Types.ObjectId | null = null;
      let outletName: string | null = null;

      try {
        const rId = req.user.restaurantId || (sender as any).restaurantId;
        if (rId) {
          const Restaurant = mongoose.model('Restaurant');
          const rest = await Restaurant.findById(rId);
          if (rest) {
            restaurantId = rest._id as Types.ObjectId;
            restaurantName = (rest as any).name;
          }
        }
      } catch (err) {
        console.error('Failed to resolve restaurant details for support ticket:', err);
      }

      try {
        const oId = req.user.outletId || (sender as any).outletId || ((sender as any).outletIds && (sender as any).outletIds[0]);
        if (oId) {
          const Outlet = mongoose.model('Outlet');
          const outl = await Outlet.findById(oId);
          if (outl) {
            outletId = outl._id as Types.ObjectId;
            outletName = (outl as any).name;
          }
        }
      } catch (err) {
        console.error('Failed to resolve outlet details for support ticket:', err);
      }

      // Upload screenshot to Cloudinary if provided as base64 or file data
      let screenshotUrl: string | null = null;
      if (screenshot && typeof screenshot === 'string') {
        if (screenshot.startsWith('data:image/')) {
          try {
            const uploadRes = await cloudinary.uploader.upload(screenshot, {
              folder: 'omniserve/help_requests',
              resource_type: 'auto',
            });
            screenshotUrl = uploadRes.secure_url;
          } catch (cloudErr: any) {
            console.error('Cloudinary upload failed for help request screenshot:', cloudErr.message || cloudErr);
            screenshotUrl = screenshot; // fallback to original data URL if Cloudinary error
          }
        } else {
          screenshotUrl = screenshot;
        }
      }

      let trackingCode = generateTrackingCode();
      let helpRequest: any = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          helpRequest = new HelpRequest({
            tenantId: reqTenantId ? new Types.ObjectId(reqTenantId) : null,
            userId: new Types.ObjectId(req.user.userId),
            userRole: req.user.role,
            trackingCode,
            description: description.trim(),
            screenshot: screenshotUrl,
            restaurantId,
            restaurantName,
            outletId,
            outletName,
            context: {
              pageRoute: context?.pageRoute || 'Unknown',
              timestamp: context?.timestamp ? new Date(context.timestamp) : new Date(),
              errorLogSnippet: context?.errorLogSnippet || null
            },
            status: 'OPEN'
          });

          await helpRequest.save();
          break;
        } catch (saveErr: any) {
          if (saveErr.code === 11000 && saveErr.keyPattern?.trackingCode) {
            attempts++;
            trackingCode = generateTrackingCode();
            if (attempts >= maxAttempts) throw saveErr;
          } else {
            throw saveErr;
          }
        }
      }

      // Automatically create an Issue tracker ticket for this help request
      try {
        const Issue = mongoose.model('Issue');
        await Issue.create({
          title: `Support: ${description.slice(0, 40)}${description.length > 40 ? '...' : ''}`,
          description: `Help query reported by ${sender.firstName || ''} ${sender.lastName || ''} (${req.user.role}):\n\n${description}\n\nContext Route: ${context?.pageRoute || 'Unknown'}`,
          type: 'SUPPORT_QUERY',
          priority: 'MEDIUM',
          tenantId: reqTenantId ? new Types.ObjectId(reqTenantId) : null,
          restaurantId,
          outletId,
          reporterId: new Types.ObjectId(req.user.userId),
          reporterName: `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email,
          reporterEmail: sender.email,
          trackingCode,
          screenshot: screenshotUrl,
          status: 'OPEN',
          comments: [],
        });
      } catch (issueErr) {
        console.error('Failed to auto-create issue tracker record:', issueErr);
      }

      // Notify all SYSTEM_ADMIN users using the existing notification path
      const admins = await User.find({ role: 'SYSTEM_ADMIN', isDeleted: false });
      const adminNotifyTenant = reqTenantId ? reqTenantId.toString() : new Types.ObjectId().toString();

      for (const admin of admins) {
        try {
          await NotificationService.createNotification(
            adminNotifyTenant,
            admin._id.toString(),
            'New Support Request',
            `User ${sender.firstName} (${req.user.role}) reported: "${description.slice(0, 50)}..."`,
            NotificationType.SYSTEM,
            helpRequest._id.toString(),
            'HelpRequest',
            req.user.userId
          );
        } catch (notifyErr) {
          console.error(`Failed to send help alert notification to admin ${admin._id}:`, notifyErr);
        }
      }

      ApiResponseHandler.success(res, 201, 'Help request submitted successfully', {
        helpRequest,
        trackingCode: helpRequest.trackingCode,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to submit help request');
    }
  }

  /**
   * List support tickets (Admins only)
   * GET /help-requests
   */
  static async listHelpRequests(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'SYSTEM_ADMIN') {
        ApiResponseHandler.forbidden(res, 'Access denied: System Administrators only');
        return;
      }

      const requests = await HelpRequest.find()
        .populate('userId', 'firstName lastName email phone')
        .sort({ createdAt: -1 });

      ApiResponseHandler.success(res, 200, 'Help requests retrieved successfully', { requests });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list help requests');
    }
  }

  /**
   * Resolve / Update support ticket status (Admins only)
   * PATCH /help-requests/:id
   */
  static async resolveHelpRequest(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'SYSTEM_ADMIN') {
        ApiResponseHandler.forbidden(res, 'Access denied: System Administrators only');
        return;
      }

      const { id } = req.params;
      const { status, resolutionNote } = req.body;

      if (!status || !['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
        ApiResponseHandler.badRequest(res, 'Valid status is required (OPEN, IN_PROGRESS, RESOLVED)');
        return;
      }

      const helpRequest = await HelpRequest.findById(id);
      if (!helpRequest) {
        ApiResponseHandler.notFound(res, 'Help request not found');
        return;
      }

      helpRequest.status = status;
      if (resolutionNote !== undefined) {
        helpRequest.resolutionNote = resolutionNote.trim();
      }

      if (status === 'RESOLVED') {
        helpRequest.resolvedAt = new Date();
        helpRequest.resolvedBy = new Types.ObjectId(req.user.userId);
      }

      await helpRequest.save();

      // Notify the requester when status changes or is resolved
      const notifyTenant = helpRequest.tenantId ? helpRequest.tenantId.toString() : new Types.ObjectId().toString();
      try {
        await NotificationService.createNotification(
          notifyTenant,
          helpRequest.userId.toString(),
          `Support Request Status Update: ${status}`,
          status === 'RESOLVED'
            ? `Your support query has been resolved! Note: ${resolutionNote || 'N/A'}`
            : `Your support query is now: ${status}`,
          NotificationType.SYSTEM,
          helpRequest._id.toString(),
          'HelpRequest',
          req.user.userId
        );
      } catch (notifyErr) {
        console.error('Failed to notify ticket requester:', notifyErr);
      }

      ApiResponseHandler.success(res, 200, 'Help request updated successfully', { helpRequest });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to update help request');
    }
  }

  /**
   * Track support ticket status by 12-character tracking code
   * GET /help-requests/track/:code
   */
  static async trackHelpRequest(req: Request, res: Response): Promise<void> {
    try {
      const rawCode = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
      if (!rawCode || rawCode.trim().length < 6) {
        ApiResponseHandler.badRequest(res, 'A valid tracking code is required');
        return;
      }

      const trackingCodeClean = rawCode.trim().toUpperCase();
      const helpRequest = await HelpRequest.findOne({ trackingCode: trackingCodeClean })
        .populate('userId', 'firstName lastName email')
        .populate('resolvedBy', 'firstName lastName');

      if (!helpRequest) {
        ApiResponseHandler.notFound(res, 'No support ticket found matching this tracking code');
        return;
      }

      let issueComments: any[] = [];
      try {
        const Issue = mongoose.model('Issue');
        const issue = await Issue.findOne({ trackingCode: trackingCodeClean });
        if (issue && issue.comments) {
          issueComments = issue.comments;
        }
      } catch (err) {
        console.error('Failed to fetch linked issue comments:', err);
      }

      ApiResponseHandler.success(res, 200, 'Support ticket retrieved successfully', {
        helpRequest,
        issueComments,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to track support ticket');
    }
  }
}

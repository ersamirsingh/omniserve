import { Request, Response } from "express";
import { Types } from "mongoose";
import { MediaService } from "./media.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { AccessScope } from "../../utils/accessScope.utils.js";
import { signatureRequestSchema, registerAssetSchema } from "./media.validator.js";

export class MediaController {

  static async generateUploadSignature(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
        return;
      }

      const validated = signatureRequestSchema.parse(req.body);

      if (validated.outletId) {
        if (!(await AccessScope.canAccessOutlet(req.user, validated.outletId))) {
          ApiResponseHandler.forbidden(res, "You cannot access this outlet");
          return;
        }
      }

      const signatureData = await MediaService.generateUploadSignature(
        req.user.tenantId as string,
        validated.folder,
        req.user.userId as string,
        validated.outletId
      );

      ApiResponseHandler.success(res, 200, "Signed signature generated successfully", signatureData);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to generate upload signature");
    }
  }

  static async registerMediaAsset(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
        return;
      }

      const validated = registerAssetSchema.parse(req.body);

      if (validated.outletId) {
        if (!(await AccessScope.canAccessOutlet(req.user, validated.outletId))) {
          ApiResponseHandler.forbidden(res, "You cannot access this outlet");
          return;
        }
      }

      const media = await MediaService.registerMediaAsset(
        req.user.tenantId as string,
        req.user.userId as string,
        validated
      );

      ApiResponseHandler.success(res, 201, "Media asset registered successfully", {
        id: media._id,
        publicId: media.publicId,
        secureUrl: media.secureUrl,
        folder: media.folder,
        format: media.format,
        width: media.width,
        height: media.height,
        bytes: media.bytes,
        uploadedAt: media.uploadedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to register media asset");
    }
  }

  static async deleteMediaAsset(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
        return;
      }

      const { id } = req.params as { id: string };

      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, "Invalid media asset ID format");
        return;
      }

      await MediaService.deleteMediaAsset(req.user.tenantId as string, id);

      ApiResponseHandler.success(res, 200, "Media asset deleted successfully");
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to delete media asset");
    }
  }

  static async replaceMediaAsset(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
        return;
      }

      const { id } = req.params as { id: string };

      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, "Invalid media asset ID format");
        return;
      }

      const validated = registerAssetSchema.parse(req.body);

      if (validated.outletId) {
        if (!(await AccessScope.canAccessOutlet(req.user, validated.outletId))) {
          ApiResponseHandler.forbidden(res, "You cannot access this outlet");
          return;
        }
      }

      const media = await MediaService.replaceMediaAsset(
        req.user.tenantId as string,
        req.user.userId as string,
        id,
        validated
      );

      ApiResponseHandler.success(res, 200, "Media asset replaced successfully", {
        id: media._id,
        publicId: media.publicId,
        secureUrl: media.secureUrl,
        folder: media.folder,
        format: media.format,
        width: media.width,
        height: media.height,
        bytes: media.bytes,
        uploadedAt: media.uploadedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to replace media asset");
    }
  }
}

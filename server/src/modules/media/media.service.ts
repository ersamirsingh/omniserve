import { randomUUID } from "crypto";
import { Types } from "mongoose";
import cloudinary from "../../config/cloudinary.js";
import { env } from "../../config/env.js";
import Media, { IMedia } from "./media.model.js";

export class MediaService {
  /**
   * Generate signed upload signature for direct client-to-Cloudinary upload
   */
  static async generateUploadSignature(
    tenantId: string,
    folder: string,
    userId: string,
    outletId?: string
  ) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const uniqueId = randomUUID();
    
    // Generate secure public ID without path separators
    const cleanFolderName = folder.split('/').pop() || folder;
    const publicId = `${cleanFolderName}_${uniqueId}`;
    const fullFolder = `omniserve/${tenantId}/${folder}`;

    const paramsToSign = {
      timestamp,
      folder: fullFolder,
      public_id: publicId,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      env.CLOUDINARY_API_SECRET
    );

    return {
      signature,
      timestamp,
      publicId,
      folder: fullFolder,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
    };
  }

  /**
   * Register uploaded asset metadata in the MongoDB database
   */
  static async registerMediaAsset(
    tenantId: string,
    userId: string,
    assetData: any
  ): Promise<IMedia> {
    const media = new Media({
      tenantId: new Types.ObjectId(tenantId),
      outletId: assetData.outletId ? new Types.ObjectId(assetData.outletId) : null,
      publicId: assetData.publicId,
      secureUrl: assetData.secureUrl,
      folder: assetData.folder,
      format: assetData.format,
      width: assetData.width,
      height: assetData.height,
      bytes: assetData.bytes,
      version: assetData.version,
      uploadedAt: assetData.uploadedAt || new Date(),
      createdBy: new Types.ObjectId(userId),
    });

    return await media.save();
  }

  /**
   * Delete a media asset by database ID (soft-delete in DB, call Cloudinary destroy)
   */
  static async deleteMediaAsset(
    tenantId: string,
    assetId: string
  ): Promise<boolean> {
    const media = await Media.findOne({
      _id: new Types.ObjectId(assetId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!media) {
      throw new Error("Media asset not found or access denied");
    }

    // Soft delete in database
    media.isDeleted = true;
    media.deletedAt = new Date();
    await media.save();

    // Asynchronously delete from Cloudinary
    const fullPublicId = `${media.folder}/${media.publicId}`;
    cloudinary.uploader.destroy(fullPublicId, (error: any, result: any) => {
      if (error) {
        console.error(`[Cloudinary Delete Error] Failed to delete ${fullPublicId}:`, error);
      } else {
        console.log(`[Cloudinary Delete Success] Deleted ${fullPublicId}:`, result);
      }
    });

    return true;
  }

  /**
   * Replace an existing media asset with a new upload
   */
  static async replaceMediaAsset(
    tenantId: string,
    userId: string,
    oldAssetId: string,
    newAssetData: any
  ): Promise<IMedia> {
    // 1. Register the new upload
    const newAsset = await this.registerMediaAsset(tenantId, userId, newAssetData);

    // 2. Delete the old asset
    try {
      await this.deleteMediaAsset(tenantId, oldAssetId);
    } catch (err: any) {
      console.warn(`[MediaService] Replace warning: failed to delete old asset ${oldAssetId}:`, err.message);
    }

    return newAsset;
  }

  /**
   * Helper utility to generate optimized Cloudinary URL for a registered asset
   */
  static getOptimizedUrl(publicId: string, folder: string, transformations: object = {}): string {
    const fullPublicId = `${folder}/${publicId}`;
    return cloudinary.url(fullPublicId, {
      secure: true,
      quality: "auto",
      fetch_format: "auto",
      ...transformations,
    });
  }
}

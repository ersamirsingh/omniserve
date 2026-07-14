import express, { Router } from "express";
import { MediaController } from "./media.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

// Generate signed Cloudinary signature for direct upload
router.post("/signature", verifyToken, MediaController.generateUploadSignature);

// Register successfully uploaded media asset metadata
router.post("/register", verifyToken, MediaController.registerMediaAsset);

// Delete media asset by its MongoDB ID (soft-delete + Cloudinary destroy)
router.delete("/:id", verifyToken, MediaController.deleteMediaAsset);

// Replace an existing media asset (register new + delete old)
router.put("/:id", verifyToken, MediaController.replaceMediaAsset);

export default router;

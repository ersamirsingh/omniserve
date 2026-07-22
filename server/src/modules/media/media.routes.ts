import express, { Router } from "express";
import { MediaController } from "./media.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.post("/signature", verifyToken, MediaController.generateUploadSignature);

router.post("/register", verifyToken, MediaController.registerMediaAsset);

router.delete("/:id", verifyToken, MediaController.deleteMediaAsset);

router.put("/:id", verifyToken, MediaController.replaceMediaAsset);

export default router;

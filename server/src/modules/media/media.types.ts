export interface MediaMetadata {
  publicId: string;
  secureUrl: string;
  folder: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  version: string;
  uploadedAt: Date;
}

export interface SignatureRequest {
  folder: string;
}

export interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
}

export interface UploadResult {
  publicId: string;
  secureUrl: string;
}
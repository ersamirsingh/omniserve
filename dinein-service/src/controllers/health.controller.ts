import type { Request, Response } from 'express';

export const healthCheck = (_req: Request, res: Response): Response =>
  res.status(200).json({
    success: true,
    message: 'Dine-in service is healthy',
    timestamp: new Date().toISOString(),
  });

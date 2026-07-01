import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export class ApiResponseHandler {
  static success<T>(
    res: Response,
    statusCode: number,
    message: string,
    data?: T
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data && { data }),
    });
  }

  static error(
    res: Response,
    statusCode: number,
    message: string,
    error?: string
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(error && { error }),
    });
  }

  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, 401, message);
  }

  static forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, 403, message);
  }

  static notFound(res: Response, message = 'Not found'): Response {
    return this.error(res, 404, message);
  }

  static badRequest(res: Response, message = 'Bad request', data?: any): Response {
    return res.status(400).json({
      success: false,
      message,
      ...(data && { data }),
    });
  }

  static internalError(
    res: Response,
    message = 'Internal server error'
  ): Response {
    return this.error(res, 500, message);
  }
}

import type { NextFunction, Request, Response } from 'express';
type ZodSchema = {
  safeParse: (input: unknown) => { success: true; data: any } | { success: false; error: unknown };
};

export const validate =
  (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(result.error);
      return;
    }

    req[source] = result.data;
    next();
  };

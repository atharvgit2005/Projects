import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    logger.info({
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: duration,
      ip
    }, `${method} ${originalUrl} ${statusCode} - ${duration}ms`);
  });

  next();
}

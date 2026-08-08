import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { StageError } from '../types';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Erreur HTTP', error);

  const stage = error instanceof StageError ? error.stage : 'unknown';
  res.status(500).json({ stage, message: error.message });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ message: `Route inconnue : ${req.method} ${req.path}` });
}

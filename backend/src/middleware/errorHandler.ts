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

  if (error instanceof StageError) {
    res.status(500).json({ stage: error.stage, message: error.message });
    return;
  }

  res.status(500).json({
    stage: 'unknown',
    message: 'Une erreur interne est survenue. Réessaie dans quelques instants.',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ message: `Route inconnue : ${req.method} ${req.path}` });
}

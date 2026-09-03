import { config } from '../config/env';

function timestamp(): string {
  return new Date().toISOString().split('T')[1].replace('Z', '');
}

export const logger = {
  info(message: string, ...args: unknown[]): void {
    console.log(`[${timestamp()}] i  ${message}`, ...args);
  },

  success(message: string, ...args: unknown[]): void {
    console.log(`[${timestamp()}] OK ${message}`, ...args);
  },

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${timestamp()}] !  ${message}`, ...args);
  },

  error(message: string, error?: unknown): void {
    console.error(`[${timestamp()}] X  ${message}`);
    if (error instanceof Error) {
      console.error(`   -> ${error.message}`);
      if (config.isDev && error.stack) console.error(error.stack);
    } else if (error !== undefined) {
      console.error('   ->', error);
    }
  },

  /** Affiche la durée d'une étape, pour traquer la latence */
  timing(stage: string, ms: number): void {
    console.log(`[${timestamp()}] ~  ${stage} : ${ms}ms`);
  },
};

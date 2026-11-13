import { Request, Response } from 'express';
import { env } from '../config/env.config';
import { currentSalonConfig } from '../config/salon.config';

export class HealthController {
  public static check(req: Request, res: Response): void {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'AI Voice Receptionist Voice Gateway',
      environment: env.NODE_ENV,
      receptionist: currentSalonConfig.receptionistName,
      salon: currentSalonConfig.name,
      location: currentSalonConfig.location,
      n8n_url: env.N8N_BASE_URL,
      gemini_configured: !!env.GEMINI_API_KEY
    });
  }
}

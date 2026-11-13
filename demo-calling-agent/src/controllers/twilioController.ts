import { Request, Response } from 'express';
import { TwimlService } from '../services/twilio/twimlService';
import { logger } from '../utils/logger';

export class TwilioController {
  /**
   * Handles incoming call webhook from Twilio. Returns TwiML XML with <Connect><Stream>.
   */
  public static handleVoiceCall(req: Request, res: Response): void {
    const callerPhone = req.body?.From || req.query?.From || '+919876543210';
    const hostHeader = req.headers.host;

    logger.info({ callerPhone, hostHeader }, '📞 Incoming Twilio Voice Call received');

    const twimlXml = TwimlService.generateMediaStreamTwiML(hostHeader, callerPhone as string);

    res.set({
      'Content-Type': 'text/xml',
      'ngrok-skip-browser-warning': 'true'
    });
    res.status(200).send(twimlXml);
  }
}

import { Request, Response } from 'express';
import { DatabaseService } from '../services/database/supabaseClient';
import { BookingService } from '../services/booking/bookingService';
import { CallSessionManager } from '../services/booking/sessionManager';
import { MediaStreamHandler } from '../services/twilio/mediaStreamHandler';
import { currentSalonConfig } from '../config/salon.config';
import { z } from 'zod';

const testBookingSchema = z.object({
  customer_name: z.string().min(1, 'customer_name is required'),
  phone: z.string().optional().default('+919876543210'),
  service: z.string().min(1, 'service is required'),
  date: z.string().min(1, 'date is required'),
  time: z.string().min(1, 'time is required'),
  notes: z.string().optional()
});

export class BookingController {
  /**
   * GET /appointments - List all appointments
   */
  public static async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const appointments = await DatabaseService.getAppointments();
      res.status(200).json({
        success: true,
        count: appointments.length,
        appointments
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error fetching appointments',
        error: error.message
      });
    }
  }

  /**
   * POST /test-booking - Direct booking creation test
   */
  public static async createTestBooking(req: Request, res: Response): Promise<void> {
    const parseResult = testBookingSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid test booking payload',
        errors: parseResult.error.format()
      });
      return;
    }

    try {
      const bookingResult = await BookingService.createBooking(parseResult.data);
      res.status(201).json(bookingResult);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Test booking failed',
        error: error.message
      });
    }
  }

  /**
   * GET /api/salon-config - Get current salon profile & service pricing
   */
  public static getSalonConfig(req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      config: currentSalonConfig
    });
  }

  /**
   * GET /api/live-sessions - Get active voice call sessions
   */
  public static getLiveSessions(req: Request, res: Response): void {
    const activeSessions = CallSessionManager.getAllSessions();
    res.status(200).json({
      success: true,
      active_calls: activeSessions.length,
      sessions: activeSessions
    });
  }

  /**
   * GET /api/call-diagnostics - Recent call-stream milestones for local debugging.
   * No transcript or caller phone number is exposed here.
   */
  public static getCallDiagnostics(req: Request, res: Response): void {
    res.status(200).json({ success: true, events: MediaStreamHandler.getRecentDiagnostics() });
  }

  /**
   * POST /api/voice-preview - Synthesizes text preview with Shreya (Inworld Voice) for browser playout
   */
  public static async generateVoicePreview(req: Request, res: Response): Promise<void> {
    const text = req.body?.text || req.query?.text || "Namaste! Main Shreya, Habib's Salon Pune ki AI receptionist. Main aapki kaise madad kar sakti hoon?";

    try {
      const { InworldVoiceService } = await import('../services/inworld/inworldVoiceService');
      const mp3Buffer = await InworldVoiceService.synthesizeToMp3Buffer(text as string);

      if (mp3Buffer) {
        res.set({
          'Content-Type': 'audio/mpeg',
          'Content-Length': mp3Buffer.length
        });
        res.send(mp3Buffer);
      } else {
        res.status(400).json({
          success: false,
          message: 'Inworld AI Voice API key is not configured.'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to synthesize voice preview',
        error: error.message
      });
    }
  }

  /**
   * POST /api/make-call - Initiates outbound call from Twilio to specified phone number
   */
  public static async triggerOutboundCall(req: Request, res: Response): Promise<void> {
    const toPhone = req.body?.phone || '+919098344807';

    try {
      const twilio = (await import('twilio')).default;
      const { env } = await import('../config/env.config');
      const { getPublicBaseUrl } = await import('../config/publicUrl');
      
      const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      const voiceWebhookUrl = `${getPublicBaseUrl()}/twilio/voice`;

      const call = await client.calls.create({
        url: voiceWebhookUrl,
        to: toPhone,
        from: env.TWILIO_PHONE_NUMBER || '+13187144763'
      });

      res.status(200).json({
        success: true,
        message: `Outbound call initiated from ${env.TWILIO_PHONE_NUMBER} to ${toPhone}`,
        callSid: call.sid,
        status: call.status
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Outbound call failed',
        error: error.message
      });
    }
  }
}

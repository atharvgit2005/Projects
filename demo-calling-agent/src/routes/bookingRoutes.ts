import { Router } from 'express';
import { BookingController } from '../controllers/bookingController';

const router = Router();

router.get('/appointments', BookingController.getAppointments);
router.post('/test-booking', BookingController.createTestBooking);
router.get('/api/salon-config', BookingController.getSalonConfig);
router.get('/api/live-sessions', BookingController.getLiveSessions);
router.get('/api/call-diagnostics', BookingController.getCallDiagnostics);
router.all('/api/voice-preview', BookingController.generateVoicePreview);
router.post('/api/make-call', BookingController.triggerOutboundCall);

export default router;

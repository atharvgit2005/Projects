import { Router } from 'express';
import { TwilioController } from '../controllers/twilioController';

const router = Router();

// Twilio Voice Webhook URL
router.post('/voice', TwilioController.handleVoiceCall);
router.get('/voice', TwilioController.handleVoiceCall);

export default router;

import VoiceResponse from 'twilio/lib/twiml/VoiceResponse';
import { getPublicBaseUrl } from '../../config/publicUrl';
import { logger } from '../../utils/logger';

export class TwimlService {
  /**
   * Generates TwiML XML response connecting incoming Twilio call to Node.js Voice WebSocket Media Stream.
   * @param host Retained for compatibility. The configured public tunnel URL is
   * used because reverse proxies may rewrite this header to localhost.
   * @param callerPhone Incoming caller's phone number
   */
  public static generateMediaStreamTwiML(_host?: string, callerPhone?: string): string {
    const response = new VoiceResponse();

    const publicBaseUrl = getPublicBaseUrl();
    const streamUrl = `${publicBaseUrl.replace(/^https:/, 'wss:')}/media-stream`;

    logger.info({ streamUrl, callerPhone }, 'Generating TwiML Media Stream response');

    // This is deliberately rendered by Twilio before the WebSocket opens. It
    // guarantees callers hear an acknowledgement even if an external TTS
    // provider is slow or temporarily unavailable.
    response.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      "Namaste. Welcome to Habib's Salon Pune. Please tell me how I can help you."
    );

    const connect = response.connect();
    const stream = connect.stream({
      url: streamUrl,
      // Be explicit: the receptionist must receive the caller microphone,
      // not an outbound/mixed track.
      track: 'inbound_track'
    });

    if (callerPhone) {
      stream.parameter({
        name: 'callerPhone',
        value: callerPhone
      });
    }

    return response.toString();
  }
}

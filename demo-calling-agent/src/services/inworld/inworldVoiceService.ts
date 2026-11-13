import axios from 'axios';
import { env } from '../../config/env.config';
import { logger } from '../../utils/logger';
import { AudioConverter } from '../../utils/audioConverter';

export class InworldVoiceService {
  private static apiKey = env.INWORLD_API_KEY;
  private static voiceId = env.INWORLD_VOICE_ID || 'Shreya';
  private static modelId = 'inworld-tts-2';

  /**
   * Checks whether Inworld AI Voice API credentials are configuration ready
   */
  public static isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey !== 'your_inworld_api_key_here');
  }

  /**
   * Synthesizes text to hyper-realistic human voice audio using Inworld AI Voice Engine (Shreya voice).
   * Transcodes generated 16kHz LINEAR16 PCM audio to 8kHz G.711 µ-law base64 for Twilio Media Stream playout.
   * @param text Speech string to synthesize in Hindi, Hinglish, or English
   */
  public static async synthesizeToMulaw(text: string): Promise<string | null> {
    if (!this.isConfigured()) {
      logger.debug('Inworld AI Voice API key not configured. Using default stream.');
      return null;
    }

    logger.info({ text, voiceId: this.voiceId, modelId: this.modelId }, '🎙️ Synthesizing ultra-realistic voice with Inworld AI (Shreya)');

    try {
      // Inworld AI Voice API Call (Shreya / inworld-tts-2)
      const response = await axios.post(
        'https://api.inworld.ai/tts/v1/voice',
        {
          text,
          voiceId: this.voiceId,
          modelId: this.modelId,
          deliveryMode: 'BALANCED',
          language: 'AUTO',
          audioConfig: {
            audioEncoding: 'LINEAR16',
            sampleRateHertz: 16000,
            speakingRate: 1
          }
        },
        {
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 4000
        }
      );

      const pcmBase64 = response.data?.audioContent;
      if (pcmBase64) {
        // Transcode 16kHz PCM16 audio from Inworld AI (Shreya) to 8kHz G.711 µ-law for Twilio
        const mulawBase64 = AudioConverter.pcmToMulaw8k(pcmBase64, 16000);
        logger.info('✅ Inworld AI Shreya voice synthesized & transcoded to Twilio 8kHz G.711 µ-law');
        return mulawBase64;
      }

      return null;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, '⚠️ Error calling Inworld AI Voice API');
      return null;
    }
  }

  /**
   * Synthesizes text to MP3 audio Buffer for web browser preview playback.
   */
  public static async synthesizeToMp3Buffer(text: string): Promise<Buffer | null> {
    if (!this.isConfigured()) return null;

    try {
      const response = await axios.post(
        'https://api.inworld.ai/tts/v1/voice',
        {
          text,
          voiceId: this.voiceId,
          modelId: this.modelId,
          deliveryMode: 'BALANCED',
          language: 'AUTO',
          audioConfig: {
            speakingRate: 1
          }
        },
        {
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      const mp3Base64 = response.data?.audioContent;
      if (mp3Base64) {
        return Buffer.from(mp3Base64, 'base64');
      }
      return null;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, '⚠️ Error synthesizing MP3 preview');
      return null;
    }
  }
}

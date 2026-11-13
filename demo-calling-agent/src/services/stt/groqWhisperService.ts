import axios from 'axios';
import FormData from 'form-data';
import { env } from '../../config/env.config';
import { logger } from '../../utils/logger';
import { AudioConverter } from '../../utils/audioConverter';

export class GroqWhisperService {
  private static apiKey = env.GROQ_API_KEY;
  private static groqEndpoint = 'https://api.groq.com/openai/v1/audio/transcriptions';

  /**
   * Checks if Groq API key is configured
   */
  public static isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey !== 'your_groq_api_key_here');
  }

  /**
   * Encodes PCM16 16kHz audio buffer into a valid WAV audio file Buffer with 44-byte header
   */
  private static createWavBuffer(pcmBuffer: Buffer, sampleRate: number = 16000): Buffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmBuffer.length;
    const chunkSize = 36 + dataSize;

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(chunkSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
    header.writeUInt16LE(1, 20);  // AudioFormat = 1 (PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  /**
   * Transcribes G.711 µ-law 8kHz audio chunk using Groq Whisper-large-v3 model.
   * @param base64Mulaw8k Base64 encoded µ-law 8kHz audio chunk from Twilio
   */
  public static async transcribeMulaw8k(base64Mulaw8k: string): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      // 1. Convert µ-law 8kHz base64 audio to PCM16 16kHz base64
      const pcm16kBase64 = AudioConverter.mulaw8kToPcm16k(base64Mulaw8k);
      const pcmBuffer = Buffer.from(pcm16kBase64, 'base64');

      if (pcmBuffer.length < 1600) return null; // Ignore micro-chunks under 100ms

      // 2. Wrap PCM audio in standard WAV container
      const wavBuffer = this.createWavBuffer(pcmBuffer, 16000);

      // 3. Prepare FormData for Groq Whisper API
      const form = new FormData();
      form.append('file', wavBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      form.append('model', 'whisper-large-v3-turbo');
      form.append('prompt', "Habib's Salon Pune, Shreya, Haircut, Hair Spa, Keratin, Smoothening, Vikram, Rahul, Ananya, Atharv");
      form.append('temperature', '0.0');
      form.append('response_format', 'json');

      logger.info('⚡ Transcribing voice with Groq Whisper-large-v3...');

      const response = await axios.post(this.groqEndpoint, form, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...form.getHeaders()
        },
        timeout: 3500
      });

      const transcript = response.data?.text?.trim();
      if (transcript && transcript.length > 0) {
        logger.info({ transcript }, '🎯 Groq Whisper-large-v3 Transcription Result');
        return transcript;
      }

      return null;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, '⚠️ Groq Whisper STT API error');
      return null;
    }
  }
}

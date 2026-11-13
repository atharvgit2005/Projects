import WebSocket from 'ws';
import { logger } from '../../utils/logger';
import { CallSessionManager } from '../booking/sessionManager';
import { GroqWhisperService } from '../stt/groqWhisperService';
import { GroqLlmService } from '../llm/groqLlmService';
import { InworldVoiceService } from '../inworld/inworldVoiceService';
import {
  TwilioInboundMessage,
  TwilioOutboundMedia,
  TwilioOutboundClear
} from '../../types/twilio.types';

export class MediaStreamHandler {
  private static readonly maxDiagnostics = 80;
  private static diagnostics: Array<Record<string, unknown>> = [];
  private twilioWs: WebSocket;
  private streamSid: string = '';
  private callSid: string = '';
  private callerPhone: string = '+919876543210';
  // Twilio sends each 20 ms frame as an independently base64-encoded string.
  // Buffer decoded bytes, rather than joining those strings: joining base64
  // payloads leaves `=` padding in the middle and makes Node decode only part
  // of the caller's utterance.
  private audioBuffer: Buffer[] = [];
  private isProcessingSpeech: boolean = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private maxUtteranceTimer: NodeJS.Timeout | null = null;
  private receivedFrames = 0;
  private speechFrames = 0;

  public static getRecentDiagnostics(): Array<Record<string, unknown>> {
    return [...this.diagnostics];
  }

  private recordDiagnostic(event: string, details: Record<string, unknown> = {}): void {
    MediaStreamHandler.diagnostics.push({
      timestamp: new Date().toISOString(),
      streamSid: this.streamSid || 'pending',
      event,
      ...details
    });
    if (MediaStreamHandler.diagnostics.length > MediaStreamHandler.maxDiagnostics) {
      MediaStreamHandler.diagnostics.splice(0, MediaStreamHandler.diagnostics.length - MediaStreamHandler.maxDiagnostics);
    }
  }
  private playoutInterval: NodeJS.Timeout | null = null;

  constructor(ws: WebSocket) {
    this.twilioWs = ws;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.twilioWs.on('message', async (data: WebSocket.Data) => {
      try {
        const message: TwilioInboundMessage = JSON.parse(data.toString('utf8'));
        await this.handleTwilioMessage(message);
      } catch (error) {
        logger.error({ error }, 'Error parsing Twilio Media Stream message');
      }
    });

    this.twilioWs.on('close', (code, reason) => {
      logger.info({ streamSid: this.streamSid, code, reason: reason.toString() }, 'Twilio Media Stream WebSocket closed');
      this.recordDiagnostic('websocket_closed', { code, reason: reason.toString() });
      this.cleanup();
    });

    this.twilioWs.on('error', (error) => {
      logger.error({ error, streamSid: this.streamSid }, 'Twilio Media Stream WebSocket error');
      this.recordDiagnostic('websocket_error', { message: error.message });
      this.cleanup();
    });
  }

  private async handleTwilioMessage(message: TwilioInboundMessage): Promise<void> {
    switch (message.event) {
      case 'connected':
        logger.info({ protocol: message.protocol, version: message.version }, 'Twilio Media Stream connected');
        break;

      case 'start':
        this.streamSid = message.streamSid || message.start?.streamSid || '';
        this.callSid = message.start?.callSid || '';
        this.callerPhone = message.start?.customParameters?.callerPhone || '+919098344807';

        logger.info(
          { streamSid: this.streamSid, callSid: this.callSid, callerPhone: this.callerPhone },
          '🎬 Twilio Media Stream Started'
        );
        this.recordDiagnostic('stream_started');

        // 1. Create Call Session
        CallSessionManager.createSession(this.streamSid, this.callSid, this.callerPhone);

        // The initial acknowledgement is spoken with TwiML <Say> before the
        // stream opens. Keeping it outside the external TTS path prevents a
        // caller from hearing dead air while Inworld is synthesizing audio.

        break;

      case 'media':
        if (message.media?.payload) {
          const audioFrame = Buffer.from(message.media.payload, 'base64');
          if (audioFrame.length === 0) return;

          const containsSpeech = this.isSpeechFrame(audioFrame);
          this.receivedFrames++;
          if (containsSpeech) this.speechFrames++;

          if (this.receivedFrames % 50 === 0) {
            const signal = this.getFrameSignal(audioFrame);
            this.recordDiagnostic('audio_received', {
              frames: this.receivedFrames,
              speechFrames: this.speechFrames,
              bufferedFrames: this.audioBuffer.length,
              track: message.media.track,
              maxAmplitude: signal.maxAmplitude,
              activeSamplePercent: signal.activeSamplePercent
            });
          }

          // Ignore dead-air frames until the caller starts speaking. Once a
          // spoken utterance has begun, retain its trailing silence so Whisper
          // gets natural word endings.
          if (containsSpeech || this.audioBuffer.length > 0) {
            this.audioBuffer.push(audioFrame);
          }

          if (containsSpeech) {
            if (this.silenceTimer) {
              clearTimeout(this.silenceTimer);
              this.silenceTimer = null;
            }

            // Do not wait indefinitely for a pause: callers can speak for a
            // long time without leaving an 800 ms gap.
            if (!this.maxUtteranceTimer && !this.isProcessingSpeech) {
              this.recordDiagnostic('speech_detected', { bufferedFrames: this.audioBuffer.length });
              this.maxUtteranceTimer = setTimeout(() => {
                this.maxUtteranceTimer = null;
                void this.processBufferedAudio();
              }, 6000);
            }
          } else if (this.audioBuffer.length > 0 && !this.isProcessingSpeech) {
            // Twilio continues to send silent frames. Only silence following
            // detected speech starts the end-of-utterance countdown.
            if (this.silenceTimer) clearTimeout(this.silenceTimer);
            this.silenceTimer = setTimeout(() => {
              this.silenceTimer = null;
              void this.processBufferedAudio();
            }, 800);
          }
        }
        break;

      case 'stop':
        logger.info({ streamSid: this.streamSid }, '🛑 Twilio Media Stream Stopped');
        this.cleanup();
        break;

      default:
        break;
    }
  }

  /**
   * Processes accumulated audio buffer with Groq Whisper STT + Groq LLM + Inworld Voice
   */
  private async processBufferedAudio(): Promise<void> {
    if (this.audioBuffer.length === 0 || this.isProcessingSpeech) return;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.maxUtteranceTimer) {
      clearTimeout(this.maxUtteranceTimer);
      this.maxUtteranceTimer = null;
    }

    this.isProcessingSpeech = true;
    const combinedBase64Audio = Buffer.concat(this.audioBuffer).toString('base64');
    this.recordDiagnostic('transcription_started', {
      bufferedFrames: this.audioBuffer.length,
      audioBytes: Buffer.byteLength(combinedBase64Audio, 'base64')
    });
    this.audioBuffer = [];

    try {
      // 1. Speech-to-Text using Groq Whisper-large-v3
      const userText = await GroqWhisperService.transcribeMulaw8k(combinedBase64Audio);
      this.recordDiagnostic('transcription_finished', { transcriptReceived: Boolean(userText?.trim()) });

      if (userText && userText.trim().length > 1) {
        logger.info({ streamSid: this.streamSid, userText }, '🗣️ Transcribed Customer Speech');

        // 2. LLM Response Generation using Groq Llama-3.3-70b
        const responseText = await GroqLlmService.generateResponse(this.streamSid, userText);

        // 3. Ultra-realistic TTS Synthesis using Inworld AI (Shreya)
        const mulawAudio = await InworldVoiceService.synthesizeToMulaw(responseText);
        if (mulawAudio) {
          this.recordDiagnostic('tts_finished', { audioBytes: Buffer.byteLength(mulawAudio, 'base64') });
          this.sendAudioToTwilio(mulawAudio);
        } else {
          this.recordDiagnostic('tts_empty');
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in speech processing pipeline');
      this.recordDiagnostic('pipeline_error', { message: error.message });
    } finally {
      this.isProcessingSpeech = false;

      // Audio can arrive while STT/TTS is running. A timer that fired during
      // that work returns early, so schedule the pending utterance again.
      if (this.audioBuffer.length > 0 && !this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          this.silenceTimer = null;
          void this.processBufferedAudio();
        }, 800);
      }
    }
  }

  /**
   * Lightweight VAD for Twilio's 8 kHz G.711 µ-law frames. Sampling every
   * fourth byte keeps the hot path cheap. Values above ~200 PCM16 amplitude
   * in at least 3% of a 20 ms frame are treated as speech rather than line
   * noise or µ-law silence (0xff / 0x7f).
   */
  private isSpeechFrame(frame: Buffer): boolean {
    const { activeSamplePercent } = this.getFrameSignal(frame);
    return activeSamplePercent >= 3;
  }

  private getFrameSignal(frame: Buffer): { maxAmplitude: number; activeSamplePercent: number } {
    let loudSamples = 0;
    let sampled = 0;
    let maxAmplitude = 0;

    for (let i = 0; i < frame.length; i += 4) {
      const mulaw = ~frame[i] & 0xff;
      const exponent = (mulaw >> 4) & 0x07;
      const mantissa = mulaw & 0x0f;
      const amplitude = ((mantissa << 3) + 0x84) * (1 << exponent) - 0x84;
      sampled++;
      if (amplitude > maxAmplitude) maxAmplitude = amplitude;
      if (amplitude >= 200) loudSamples++;
    }

    return {
      maxAmplitude,
      activeSamplePercent: sampled > 0 ? Math.round((loudSamples / sampled) * 100) : 0
    };
  }

  /**
   * Chunks large audio payload into 20ms frames (160 raw µ-law bytes) and streams them to Twilio
   * to comply with Twilio Media Streams protocol and prevent buffer overflow disconnects.
   */
  private sendAudioToTwilio(fullPayload: string): void {
    if (this.twilioWs.readyState !== WebSocket.OPEN || !this.streamSid) return;

    if (this.playoutInterval) {
      clearInterval(this.playoutInterval);
      this.playoutInterval = null;
    }

    const audioBytes = Buffer.from(fullPayload, 'base64');
    const chunkSize = 160; // 20ms of G.711 mu-law at 8kHz (one byte per sample)
    let offset = 0;

    this.playoutInterval = setInterval(() => {
      if (offset >= audioBytes.length || this.twilioWs.readyState !== WebSocket.OPEN) {
        if (this.playoutInterval) clearInterval(this.playoutInterval);
        this.playoutInterval = null;
        return;
      }

      const chunk = audioBytes.subarray(offset, offset + chunkSize).toString('base64');
      offset += chunkSize;

      const outboundMessage: TwilioOutboundMedia = {
        event: 'media',
        streamSid: this.streamSid,
        media: { payload: chunk }
      };

      this.twilioWs.send(JSON.stringify(outboundMessage));
    }, 20); // Stream at 20ms frame intervals
  }

  /**
   * Sends clear frame to Twilio and stops active playout interval (Interruption handling)
   */
  private sendClearToTwilio(): void {
    if (this.playoutInterval) {
      clearInterval(this.playoutInterval);
      this.playoutInterval = null;
    }

    if (this.twilioWs.readyState === WebSocket.OPEN && this.streamSid) {
      const clearMessage: TwilioOutboundClear = {
        event: 'clear',
        streamSid: this.streamSid
      };
      this.twilioWs.send(JSON.stringify(clearMessage));
    }
  }

  private cleanup(): void {
    this.recordDiagnostic('stream_stopped', {
      receivedFrames: this.receivedFrames,
      speechFrames: this.speechFrames
    });
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.maxUtteranceTimer) {
      clearTimeout(this.maxUtteranceTimer);
      this.maxUtteranceTimer = null;
    }

    if (this.playoutInterval) {
      clearInterval(this.playoutInterval);
      this.playoutInterval = null;
    }

    if (this.streamSid) {
      CallSessionManager.removeSession(this.streamSid);
    }
  }
}

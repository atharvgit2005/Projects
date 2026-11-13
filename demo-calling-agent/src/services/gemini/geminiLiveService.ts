import WebSocket from 'ws';
import { env } from '../../config/env.config';
import { logger } from '../../utils/logger';
import { getSystemPrompt } from '../../prompts/systemPrompt';
import { GEMINI_TOOLS_DECLARATIONS } from './toolsDeclarations';
import { BookingService } from '../booking/bookingService';
import { CallSessionManager } from '../booking/sessionManager';
import { AudioConverter } from '../../utils/audioConverter';
import { InworldVoiceService } from '../inworld/inworldVoiceService';
import {
  GeminiSetupFrame,
  GeminiRealtimeInputFrame,
  GeminiToolResponseFrame,
  GeminiServerFrame
} from '../../types/gemini.types';

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private streamSid: string;
  private onAudioOutputCallback: (base64MulawAudio: string) => void;
  private onClearPlayoutCallback: () => void;
  private isConnected: boolean = false;

  constructor(
    streamSid: string,
    onAudioOutput: (base64MulawAudio: string) => void,
    onClearPlayout: () => void
  ) {
    this.streamSid = streamSid;
    this.onAudioOutputCallback = onAudioOutput;
    this.onClearPlayoutCallback = onClearPlayout;
  }

  /**
   * Connects to Google Gemini Live API WebSocket endpoint
   */
  public async connect(): Promise<void> {
    const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${env.GEMINI_API_KEY}`;
    logger.info({ streamSid: this.streamSid }, 'Connecting to Gemini Live API WebSocket...');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(geminiWsUrl);

      this.ws.on('open', () => {
        logger.info({ streamSid: this.streamSid }, '✅ Connected to Gemini Live API WebSocket');
        this.isConnected = true;
        this.sendSetupFrame();
        resolve();
      });

      this.ws.on('message', async (data: WebSocket.Data) => {
        try {
          const frameText = data.toString('utf8');
          const serverFrame: GeminiServerFrame = JSON.parse(frameText);
          await this.handleServerFrame(serverFrame);
        } catch (error) {
          logger.error({ error, streamSid: this.streamSid }, 'Error parsing Gemini Live WebSocket message');
        }
      });

      this.ws.on('error', (error) => {
        logger.error({ error, streamSid: this.streamSid }, '❌ Gemini Live WebSocket error');
        if (!this.isConnected) reject(error);
      });

      this.ws.on('close', (code, reason) => {
        logger.warn({ code, reason: reason.toString(), streamSid: this.streamSid }, 'Gemini Live WebSocket closed');
        this.isConnected = false;
      });
    });
  }

  /**
   * Sends initial setup frame with Priya system prompt and tool definitions
   */
  private sendSetupFrame(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupFrame: GeminiSetupFrame = {
      setup: {
        model: 'models/gemini-2.0-flash-exp',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: env.GEMINI_VOICE_NAME || 'Kore'
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: getSystemPrompt() }]
        },
        tools: [
          {
            functionDeclarations: GEMINI_TOOLS_DECLARATIONS
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(setupFrame));
    logger.info({ streamSid: this.streamSid }, 'Sent setup frame to Gemini Live API');
  }

  /**
   * Forwards audio chunk from Twilio to Gemini Live API after PCM16 16kHz resampling
   */
  public sendAudioChunk(base64Mulaw8k: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) return;

    // Convert Twilio 8kHz mulaw audio to 16kHz PCM16 base64
    const base64Pcm16k = AudioConverter.mulaw8kToPcm16k(base64Mulaw8k);

    const inputFrame: GeminiRealtimeInputFrame = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm16k
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(inputFrame));
  }

  /**
   * Handles incoming server frame from Gemini (Audio chunks or Function Calls)
   */
  private async handleServerFrame(frame: GeminiServerFrame): Promise<void> {
    // 1. Handle Interruption
    if (frame.serverContent?.interrupted) {
      logger.info({ streamSid: this.streamSid }, 'User interrupted Gemini speech. Clearing playout buffer.');
      this.onClearPlayoutCallback();
      return;
    }

    // 2. Handle Audio Output Parts
    const parts = frame.serverContent?.modelTurn?.parts || [];
    for (const part of parts) {
      if (part.text) {
        logger.debug({ text: part.text, streamSid: this.streamSid }, 'Gemini Text output received');
        CallSessionManager.addTranscript(this.streamSid, 'assistant', part.text);

        // If Inworld AI Voice is configured, synthesize hyper-realistic voice audio
        if (InworldVoiceService.isConfigured()) {
          const inworldAudio = await InworldVoiceService.synthesizeToMulaw(part.text);
          if (inworldAudio) {
            this.onAudioOutputCallback(inworldAudio);
            continue;
          }
        }
      }

      if (part.inlineData && part.inlineData.data && !InworldVoiceService.isConfigured()) {
        // Convert Gemini PCM 24kHz output to Twilio 8kHz mulaw base64
        const mulawBase64 = AudioConverter.pcmToMulaw8k(part.inlineData.data, 24000);
        if (mulawBase64) {
          this.onAudioOutputCallback(mulawBase64);
        }
      }
    }

    // 3. Handle Function Calls
    if (frame.toolCall && frame.toolCall.functionCalls.length > 0) {
      for (const call of frame.toolCall.functionCalls) {
        await this.executeFunctionCall(call.id, call.name, call.args);
      }
    }
  }

  /**
   * Executes tool call requested by Gemini and sends result back via toolResponse
   */
  private async executeFunctionCall(callId: string, functionName: string, args: Record<string, any>): Promise<void> {
    logger.info({ callId, functionName, args, streamSid: this.streamSid }, '⚡ Gemini Tool Call Execution');

    let result: any = {};

    try {
      if (functionName === 'check_slots') {
        result = await BookingService.checkSlots(args as any);
      } else if (functionName === 'create_booking') {
        result = await BookingService.createBooking(args as any);
      } else if (functionName === 'cancel_booking') {
        result = await BookingService.cancelBooking(args as any);
      } else if (functionName === 'reschedule_booking') {
        result = await BookingService.rescheduleBooking(args as any);
      } else if (functionName === 'get_services') {
        result = await BookingService.getServices();
      } else {
        result = { error: `Unknown tool function: ${functionName}` };
      }
    } catch (error: any) {
      logger.error({ error, functionName }, 'Error executing tool function');
      result = { success: false, message: 'I will have our team call you directly.' };
    }

    CallSessionManager.logToolCall(this.streamSid, functionName, args, result);

    // Send Tool Response frame back to Gemini Live
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const responseFrame: GeminiToolResponseFrame = {
        toolResponse: {
          functionResponses: [
            {
              response: { output: result },
              id: callId
            }
          ]
        }
      };

      this.ws.send(JSON.stringify(responseFrame));
      logger.info({ callId, functionName, streamSid: this.streamSid }, 'Sent toolResponse back to Gemini Live');
    }
  }

  /**
   * Close connection to Gemini Live
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

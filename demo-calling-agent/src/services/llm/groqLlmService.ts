import axios from 'axios';
import { env } from '../../config/env.config';
import { logger } from '../../utils/logger';
import { getSystemPrompt } from '../../prompts/systemPrompt';
import { BookingService } from '../booking/bookingService';
import { CallSessionManager } from '../booking/sessionManager';

export class GroqLlmService {
  private static apiKey = env.GROQ_API_KEY;
  private static endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  private static model = 'llama-3.3-70b-versatile';

  // Groq's chat-completions API uses the OpenAI tool-calling format. These
  // declarations make the n8n-backed booking functions reachable from the
  // active Groq path (the previous Gemini-only declarations were unused).
  private static tools = [
    {
      type: 'function',
      function: {
        name: 'check_slots',
        description: 'Check appointment availability before offering or confirming a time.',
        parameters: { type: 'object', properties: { date: { type: 'string' }, time: { type: 'string' }, service: { type: 'string' } }, required: ['date'] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_booking',
        description: 'Create an appointment only after the customer has confirmed their details.',
        parameters: { type: 'object', properties: { customer_name: { type: 'string' }, phone: { type: 'string' }, service: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' }, notes: { type: 'string' } }, required: ['customer_name', 'service', 'date', 'time'] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'cancel_booking',
        description: 'Cancel an existing appointment.',
        parameters: { type: 'object', properties: { booking_id: { type: 'string' }, phone: { type: 'string' }, service: { type: 'string' }, date: { type: 'string' } } }
      }
    },
    {
      type: 'function',
      function: {
        name: 'reschedule_booking',
        description: 'Reschedule an existing appointment.',
        parameters: { type: 'object', properties: { booking_id: { type: 'string' }, phone: { type: 'string' }, new_date: { type: 'string' }, new_time: { type: 'string' } }, required: ['new_date', 'new_time'] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_services',
        description: 'Get the salon service list and pricing.',
        parameters: { type: 'object', properties: {} }
      }
    }
  ];

  public static isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey !== 'your_groq_api_key_here');
  }

  /**
   * Generates conversational AI response using Groq Llama-3.3-70b with tool calling & session history
   */
  public static async generateResponse(
    streamSid: string,
    userSpeech: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      return "Namaste! Welcome to Habib's Salon Pune. Main Shreya... aapki kya madad kar sakti hoon?";
    }

    logger.info({ streamSid, userSpeech }, '⚡ Processing conversation with Groq LLM (Llama-3.3-70b)...');

    // Retrieve session conversation history
    const history = CallSessionManager.getHistory(streamSid) || [];
    
    const messages: any[] = [
      { role: 'system', content: getSystemPrompt() },
      ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: userSpeech }
    ];

    try {
      const requestCompletion = async () => axios.post(
        this.endpoint,
        { model: this.model, messages, tools: this.tools, tool_choice: 'auto', temperature: 0.4, max_tokens: 150 },
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 5000 }
      );

      let completion = await requestCompletion();
      let message = completion.data?.choices?.[0]?.message;
      const toolCalls = message?.tool_calls || [];

      if (toolCalls.length > 0) {
        messages.push({ role: 'assistant', content: message.content || null, tool_calls: toolCalls });

        for (const toolCall of toolCalls) {
          let args: Record<string, any> = {};
          try {
            args = JSON.parse(toolCall.function?.arguments || '{}');
          } catch {
            args = {};
          }

          const result = await this.executeTool(toolCall.function?.name, args, streamSid);
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
        }

        completion = await requestCompletion();
        message = completion.data?.choices?.[0]?.message;
      }

      let reply = message?.content?.trim() || "Namaste! Aapka swagat hai Habib's Salon Pune mein.";

      // Some Groq responses use a legacy inline function marker instead of
      // OpenAI's `tool_calls` field. Execute it as well, and never speak the
      // implementation marker to a caller.
      if (toolCalls.length === 0) {
        const legacyTool = reply.match(/<function=([a-z_]+)>([\s\S]*?)<\/function>/i);
        if (legacyTool) {
          let args: Record<string, any> = {};
          const rawArgs = legacyTool[2].trim();
          if (rawArgs) {
            try { args = JSON.parse(rawArgs); } catch { args = {}; }
          }
          await this.executeTool(legacyTool[1], args, streamSid);
          reply = reply.replace(legacyTool[0], '').trim();
        }
      }
      
      // Update session transcript memory
      CallSessionManager.addTranscript(streamSid, 'user', userSpeech);
      CallSessionManager.addTranscript(streamSid, 'assistant', reply);

      logger.info({ streamSid, reply }, '✅ Groq LLM Generated Response');
      return reply;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, '⚠️ Error generating response from Groq LLM');
      return "Namaste! Main Shreya... kal kis time ki appointment book karni hai?";
    }
  }

  private static async executeTool(functionName: string, args: Record<string, any>, streamSid: string): Promise<unknown> {
    if (!args || typeof args !== 'object' || Array.isArray(args)) args = {};
    const callerPhone = CallSessionManager.getSession(streamSid)?.callerPhone;
    if (callerPhone && !args.phone) args.phone = callerPhone;

    let result: unknown;
    switch (functionName) {
      case 'check_slots': result = await BookingService.checkSlots(args as any); break;
      case 'create_booking': result = await BookingService.createBooking(args as any); break;
      case 'cancel_booking': result = await BookingService.cancelBooking(args as any); break;
      case 'reschedule_booking': result = await BookingService.rescheduleBooking(args as any); break;
      case 'get_services': result = await BookingService.getServices(); break;
      default: result = { success: false, message: `Unknown tool: ${functionName}` };
    }

    CallSessionManager.logToolCall(streamSid, functionName, args, result);
    logger.info({ streamSid, functionName, args }, 'Executed booking tool through n8n service');
    return result;
  }
}

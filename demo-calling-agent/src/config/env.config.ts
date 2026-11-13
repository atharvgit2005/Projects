import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NGROK_URL: z.string().optional().default(''),
  
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_PHONE_NUMBER: z.string().optional().default(''),
  
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_VOICE_NAME: z.string().default('Kore'),
  
  INWORLD_API_KEY: z.string().optional().default(''),
  INWORLD_SECRET_KEY: z.string().optional().default(''),
  INWORLD_VOICE_ID: z.string().optional().default('inworld-voice-priya-hindi'),
  
  GROQ_API_KEY: z.string().optional().default(''),
  
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE: z.string().optional().default(''),
  
  N8N_BASE_URL: z.string().default('http://localhost:5678/webhook'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Environment Variable Validation Failure:', parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;

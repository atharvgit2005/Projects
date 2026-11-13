import WebSocket from 'ws';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.config';
import { logger } from '../../utils/logger';
import { Appointment } from '../../types/booking.types';

// Polyfill WebSocket globally for Supabase SDK in Node.js 20
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

let supabaseInstance: SupabaseClient | null = null;

// Local in-memory store fallback if Supabase credentials are not configured yet
const localInMemoryStore: Appointment[] = [];

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE) {
  try {
    supabaseInstance = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    logger.info('✅ Supabase database client initialized successfully');
  } catch (error) {
    logger.error({ error }, '⚠️ Failed to initialize Supabase client. Falling back to in-memory database store.');
  }
} else {
  logger.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE not provided in .env. Operating in in-memory fallback mode.');
}

export class DatabaseService {
  /**
   * Retrieves all appointments from Supabase (or in-memory store)
   */
  public static async getAppointments(): Promise<Appointment[]> {
    if (supabaseInstance) {
      const { data, error } = await supabaseInstance
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error({ error }, 'Error fetching appointments from Supabase');
        return localInMemoryStore;
      }

      return data as Appointment[];
    }

    return localInMemoryStore;
  }

  /**
   * Inserts a new appointment record
   */
  public static async createAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const id = 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newAppointment: Appointment = {
      ...appointment,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabaseInstance) {
      const { data, error } = await supabaseInstance
        .from('appointments')
        .insert([newAppointment])
        .select()
        .single();

      if (error) {
        logger.error({ error }, 'Error inserting appointment into Supabase, saving to memory');
        localInMemoryStore.push(newAppointment);
        return newAppointment;
      }

      return data as Appointment;
    }

    localInMemoryStore.push(newAppointment);
    return newAppointment;
  }

  /**
   * Updates an appointment status
   */
  public static async updateAppointmentStatus(id: string, status: Appointment['status'], updates?: Partial<Appointment>): Promise<Appointment | null> {
    if (supabaseInstance) {
      const { data, error } = await supabaseInstance
        .from('appointments')
        .update({ status, ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error({ error, id }, 'Error updating appointment in Supabase');
      } else {
        return data as Appointment;
      }
    }

    const localIndex = localInMemoryStore.findIndex(a => a.id === id);
    if (localIndex !== -1) {
      localInMemoryStore[localIndex] = {
        ...localInMemoryStore[localIndex],
        status,
        ...updates,
        updated_at: new Date().toISOString()
      };
      return localInMemoryStore[localIndex];
    }

    return null;
  }
}

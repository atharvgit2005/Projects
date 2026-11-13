import { N8nService } from '../n8n/n8nService';
import { logger } from '../../utils/logger';
import {
  CheckSlotsParams,
  CreateBookingParams,
  CancelBookingParams,
  RescheduleBookingParams,
  BookingResponse
} from '../../types/booking.types';

export class BookingService {
  /**
   * Check available slots for a given date, time, and service
   */
  public static async checkSlots(params: CheckSlotsParams): Promise<BookingResponse> {
    logger.info({ params }, 'Executing check_slots function');
    try {
      const response = await N8nService.checkSlots(params);
      return {
        success: true,
        message: response.message || `Available slots for ${params.date}`,
        available_slots: response.available_slots || response.data?.slots || ['11:00 AM', '02:00 PM', '05:00 PM', '06:30 PM'],
        data: response.data
      };
    } catch (error: any) {
      logger.error({ error, params }, 'Error checking slots');
      return {
        success: false,
        message: 'Could not check slot availability at the moment.',
        available_slots: ['11:00 AM', '02:00 PM', '05:00 PM']
      };
    }
  }

  /**
   * Create a new appointment booking
   */
  public static async createBooking(params: CreateBookingParams): Promise<BookingResponse> {
    logger.info({ params }, 'Executing create_booking function');
    try {
      const response = await N8nService.createBooking({
        customer_name: params.customer_name,
        phone: params.phone || '+919876543210',
        service: params.service,
        date: params.date,
        time: params.time,
        notes: params.notes || 'Booked via Priya AI Voice Receptionist'
      });

      return {
        success: response.success !== false,
        message: response.message || `Booking confirmed for ${params.customer_name}`,
        appointment: response.appointment,
        data: { booking_id: response.booking_id || response.appointment?.id }
      };
    } catch (error: any) {
      logger.error({ error, params }, 'Error creating booking');
      return {
        success: false,
        message: 'Unable to complete booking right now.'
      };
    }
  }

  /**
   * Cancel an appointment
   */
  public static async cancelBooking(params: CancelBookingParams): Promise<BookingResponse> {
    logger.info({ params }, 'Executing cancel_booking function');
    try {
      const response = await N8nService.cancelBooking(params);
      return {
        success: response.success !== false,
        message: response.message || 'Appointment cancelled successfully.'
      };
    } catch (error: any) {
      logger.error({ error, params }, 'Error cancelling booking');
      return {
        success: false,
        message: 'Could not cancel booking.'
      };
    }
  }

  /**
   * Reschedule an appointment
   */
  public static async rescheduleBooking(params: RescheduleBookingParams): Promise<BookingResponse> {
    logger.info({ params }, 'Executing reschedule_booking function');
    try {
      const response = await N8nService.rescheduleBooking(params);
      return {
        success: response.success !== false,
        message: response.message || `Rescheduled to ${params.new_date} at ${params.new_time}`
      };
    } catch (error: any) {
      logger.error({ error, params }, 'Error rescheduling booking');
      return {
        success: false,
        message: 'Could not reschedule appointment.'
      };
    }
  }

  /**
   * Get available services list
   */
  public static async getServices(): Promise<BookingResponse> {
    logger.info('Executing get_services function');
    try {
      const response = await N8nService.getServices();
      return {
        success: true,
        message: 'Available services retrieved',
        data: response.data
      };
    } catch (error: any) {
      logger.error({ error }, 'Error getting services');
      return {
        success: false,
        message: 'Unable to retrieve services list.'
      };
    }
  }
}

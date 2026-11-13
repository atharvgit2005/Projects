export type BookingStatus = 'confirmed' | 'cancelled' | 'rescheduled' | 'pending';

export interface Appointment {
  id: string;
  customer_name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  status: BookingStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CheckSlotsParams {
  date: string;
  time?: string;
  service?: string;
}

export interface CreateBookingParams {
  customer_name: string;
  phone?: string;
  service: string;
  date: string;
  time: string;
  notes?: string;
}

export interface CancelBookingParams {
  booking_id?: string;
  phone?: string;
  service?: string;
  date?: string;
}

export interface RescheduleBookingParams {
  booking_id?: string;
  phone?: string;
  new_date: string;
  new_time: string;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  appointment?: Appointment;
  available_slots?: string[];
  data?: any;
}

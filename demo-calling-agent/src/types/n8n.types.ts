export interface N8nCheckSlotPayload {
  date: string;
  time?: string;
  service?: string;
  phone?: string;
}

export interface N8nCreateBookingPayload {
  customer_name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  notes?: string;
  salon_name?: string;
  salon_address?: string;
}

export interface N8nCancelBookingPayload {
  booking_id?: string;
  phone?: string;
  service?: string;
  date?: string;
}

export interface N8nRescheduleBookingPayload {
  booking_id?: string;
  phone?: string;
  new_date: string;
  new_time: string;
}

export interface N8nWebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  available_slots?: string[];
  booking_id?: string;
  appointment?: any;
}

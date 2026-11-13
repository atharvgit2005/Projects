import { GeminiFunctionDeclaration } from '../../types/gemini.types';

export const GEMINI_TOOLS_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: 'check_slots',
    description: 'Check available appointment slots at Habib\'s Salon Pune for a specific date, time, or service.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: {
          type: 'STRING',
          description: 'The requested date (e.g. "2026-07-28", "today", "tomorrow", or "kal").'
        },
        time: {
          type: 'STRING',
          description: 'The preferred time slot (e.g. "17:00", "5:00 PM", "5 baje").'
        },
        service: {
          type: 'STRING',
          description: 'The requested salon service (e.g. "Haircut", "Hair Spa", "Keratin").'
        }
      },
      required: ['date']
    }
  },
  {
    name: 'create_booking',
    description: 'Create and confirm a new salon appointment booking in the system after customer approval.',
    parameters: {
      type: 'OBJECT',
      properties: {
        customer_name: {
          type: 'STRING',
          description: 'Full name of the customer booking the appointment.'
        },
        phone: {
          type: 'STRING',
          description: 'Customer contact phone number.'
        },
        service: {
          type: 'STRING',
          description: 'The specific salon service selected.'
        },
        date: {
          type: 'STRING',
          description: 'Confirmed date of the appointment.'
        },
        time: {
          type: 'STRING',
          description: 'Confirmed time of the appointment.'
        },
        notes: {
          type: 'STRING',
          description: 'Optional special instructions or notes.'
        }
      },
      required: ['customer_name', 'service', 'date', 'time']
    }
  },
  {
    name: 'cancel_booking',
    description: 'Cancel an existing salon appointment for a customer.',
    parameters: {
      type: 'OBJECT',
      properties: {
        booking_id: {
          type: 'STRING',
          description: 'Optional unique booking ID.'
        },
        phone: {
          type: 'STRING',
          description: 'Customer phone number associated with booking.'
        },
        service: {
          type: 'STRING',
          description: 'Name of the service to cancel.'
        },
        date: {
          type: 'STRING',
          description: 'Date of the appointment to cancel.'
        }
      }
    }
  },
  {
    name: 'reschedule_booking',
    description: 'Reschedule an existing appointment to a new date and time.',
    parameters: {
      type: 'OBJECT',
      properties: {
        booking_id: {
          type: 'STRING',
          description: 'Optional unique booking ID.'
        },
        phone: {
          type: 'STRING',
          description: 'Customer phone number.'
        },
        new_date: {
          type: 'STRING',
          description: 'New desired appointment date.'
        },
        new_time: {
          type: 'STRING',
          description: 'New desired appointment time.'
        }
      },
      required: ['new_date', 'new_time']
    }
  },
  {
    name: 'get_services',
    description: 'Retrieve the complete list of available salon services and prices at Habib\'s Salon Pune.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  }
];

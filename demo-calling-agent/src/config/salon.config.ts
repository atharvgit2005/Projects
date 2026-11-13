import { BusinessProfile } from '../interfaces/salon.interface';

export const HABIB_SALON_PUNE_CONFIG: BusinessProfile = {
  id: 'habibs-salon-pune',
  name: "Habib's Hair & Beauty Salon Pune",
  location: 'Koregaon Park / NIBM Road, Pune',
  city: 'Pune',
  address: 'Shop 12, Ground Floor, Lane 7, Koregaon Park / NIBM Road, Pune, Maharashtra 411001',
  landmark: 'Opposite Westin Hotel & Starbucks, Koregaon Park',
  receptionistName: 'Shreya',
  openingTime: '10:00',
  closingTime: '20:00',
  slotIntervalMinutes: 60,
  contactPhone: '+919876543210',
  languagesSupported: ['Hindi', 'Hinglish', 'English'],
  paymentModes: ['UPI (GPay / PhonePe / Paytm)', 'Credit / Debit Cards', 'Cash'],
  amenities: ['Free Valet Parking', 'High-Speed Wi-Fi', 'Complimentary Tea & Espresso Bar', 'Air Conditioned Luxury Lounge'],
  cancellationPolicy: 'Free cancellation or rescheduling up to 2 hours prior to the appointment time.',
  
  // Available Barbers & Stylists
  barbers: [
    {
      id: 'barber_1',
      name: 'Vikram',
      role: 'Master Stylist',
      specialties: ['Keratin Treatment', 'Smoothening', 'Global Hair Colour', 'Celebrity Haircuts'],
      experienceYears: 10,
      isAvailableToday: true
    },
    {
      id: 'barber_2',
      name: 'Rahul',
      role: 'Senior Stylist',
      specialties: ['Fade Haircuts', 'Beard Sculpting & Styling', 'Hair Spa'],
      experienceYears: 7,
      isAvailableToday: true
    },
    {
      id: 'barber_3',
      name: 'Ananya',
      role: 'Beauty Specialist',
      specialties: ['Signature Facials', 'Gold Skin Cleanup', 'Head & Shoulder Massage'],
      experienceYears: 6,
      isAvailableToday: true
    },
    {
      id: 'barber_4',
      name: 'Amit',
      role: 'Junior Stylist',
      specialties: ['Classic Men Haircut', 'Hair Wash & Blow Dry'],
      experienceYears: 4,
      isAvailableToday: true
    }
  ],

  // Comprehensive Services & Temporary Pricing
  services: [
    { name: 'Haircut', durationMinutes: 45, priceINR: 500, category: 'Hair', description: 'Consultation, precision haircut, wash, and style.' },
    { name: 'Master Haircut (Vikram)', durationMinutes: 60, priceINR: 800, category: 'Hair', description: 'Premium haircut by Master Stylist Vikram with style consultation.' },
    { name: 'Hair Spa', durationMinutes: 60, priceINR: 1200, category: 'Hair', description: 'Deep nourishing scalp & hair conditioning massage.' },
    { name: 'L\'Oréal Hair Spa (Organic)', durationMinutes: 60, priceINR: 1800, category: 'Hair', description: 'Organic intensive repair hair spa with scalp steam.' },
    { name: 'Hair Colour (Global)', durationMinutes: 90, priceINR: 2500, category: 'Hair', description: 'Ammonia-free full global hair color.' },
    { name: 'Highlights & Balayage', durationMinutes: 120, priceINR: 3500, category: 'Hair', description: 'Custom streaks or balayage with toner.' },
    { name: 'Hair Wash & Blow Dry', durationMinutes: 30, priceINR: 300, category: 'Hair', description: 'Shampoo, conditioner, and professional blow dry.' },
    { name: 'Keratin Treatment', durationMinutes: 120, priceINR: 4500, category: 'Hair', description: 'Frizz-free smoothing keratin treatment lasting 3-4 months.' },
    { name: 'Smoothening / Straightening', durationMinutes: 120, priceINR: 4000, category: 'Hair', description: 'Permanent hair straightening treatment.' },
    { name: 'Signature Facial', durationMinutes: 60, priceINR: 1500, category: 'Skin', description: 'Deep cleansing, exfoliation, and glow facial.' },
    { name: 'Gold Skin Cleanup', durationMinutes: 45, priceINR: 800, category: 'Skin', description: 'Blackhead removal, de-tan pack, and skin hydrator.' },
    { name: 'Beard Styling & Sculpting', durationMinutes: 30, priceINR: 350, category: 'Grooming', description: 'Hot towel razor edge, beard trim, and oil massage.' },
    { name: 'Relaxing Head Massage', durationMinutes: 30, priceINR: 400, category: 'Wellness', description: 'Warm Argan/Coconut oil scalp massage.' }
  ]
};

export const currentSalonConfig = HABIB_SALON_PUNE_CONFIG;

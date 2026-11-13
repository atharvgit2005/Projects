export interface ServiceInfo {
  name: string;
  durationMinutes: number;
  priceINR: number;
  category: 'Hair' | 'Skin' | 'Grooming' | 'Wellness';
  description?: string;
}

export interface BarberInfo {
  id: string;
  name: string;
  role: 'Master Stylist' | 'Senior Stylist' | 'Beauty Specialist' | 'Junior Stylist';
  specialties: string[];
  experienceYears: number;
  isAvailableToday: boolean;
}

export interface BusinessProfile {
  id: string;
  name: string;
  location: string;
  city: string;
  address: string;
  landmark: string;
  receptionistName: string;
  openingTime: string; // e.g. "10:00"
  closingTime: string; // e.g. "20:00"
  slotIntervalMinutes: number; // e.g. 60
  services: ServiceInfo[];
  barbers: BarberInfo[];
  languagesSupported: string[]; // ['Hindi', 'Hinglish', 'English']
  contactPhone: string;
  paymentModes: string[];
  amenities: string[];
  cancellationPolicy: string;
}

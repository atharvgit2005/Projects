-- =====================================================================
-- SUPABASE POSTGRESQL DATABASE SCHEMA FOR AI VOICE RECEPTIONIST PLATFORM
-- Habib's Salon Pune (Priya AI Receptionist)
-- =====================================================================

-- 1. Create Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id VARCHAR(100) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    service VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON public.appointments(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 3. Automatic Updated_At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- 4. Enable Row Level Security (RLS) & Set Permissive Policies for Backend API
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to appointments" 
ON public.appointments FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to appointments" 
ON public.appointments FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to appointments" 
ON public.appointments FOR UPDATE USING (true);

-- 5. Seed Initial Sample Data for Habib's Salon Pune
INSERT INTO public.appointments (id, customer_name, phone, service, date, time, status, notes)
VALUES 
    ('apt_101', 'Rahul Sharma', '+919876543210', 'Haircut', CURRENT_DATE, '17:00', 'confirmed', 'Prefers senior stylist'),
    ('apt_102', 'Ananya Deshpande', '+919123456789', 'Hair Spa', CURRENT_DATE + INTERVAL '1 day', '14:00', 'confirmed', 'Booked via Priya AI'),
    ('apt_103', 'Vikram Singh', '+919000011111', 'Keratin', CURRENT_DATE + INTERVAL '2 days', '11:30', 'confirmed', 'WhatsApp confirmation sent')
ON CONFLICT (id) DO NOTHING;

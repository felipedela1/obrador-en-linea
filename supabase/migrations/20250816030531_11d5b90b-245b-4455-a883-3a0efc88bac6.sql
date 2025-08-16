-- Create enum types
CREATE TYPE public.user_role AS ENUM ('guest', 'customer', 'admin');
CREATE TYPE public.product_category AS ENUM ('PANES', 'BOLLERIA', 'TARTAS', 'ESPECIALES');
CREATE TYPE public.reservation_status AS ENUM ('PENDIENTE', 'PREPARADO', 'RETIRADO', 'CANCELADO');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  categoria product_category NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  etiquetas TEXT[] DEFAULT '{}',
  imagen_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_stock table for inventory management
CREATE TABLE public.daily_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  cantidad_disponible INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, fecha)
);

-- Create reservations table
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_recogida DATE NOT NULL,
  franja_horaria TEXT NOT NULL,
  estado reservation_status NOT NULL DEFAULT 'PENDIENTE',
  notas TEXT,
  codigo TEXT NOT NULL UNIQUE,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reservation_items table
CREATE TABLE public.reservation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for products (public read, admin write)
CREATE POLICY "Products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (activo = true OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- RLS Policies for daily_stock (public read, admin write)
CREATE POLICY "Stock is viewable by everyone" 
ON public.daily_stock 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage stock" 
ON public.daily_stock 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- RLS Policies for reservations
CREATE POLICY "Users can view their own reservations" 
ON public.reservations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reservations" 
ON public.reservations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations" 
ON public.reservations 
FOR UPDATE 
USING (auth.uid() = user_id AND estado = 'PENDIENTE');

CREATE POLICY "Admins can view all reservations"
ON public.reservations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for reservation_items
CREATE POLICY "Users can view their own reservation items" 
ON public.reservation_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.reservations 
  WHERE id = reservation_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create their own reservation items" 
ON public.reservation_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.reservations 
  WHERE id = reservation_id AND user_id = auth.uid()
));

CREATE POLICY "Admins can view all reservation items"
ON public.reservation_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_stock_updated_at
  BEFORE UPDATE ON public.daily_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nombre, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.email), 
    'customer'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate reservation codes
CREATE OR REPLACE FUNCTION public.generate_reservation_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    code := 'OE' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
    SELECT EXISTS(SELECT 1 FROM public.reservations WHERE codigo = code) INTO exists_code;
    IF NOT exists_code THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- Insert seed data for products
INSERT INTO public.products (nombre, slug, categoria, descripcion, precio, etiquetas, activo) VALUES
('Croissant Tradicional', 'croissant-tradicional', 'BOLLERIA', 'Laminado perfecto con mantequilla francesa', 2.50, ARRAY['Recién horneado'], true),
('Pain au Chocolat', 'pain-au-chocolat', 'BOLLERIA', 'Croissant relleno de chocolate belga', 3.00, ARRAY['Chocolate', 'Recién horneado'], true),
('Pan de Masa Madre', 'pan-masa-madre', 'PANES', 'Fermentación natural de 24 horas', 4.80, ARRAY['Masa madre', 'Ecológico'], true),
('Baguette Francesa', 'baguette-francesa', 'PANES', 'Corteza crujiente, miga alveolada', 3.20, ARRAY['Tradicional'], true),
('Pan Integral', 'pan-integral', 'PANES', 'Pan 100% integral con semillas', 4.20, ARRAY['Integral', 'Semillas'], true),
('Tarta de Queso', 'tarta-queso', 'TARTAS', 'Queso cremoso con frutos rojos', 18.00, ARRAY['Hecho a medida'], true),
('Tarta de Chocolate', 'tarta-chocolate', 'TARTAS', 'Chocolate negro 70% con ganache', 22.00, ARRAY['Sin gluten disponible'], true),
('Roscón de Reyes', 'roscon-reyes', 'ESPECIALES', 'Tradicional roscón con nata', 28.00, ARRAY['Temporada'], true);

-- Insert sample daily stock for today and tomorrow
INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
SELECT 
  p.id,
  CURRENT_DATE,
  CASE 
    WHEN p.categoria = 'PANES' THEN 20
    WHEN p.categoria = 'BOLLERIA' THEN 15
    WHEN p.categoria = 'TARTAS' THEN 3
    ELSE 5
  END
FROM public.products p;

INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
SELECT 
  p.id,
  CURRENT_DATE + INTERVAL '1 day',
  CASE 
    WHEN p.categoria = 'PANES' THEN 25
    WHEN p.categoria = 'BOLLERIA' THEN 18
    WHEN p.categoria = 'TARTAS' THEN 4
    ELSE 6
  END
FROM public.products p;

-- Create admin user (will be created via trigger when auth user is created)
-- The admin user needs to be created through the auth system
-- =============================================
-- feedme.gg Database Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS (customers)
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'email', -- email, google, apple
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete for GDPR
);

-- User addresses
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  street TEXT NOT NULL,
  parish TEXT NOT NULL,
  postcode TEXT NOT NULL,
  what3words TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User favourites
CREATE TABLE user_favourites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);

-- =============================================
-- MERCHANTS
-- =============================================
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, -- owner name
  password_hash TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  commission_rate DECIMAL(4,2) DEFAULT 4.00,
  is_trial BOOLEAN DEFAULT true,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  agreement_signed_at TIMESTAMPTZ,
  agreement_version TEXT,
  sumup_api_key TEXT, -- encrypted
  sumup_merchant_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RESTAURANTS (a merchant can have multiple)
-- =============================================
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🍽️',
  cuisine_type TEXT,
  parish TEXT,
  address TEXT,
  postcode TEXT,
  phone TEXT,
  logo_url TEXT,
  cover_url TEXT,
  custom_message TEXT DEFAULT 'Thank you for your order!',
  is_open BOOLEAN DEFAULT false,
  is_busy BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  min_order DECIMAL(8,2) DEFAULT 10.00,
  max_order DECIMAL(8,2) DEFAULT 150.00,
  delivery_time_mins INTEGER DEFAULT 25,
  pickup_time_mins INTEGER DEFAULT 15,
  accepts_delivery BOOLEAN DEFAULT true,
  accepts_pickup BOOLEAN DEFAULT true,
  accepts_preorders BOOLEAN DEFAULT true,
  slot_capacity INTEGER DEFAULT 5, -- max orders per 30 min slot
  foodgg_url TEXT,
  foodgg_sync_enabled BOOLEAN DEFAULT false,
  foodgg_last_sync TIMESTAMPTZ,
  vat_enabled BOOLEAN DEFAULT false,
  vat_rate DECIMAL(4,2) DEFAULT 0.00,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant photos
CREATE TABLE restaurant_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant delivery zones
CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  postcodes TEXT[] NOT NULL, -- array of postcodes e.g. ['GY1', 'GY2']
  fee DECIMAL(8,2) DEFAULT 2.99,
  min_order DECIMAL(8,2) DEFAULT 10.00,
  free_delivery_over DECIMAL(8,2), -- null means no free delivery threshold
  is_active BOOLEAN DEFAULT true
);

-- Restaurant opening hours
CREATE TABLE opening_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Mon, 6=Sun
  opens_at TIME,
  closes_at TIME,
  is_closed BOOLEAN DEFAULT false
);

-- Opening hour overrides (day off, early close etc)
CREATE TABLE opening_hour_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  opens_at TIME,
  closes_at TIME,
  is_closed BOOLEAN DEFAULT false,
  reason TEXT
);

-- =============================================
-- MENU
-- =============================================
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  available_from TIME, -- null = always available
  available_until TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(8,2) NOT NULL,
  emoji TEXT DEFAULT '🍽️',
  image_url TEXT,
  image_source TEXT, -- 'upload', 'unsplash', 'pexels', 'ai', 'none'
  is_available BOOLEAN DEFAULT true,
  calories INTEGER, -- AI estimated
  calories_verified BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}', -- ['veg', 'vegan', 'gf', 'spicy', 'nuts']
  allergens TEXT[] DEFAULT '{}', -- AI detected
  allergens_verified BOOLEAN DEFAULT false,
  available_from TIME,
  available_until TIME,
  foodgg_id TEXT, -- for sync tracking
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu item modifiers
CREATE TABLE modifier_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Choose your size"
  is_required BOOLEAN DEFAULT false,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE modifier_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Large (12\")"
  price_adjustment DECIMAL(8,2) DEFAULT 0.00,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- =============================================
-- PROMOTIONS
-- =============================================
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL, -- 'percentage', 'fixed', 'free_delivery', 'first_order'
  value DECIMAL(8,2) DEFAULT 0.00,
  min_order DECIMAL(8,2) DEFAULT 0.00,
  max_uses INTEGER, -- null = unlimited
  uses_count INTEGER DEFAULT 0,
  is_first_order_only BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, code)
);

-- =============================================
-- TIME SLOTS
-- =============================================
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  capacity INTEGER NOT NULL,
  booked INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false
);

-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL, -- FMG-2026-0001
  restaurant_id UUID REFERENCES restaurants(id),
  merchant_id UUID REFERENCES merchants(id),
  user_id UUID REFERENCES users(id), -- null for guests
  -- Customer details
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  -- Delivery
  order_type TEXT NOT NULL, -- 'delivery', 'pickup'
  delivery_address TEXT,
  delivery_parish TEXT,
  delivery_postcode TEXT,
  delivery_what3words TEXT,
  delivery_notes TEXT,
  -- Time slot
  slot_id UUID REFERENCES time_slots(id),
  scheduled_for TIMESTAMPTZ,
  -- Payment
  payment_method TEXT NOT NULL, -- 'card', 'cash', 'paypal'
  subtotal DECIMAL(8,2) NOT NULL,
  delivery_fee DECIMAL(8,2) DEFAULT 0.00,
  tip DECIMAL(8,2) DEFAULT 0.00,
  discount DECIMAL(8,2) DEFAULT 0.00,
  total DECIMAL(8,2) NOT NULL,
  commission_amount DECIMAL(8,2) DEFAULT 0.00,
  commission_rate DECIMAL(4,2) DEFAULT 4.00,
  -- Promo
  promo_code TEXT,
  promo_id UUID REFERENCES promotions(id),
  -- SumUp
  sumup_payment_id TEXT,
  sumup_checkout_id TEXT,
  sumup_link TEXT,
  payment_link_sent_at TIMESTAMPTZ,
  payment_link_expires_at TIMESTAMPTZ,
  payment_retries INTEGER DEFAULT 0,
  paid_at TIMESTAMPTZ,
  -- Status
  status TEXT DEFAULT 'pending', -- pending, accepted, waiting_payment, paid, complete, cancelled
  rejection_reason TEXT,
  estimated_wait_mins INTEGER,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  -- Merchant notes
  merchant_note TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  name TEXT NOT NULL, -- snapshot at time of order
  price DECIMAL(8,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  special_instructions TEXT,
  modifiers JSONB DEFAULT '[]', -- [{name, price_adjustment}]
  subtotal DECIMAL(8,2) NOT NULL
);

-- =============================================
-- REFUNDS
-- =============================================
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(8,2) NOT NULL,
  reason TEXT,
  sumup_refund_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  initiated_by TEXT, -- 'merchant', 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- COMMISSION INVOICES
-- =============================================
CREATE TABLE commission_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  card_orders INTEGER DEFAULT 0,
  food_subtotal DECIMAL(10,2) DEFAULT 0.00,
  commission_rate DECIMAL(4,2) DEFAULT 4.00,
  commission_amount DECIMAL(10,2) DEFAULT 0.00,
  status TEXT DEFAULT 'unpaid', -- unpaid, paid, waived, trial
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ANNOUNCEMENTS
-- =============================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'info', 'urgent', 'maintenance'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target TEXT DEFAULT 'all', -- 'all' or merchant_id
  is_active BOOLEAN DEFAULT true,
  requires_acknowledgement BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE announcement_acknowledgements (
  announcement_id UUID REFERENCES announcements(id),
  merchant_id UUID REFERENCES merchants(id),
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (announcement_id, merchant_id)
);

-- =============================================
-- ORDER HISTORY ARCHIVES
-- =============================================
CREATE TABLE eod_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id),
  report_date DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  card_revenue DECIMAL(10,2) DEFAULT 0.00,
  cash_revenue DECIMAL(10,2) DEFAULT 0.00,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  avg_order_value DECIMAL(8,2) DEFAULT 0.00,
  tips_collected DECIMAL(8,2) DEFAULT 0.00,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Restaurants are publicly readable
CREATE POLICY "Restaurants are public" ON restaurants
  FOR SELECT USING (is_active = true);

-- Menu items are publicly readable
CREATE POLICY "Menu items are public" ON menu_items
  FOR SELECT USING (is_available = true);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_restaurants_merchant ON restaurants(merchant_id);
CREATE INDEX idx_time_slots_restaurant_date ON time_slots(restaurant_id, slot_date);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'FMG-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE order_number_seq START 1;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

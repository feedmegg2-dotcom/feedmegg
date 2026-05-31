-- =============================================
-- feedme.gg Seed Data (Fixed UUIDs)
-- =============================================

-- Insert sample merchants
INSERT INTO merchants (id, email, name, phone, commission_rate, is_trial, agreement_signed_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'pizza@feedme.gg', 'Mario Rossi', '+44 1481 000001', 4.00, false, NOW()),
  ('22222222-2222-2222-2222-222222222222', 'burger@feedme.gg', 'John Smith', '+44 1481 000002', 4.00, false, NOW()),
  ('33333333-3333-3333-3333-333333333333', 'sushi@feedme.gg', 'Kenji Tanaka', '+44 1481 000003', 4.00, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample restaurants
INSERT INTO restaurants (id, merchant_id, name, slug, description, emoji, cuisine_type, parish, postcode, min_order, max_order, accepts_delivery, accepts_pickup, delivery_time_mins, pickup_time_mins, is_open)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Pizza Palace', 'pizza-palace', 'Best pizza in Guernsey, freshly made to order.', '🍕', 'Italian · Pizza', 'St Peter Port', 'GY1', 10.00, 150.00, true, true, 25, 15, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Burger House', 'burger-house', 'Smashed burgers and loaded sides.', '🍔', 'American · Burgers', 'St Sampson', 'GY2', 8.00, 120.00, true, true, 20, 10, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Sushi Zen', 'sushi-zen', 'Premium fresh sushi made daily.', '🍣', 'Japanese · Sushi', 'St Peter Port', 'GY1', 15.00, 200.00, true, true, 35, 20, true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Spice Garden', 'spice-garden', 'Authentic Indian cuisine from family recipes.', '🍛', 'Indian · Curry', 'Vale', 'GY3', 12.00, 180.00, true, true, 30, 20, true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'Dragon Wok', 'dragon-wok', 'Fresh Chinese food cooked to order.', '🥡', 'Chinese · Noodles', 'St Sampson', 'GY2', 10.00, 130.00, true, true, 25, 15, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'Taco Loco', 'taco-loco', 'Authentic Mexican street food.', '🌮', 'Mexican · Street Food', 'Castel', 'GY4', 8.00, 100.00, true, true, 20, 10, true)
ON CONFLICT (id) DO NOTHING;

-- Delivery zones for Pizza Palace
INSERT INTO delivery_zones (restaurant_id, name, postcodes, fee, min_order)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'St Peter Port', ARRAY['GY1'], 1.99, 10.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'St Sampson', ARRAY['GY2'], 2.49, 12.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vale', ARRAY['GY3'], 2.99, 15.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Castel & West', ARRAY['GY4', 'GY5'], 2.99, 15.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'South Parishes', ARRAY['GY6', 'GY7', 'GY8'], 3.49, 18.00);

-- Opening hours for Pizza Palace (Mon-Sun)
INSERT INTO opening_hours (restaurant_id, day_of_week, opens_at, closes_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0, '11:00', '23:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, '11:00', '23:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, '11:00', '23:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, '11:00', '23:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, '11:00', '23:30'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, '11:00', '23:30'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 6, '12:00', '22:00');

-- Menu categories for Pizza Palace
INSERT INTO menu_categories (id, restaurant_id, name, sort_order)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Classic Pizzas', 1),
  ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sides', 2),
  ('a3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Drinks', 3);

-- Menu categories for Burger House
INSERT INTO menu_categories (id, restaurant_id, name, sort_order)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Burgers', 1),
  ('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sides', 2),
  ('b3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Drinks', 3);

-- Menu categories for Sushi Zen
INSERT INTO menu_categories (id, restaurant_id, name, sort_order)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rolls (8pcs)', 1),
  ('c2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Nigiri', 2);

-- Pizza Palace menu items
INSERT INTO menu_items (category_id, restaurant_id, name, description, price, emoji, tags, allergens, calories)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Margherita', 'Tomato, mozzarella, fresh basil', 11.99, '🍕', ARRAY['veg'], ARRAY['gluten', 'dairy'], 820),
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pepperoni Feast', 'Double pepperoni, mozzarella, tomato', 13.99, '🍕', ARRAY[]::text[], ARRAY['gluten', 'dairy'], 1050),
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BBQ Chicken', 'BBQ sauce, grilled chicken, red onion', 14.99, '🍕', ARRAY[]::text[], ARRAY['gluten', 'dairy'], 920),
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Veggie Supreme', 'Peppers, mushrooms, olives, spinach', 12.99, '🍕', ARRAY['veg', 'vegan'], ARRAY['gluten'], 760),
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Spicy Diavola', 'Spicy salami, chillies, mozzarella', 14.49, '🍕', ARRAY['spicy'], ARRAY['gluten', 'dairy'], 990),
  ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Garlic Bread', 'Toasted ciabatta with garlic butter', 3.99, '🥖', ARRAY['veg'], ARRAY['gluten', 'dairy'], 320),
  ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chicken Wings (6)', 'Crispy wings with dipping sauce', 6.99, '🍗', ARRAY['spicy'], ARRAY[]::text[], 480),
  ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Coleslaw', 'Homemade creamy coleslaw', 2.49, '🥗', ARRAY['veg', 'gf'], ARRAY['dairy', 'eggs'], 180),
  ('a3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Coca Cola', '330ml can', 1.99, '🥤', ARRAY[]::text[], ARRAY[]::text[], 139),
  ('a3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Still Water', '500ml bottle', 1.49, '💧', ARRAY['veg', 'vegan', 'gf'], ARRAY[]::text[], 0);

-- Burger House menu items
INSERT INTO menu_items (category_id, restaurant_id, name, description, price, emoji, tags, allergens, calories)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Classic Cheeseburger', 'Beef patty, cheddar, lettuce, tomato', 9.99, '🍔', ARRAY[]::text[], ARRAY['gluten', 'dairy', 'eggs'], 750),
  ('b1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Double Smash Burger', 'Two smashed patties, special sauce', 13.99, '🍔', ARRAY[]::text[], ARRAY['gluten', 'dairy'], 1100),
  ('b1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Crispy Chicken Burger', 'Fried chicken, slaw, sriracha mayo', 11.99, '🍗', ARRAY['spicy'], ARRAY['gluten', 'dairy'], 820),
  ('b1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Veggie Burger', 'Plant-based patty, avocado, lettuce', 10.99, '🌱', ARRAY['veg', 'vegan'], ARRAY['gluten'], 680),
  ('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Loaded Fries', 'Fries with cheese sauce and bacon', 5.99, '🍟', ARRAY[]::text[], ARRAY['gluten', 'dairy'], 650),
  ('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Onion Rings (8)', 'Beer-battered crispy rings', 4.49, '🧅', ARRAY['veg'], ARRAY['gluten'], 420);

-- Sushi Zen menu items
INSERT INTO menu_items (category_id, restaurant_id, name, description, price, emoji, tags, allergens, calories)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'California Roll', 'Crab, avocado, cucumber, sesame', 9.99, '🍱', ARRAY['gf'], ARRAY['shellfish', 'sesame'], 290),
  ('c1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Spicy Tuna Roll', 'Fresh tuna, spicy mayo, cucumber', 12.99, '🍣', ARRAY['spicy', 'gf'], ARRAY['fish'], 340),
  ('c1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Dragon Roll', 'Prawn tempura, avocado, eel sauce', 14.99, '🍣', ARRAY[]::text[], ARRAY['shellfish', 'gluten', 'fish'], 420),
  ('c2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Salmon Nigiri (2pcs)', 'Fresh Atlantic salmon over rice', 5.99, '🍣', ARRAY['gf'], ARRAY['fish'], 160),
  ('c2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mixed Platter (12pcs)', 'Chef''s premium selection', 19.99, '🍱', ARRAY['gf'], ARRAY['fish', 'shellfish'], 580);

-- Promotions
INSERT INTO promotions (restaurant_id, code, type, value, min_order, is_first_order_only, is_active)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'WELCOME', 'free_delivery', 0, 0, true, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PIZZA10', 'percentage', 10, 20, false, true);

-- Platform announcement
INSERT INTO announcements (type, title, message, target)
VALUES
  ('info', 'Welcome to feedme.gg!', 'Your restaurant is now live on feedme.gg. Complete your menu setup to start receiving orders.', 'all');

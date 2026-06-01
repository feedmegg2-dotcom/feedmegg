-- Allow public to read menu categories
CREATE POLICY "Menu categories are public" ON menu_categories
  FOR SELECT USING (is_active = true);

-- Allow public to read delivery zones
CREATE POLICY "Delivery zones are public" ON delivery_zones
  FOR SELECT USING (is_active = true);

-- Allow public to read opening hours
CREATE POLICY "Opening hours are public" ON opening_hours
  FOR SELECT USING (true);

-- Allow public to read modifier groups
CREATE POLICY "Modifier groups are public" ON modifier_groups
  FOR SELECT USING (true);

-- Allow public to read modifier options
CREATE POLICY "Modifier options are public" ON modifier_options
  FOR SELECT USING (true);

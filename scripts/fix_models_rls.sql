CREATE POLICY "Admin can insert models" ON models FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin can update models" ON models FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can delete models" ON models FOR DELETE USING (auth.role() = 'authenticated');

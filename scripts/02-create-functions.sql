-- Funkce pro získání statistik uživatelů (pouze pro adminy)
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  total_activities BIGINT,
  total_duration BIGINT,
  avg_duration NUMERIC,
  last_activity TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Kontrola, zda je uživatel admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    up.id as user_id,
    up.full_name as user_name,
    up.email as user_email,
    COUNT(a.id) as total_activities,
    COALESCE(SUM(a.duration), 0) as total_duration,
    COALESCE(AVG(a.duration), 0) as avg_duration,
    MAX(a.start_time) as last_activity
  FROM user_profiles up
  LEFT JOIN activities a ON up.id = a.user_id
  WHERE up.role = 'user'
  GROUP BY up.id, up.full_name, up.email
  ORDER BY up.full_name, up.email;
END;
$$;

-- Trigger pro automatické aktualizace updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at 
  BEFORE UPDATE ON activities 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vytvoření základních uživatelů
-- Použijeme ON CONFLICT (name) DO UPDATE pro idempotentní vkládání
INSERT INTO users (name, role) VALUES 
  ('Jan Novák', 'user'),
  ('Marie Svobodová', 'user'),
  ('Petr Dvořák', 'admin'),
  ('Anna Procházková', 'user')
ON CONFLICT (name) DO UPDATE SET 
  role = EXCLUDED.role, 
  updated_at = NOW();

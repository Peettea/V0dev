-- Vytvoření admin uživatele
-- Nahraďte 'admin@example.com' skutečným emailem admin uživatele

UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';

-- Nebo můžete vytvořit nový admin účet přímo:
-- INSERT INTO user_profiles (email, name, role)
-- VALUES ('admin@example.com', 'Admin User', 'admin')
-- ON CONFLICT (email) DO UPDATE SET role = 'admin';

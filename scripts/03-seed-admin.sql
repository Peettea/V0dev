-- Vytvoření admin uživatele (spustit po registraci prvního uživatele)
-- Nahraďte 'admin@example.com' skutečným emailem admin uživatele

UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';

-- Nebo pokud znáte UUID uživatele:
-- UPDATE user_profiles 
-- SET role = 'admin' 
-- WHERE id = 'uuid-admin-uzivatele';

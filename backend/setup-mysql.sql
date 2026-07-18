-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS vyaparvistar;

-- Create user if it doesn't exist (you may need to adjust this based on your MySQL setup)
-- Uncomment and modify the following lines if you want to create a dedicated user
-- CREATE USER IF NOT EXISTS 'vyapar_user'@'localhost' IDENTIFIED BY 'your_password';
-- GRANT ALL PRIVILEGES ON vyaparvistar.* TO 'vyapar_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Use the database
USE vyaparvistar;

-- Show the database has been created
SELECT 'Database vyaparvistar created successfully' as status;

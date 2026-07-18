const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  try {
    // Connect to MySQL without specifying database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: 'root',
      password: '' // Try with empty password first
    });

    console.log('Connected to MySQL server');

    // Create database
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'vyaparvistar'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Database ${process.env.DB_NAME || 'vyaparvistar'} created successfully`);

    // Create user if it doesn't exist (optional)
    try {
      await connection.execute(`CREATE USER IF NOT EXISTS '${process.env.DB_USER}'@'localhost' IDENTIFIED BY '${process.env.DB_PASSWORD}'`);
      await connection.execute(`GRANT ALL PRIVILEGES ON ${process.env.DB_NAME || 'vyaparvistar'}.* TO '${process.env.DB_USER}'@'localhost'`);
      await connection.execute(`FLUSH PRIVILEGES`);
      console.log(`User ${process.env.DB_USER} created and granted privileges`);
    } catch (error) {
      console.log('User creation skipped (may already exist or insufficient privileges)');
    }

    await connection.end();
    console.log('Database setup completed!');
  } catch (error) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n=== MySQL Authentication Failed ===');
      console.log('Please run these commands manually in MySQL:');
      console.log(`1. mysql -u root -p`);
      console.log(`2. CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'vyaparvistar'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      console.log(`3. CREATE USER IF NOT EXISTS '${process.env.DB_USER}'@'localhost' IDENTIFIED BY '${process.env.DB_PASSWORD}';`);
      console.log(`4. GRANT ALL PRIVILEGES ON ${process.env.DB_NAME || 'vyaparvistar'}.* TO '${process.env.DB_USER}'@'localhost';`);
      console.log('5. FLUSH PRIVILEGES;');
      console.log('6. EXIT;');
    } else {
      console.error('Database setup error:', error.message);
    }
  }
}

createDatabase();

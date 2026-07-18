const mysql = require('mysql2/promise');

async function dropTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'rootroot',
      database: 'vyaparvistar'
    });

    console.log('Connected to MySQL');

    // Drop tables in correct order to avoid foreign key constraints
    const tables = ['transactions', 'products', 'customers', 'users', 'shops'];
    
    for (const table of tables) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`Dropped table: ${table}`);
      } catch (error) {
        console.log(`Error dropping ${table}:`, error.message);
      }
    }

    await connection.end();
    console.log('All tables dropped successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropTables();

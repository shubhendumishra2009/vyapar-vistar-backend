const { sequelize } = require('./config/database');

async function checkUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');
    
    // Check all users
    const [users] = await sequelize.query('SELECT id, username, email, name, type, isActive, createdAt, updatedAt FROM users');
    console.log(`\n📋 Total users in DB: ${users.length}`);
    users.forEach(u => {
      console.log(`  - ${u.username} (${u.email}) [${u.type}] active:${u.isActive} created:${u.createdAt}`);
    });
    
    // Check specifically for shubhu
    const [found] = await sequelize.query(
      'SELECT id, username, email, name, type, isActive FROM users WHERE username = ? OR email = ?',
      { replacements: ['shubhu', 'shubhumishra1984@gmail.com'] }
    );
    console.log(`\n🔍 Search for 'shubhu': ${found.length > 0 ? 'FOUND' : 'NOT FOUND'}`);
    if (found.length > 0) {
      console.log(JSON.stringify(found, null, 2));
    }
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

checkUser();
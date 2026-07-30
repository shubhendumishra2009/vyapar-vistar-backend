const axios = require('axios');

async function testRegister() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      username: 'testuser' + Math.floor(Math.random() * 100000),
      email: 'test' + Math.floor(Math.random() * 100000) + '@test.com',
      password: 'password123',
      name: 'Test User',
      phone: '9876543210',
      type: 'admin'
    });
    console.log('SUCCESS:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('ERROR STATUS:', error.response?.status);
    console.log('ERROR DATA:', JSON.stringify(error.response?.data, null, 2));
    if (error.response?.data?.message) {
      console.log('ERROR MESSAGE:', error.response.data.message);
    }
  }
}

testRegister();
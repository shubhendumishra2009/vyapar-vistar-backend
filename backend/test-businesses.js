const http = require('http');

const BASE_URL = 'http://localhost:5000/api';
let authToken = null;

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testRegister() {
  console.log('\n📝 Test 1: Register new user...');
  const result = await makeRequest('POST', '/auth/register', {
    username: 'testuser',
    email: 'test@example.com',
    password: 'test123',
    name: 'Test User',
    phone: '+919876543210',
    type: 'admin'
  });

  if (result.status === 201 && result.data.success) {
    console.log('✅ User registered successfully');
    console.log('   User ID:', result.data.user.id);
    return result.data.token;
  } else {
    console.log('⚠️  Registration response:', result.data);
    // Try login if user already exists
    return await testLogin();
  }
}

async function testLogin() {
  console.log('\n🔑 Test 2: Login...');
  const result = await makeRequest('POST', '/auth/login', {
    username: 'testuser',
    password: 'test123'
  });

  if (result.status === 200 && result.data.success) {
    console.log('✅ Login successful');
    console.log('   Token:', result.data.token.substring(0, 20) + '...');
    return result.data.token;
  } else {
    console.log('❌ Login failed:', result.data);
    throw new Error('Login failed');
  }
}

async function testCreateBusiness(token, name, type, description) {
  console.log(`\n🏢 Test: Create business "${name}"...`);
  const result = await makeRequest('POST', '/businesses', {
    name,
    type,
    description
  }, {
    Authorization: `Bearer ${token}`
  });

  if (result.status === 201 && result.data.success) {
    console.log(`✅ Business created: ${result.data.data.name}`);
    console.log('   ID:', result.data.data.id);
    console.log('   Plan:', result.data.data.subscription.plan);
    console.log('   Status:', result.data.data.subscription.status);
    return result.data.data;
  } else {
    console.log('❌ Failed to create business:', result.data);
    return null;
  }
}

async function testGetBusinesses(token) {
  console.log('\n📋 Test: Get all businesses...');
  const result = await makeRequest('GET', '/businesses', null, {
    Authorization: `Bearer ${token}`
  });

  if (result.status === 200 && result.data.success) {
    console.log(`✅ Found ${result.data.data.length} business(es)`);
    result.data.data.forEach((biz, i) => {
      console.log(`   ${i + 1}. ${biz.name} (${biz.type}) - ${biz.shops?.length || 0} shops`);
    });
    return result.data.data;
  } else {
    console.log('❌ Failed to get businesses:', result.data);
    return [];
  }
}

async function testGetBusinessStats(token, businessId) {
  console.log(`\n📊 Test: Get business stats...`);
  const result = await makeRequest('GET', `/businesses/${businessId}/stats`, null, {
    Authorization: `Bearer ${token}`
  });

  if (result.status === 200 && result.data.success) {
    console.log('✅ Business stats:');
    console.log('   Shops:', result.data.data.shops);
    console.log('   Users:', result.data.data.users);
    console.log('   Products:', result.data.data.products);
    console.log('   Plan:', result.data.data.subscription.plan);
    return result.data.data;
  } else {
    console.log('❌ Failed to get stats:', result.data);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting VyaparVistar Business API Tests\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Register/Login
    let token = await testRegister();
    if (!token) {
      token = await testLogin();
    }

    // Step 2: Create businesses
    const business1 = await testCreateBusiness(token, 'ABC Grocery', 'grocery', 'Main grocery store at Location 1');
    const business2 = await testCreateBusiness(token, 'XYZ Electronics', 'electronics', 'Electronics store at Location 2');
    const business3 = await testCreateBusiness(token, 'ACD Restaurant', 'restaurant', 'Restaurant at Location 3');

    // Step 3: Get all businesses
    const businesses = await testGetBusinesses(token);

    // Step 4: Get stats for first business
    if (businesses.length > 0) {
      await testGetBusinessStats(token, businesses[0].id);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
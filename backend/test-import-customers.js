const http = require('http');
const fs = require('fs');
const path = require('path');

// Read the test customers JSON file
const customersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-20-customers.json'), 'utf-8'));

// Create multipart form data for file upload
const boundary = '----FormBoundary' + Date.now();
let body = '';

// Add the JSON file
body += `--${boundary}\r\n`;
body += `Content-Disposition: form-data; name="file"; filename="test-20-customers.json"\r\n`;
body += `Content-Type: application/json\r\n\r\n`;
body += JSON.stringify(customersData);
body += `\r\n`;

body += `--${boundary}--\r\n`;

// Make the API request
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/customers/business/13a4cdc9-88a0-4951-894a-eca909cb0009/import',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(body);
req.end();
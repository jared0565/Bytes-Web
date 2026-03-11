import http from 'http';

const data = JSON.stringify({
  clientId: "agency_demo",
  name: "Webhook Tester",
  email: "testwebhook@example.com",
  service: "Webhook Logic Verification",
  budget: "$50,000"
});

const options = {
  hostname: '127.0.0.1',
  port: 8787,
  path: '/api/test-lead',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-key': 'DEV_BYPASS',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let chunks = '';
  res.on('data', d => chunks += d);
  res.on('end', () => console.log('Response:', chunks));
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(data);
req.end();

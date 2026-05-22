const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/bug-reports',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'authToken=test_token_value_here'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(JSON.stringify({
  title: 'Test',
  description: 'Test',
  severity: 'low'
}));
req.end();

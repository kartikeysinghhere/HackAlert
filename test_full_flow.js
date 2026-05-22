const http = require('http');

const reqOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(reqOptions, (res) => {
  console.log(`LOGIN STATUS: ${res.statusCode}`);
  const cookies = res.headers['set-cookie'];
  console.log('LOGIN Set-Cookie:', cookies);
  
  if (cookies) {
    const authToken = cookies[0].split(';')[0];
    console.log('Extracted Cookie:', authToken);
    
    // Now make the bug report request
    const bugReqOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/bug-reports',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authToken
      }
    };
    
    const bugReq = http.request(bugReqOptions, (bugRes) => {
      console.log(`BUG REPORT STATUS: ${bugRes.statusCode}`);
      bugRes.setEncoding('utf8');
      bugRes.on('data', (chunk) => {
        console.log(`BUG REPORT BODY: ${chunk}`);
      });
    });
    
    bugReq.write(JSON.stringify({
      title: 'Test',
      description: 'Test',
      severity: 'low'
    }));
    bugReq.end();
  }
});

req.write(JSON.stringify({
  email: 'test@example.com',
  pass: 'password123'
}));
req.end();

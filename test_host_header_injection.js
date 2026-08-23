const { spawn } = require('child_process');
const http = require('http');

async function runTests() {
  console.log(' Starting Security Regression Test Suite...\n');

  // --- TEST CASE 1: Fail in production when PUBLIC_APP_URL is missing ---
  await new Promise((resolve, reject) => {
    console.log('  [Test 1] Verifying server fails startup in production if PUBLIC_APP_URL is missing...');
    const child = spawn('node', ['server.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PUBLIC_APP_URL: '', // Missing URL
        PORT: '3099'
      }
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);

    child.on('close', (code) => {
      console.log(`   - Exit code: ${code} (expected: 1)`);
      const output = stdout + '\n' + stderr;
      const containsError = output.includes('PUBLIC_APP_URL');
      if (code === 1 && containsError) {
        console.log('    Test 1 Passed: Server blocked startup and logged the correct error.\n');
        resolve();
      } else {
        console.error(`    Test 1 Failed: Exit code=${code}, output: ${output}`);
        reject(new Error('Test 1 failed'));
      }
    });
  });

  // --- TEST CASE 2: Fail when PUBLIC_APP_URL is not HTTPS ---
  await new Promise((resolve, reject) => {
    console.log('  [Test 2] Verifying server fails startup if PUBLIC_APP_URL does not use HTTPS...');
    const child = spawn('node', ['server.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PUBLIC_APP_URL: 'http://localhost:3000', // Non-HTTPS
        PORT: '3099'
      }
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);

    child.on('close', (code) => {
      console.log(`   - Exit code: ${code} (expected: 1)`);
      const output = stdout + '\n' + stderr;
      const containsError = output.includes('HTTPS');
      if (code === 1 && containsError) {
        console.log('    Test 2 Passed: Server blocked startup and logged the correct error.\n');
        resolve();
      } else {
        console.error(`    Test 2 Failed: Exit code=${code}, output: ${output}`);
        reject(new Error('Test 2 failed'));
      }
    });
  });

  // --- TEST CASE 3: Fail when PUBLIC_APP_URL is invalid URL ---
  await new Promise((resolve, reject) => {
    console.log('  [Test 3] Verifying server fails startup if PUBLIC_APP_URL is an invalid URL...');
    const child = spawn('node', ['server.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PUBLIC_APP_URL: 'not-a-valid-url-format', // Invalid
        PORT: '3099'
      }
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);

    child.on('close', (code) => {
      console.log(`   - Exit code: ${code} (expected: 1)`);
      const output = stdout + '\n' + stderr;
      const containsError = output.includes('valid URL');
      if (code === 1 && containsError) {
        console.log('    Test 3 Passed: Server blocked startup and logged the correct error.\n');
        resolve();
      } else {
        console.error(`    Test 3 Failed: Exit code=${code}, output: ${output}`);
        reject(new Error('Test 3 failed'));
      }
    });
  });

  // --- TEST CASE 4: Verification of Password Reset under Host Header Injection ---
  await new Promise((resolve, reject) => {
    console.log('  [Test 4] Launching server with mock preload to test injection attacks...');
    const testPort = '3011';
    const publicAppUrl = 'https://hackalert-xwpd.onrender.com';
    
    const child = spawn('node', ['--require', './test_preload.js', 'server.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PUBLIC_APP_URL: publicAppUrl,
        PORT: testPort,
        BREVO_API_KEY: 'mock-key', // Ensure sendEmail flows
        BREVO_SENDER_EMAIL: 'sender@example.com'
      }
    });

    let stdout = '';
    let isFinished = false;

    // Helper to clean up child process
    const cleanup = () => {
      if (!isFinished) {
        isFinished = true;
        child.kill();
      }
    };

    child.stdout.on('data', async (data) => {
      const msg = data.toString();
      stdout += msg;
      
      if (msg.includes('HackAlert running') && !isFinished) {
        console.log('   - Server successfully started on port ' + testPort);

        try {
          console.log('   - Sending password reset request with malicious headers (Host: evil.com)...');
          const postData = JSON.stringify({ email: 'test_user@hackalert.com' });
          const req = http.request({
            hostname: 'localhost',
            port: testPort,
            path: '/api/forgot-password',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'Host': 'evil.com',
              'X-Forwarded-Host': 'evil.com',
              'X-Forwarded-Proto': 'http'
            }
          }, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
              console.log(`   - Response code: ${res.statusCode}`);
              console.log(`   - Response body: ${resBody.trim()}`);

              // Allow a small delay for the email async task to complete and write to stdout
              setTimeout(() => {
                cleanup();

                // Search for the intercepted email output in the child stdout logs
                const emailPrefix = 'INTERCEPTED_EMAIL:';
                const logLines = stdout.split('\n');
                const emailLine = logLines.find(line => line.includes(emailPrefix));

                if (!emailLine) {
                  console.error('    Test 4 Failed: No email was intercepted by the preloader.');
                  reject(new Error('Test 4 failed'));
                  return;
                }

                const emailJson = JSON.parse(emailLine.substring(emailLine.indexOf(emailPrefix) + emailPrefix.length).trim());
                const emailHtml = emailJson.htmlContent;
                
                // Extract resetLink URL
                const match = emailHtml.match(/href="([^"]+)"/);
                if (!match) {
                  console.error('    Test 4 Failed: Could not extract reset URL from email HTML content.');
                  reject(new Error('Test 4 failed'));
                  return;
                }

                const generatedUrl = match[1];
                console.log(`   - Extracted Reset Link: ${generatedUrl}`);

                // Assertions
                console.log('   - Running security assertions...');
                
                if (!generatedUrl.startsWith('https://')) {
                  console.error('    Test 4 Failed: Reset link protocol is not HTTPS.');
                  reject(new Error('Test 4 failed'));
                  return;
                }

                if (generatedUrl.includes('evil.com')) {
                  console.error('    Test 4 Failed: Host header injection was successful! URL contains evil.com.');
                  reject(new Error('Test 4 failed'));
                  return;
                }

                if (!generatedUrl.startsWith(publicAppUrl)) {
                  console.error(`    Test 4 Failed: Reset link does not use the single source of truth PUBLIC_APP_URL (${publicAppUrl}).`);
                  reject(new Error('Test 4 failed'));
                  return;
                }

                console.log('    Test 4 Passed: Host Header and X-Forwarded-Host injection blocked. HTTPS enforced.');
                resolve();
              }, 1000);
            });
          });

          req.on('error', (err) => {
            cleanup();
            console.error('    Test 4 Failed: HTTP Request error:', err);
            reject(err);
          });

          req.write(postData);
          req.end();
        } catch (e) {
          cleanup();
          reject(e);
        }
      }
    });

    child.on('error', (err) => {
      cleanup();
      console.error('    Test 4 Failed: Spawn error:', err);
      reject(err);
    });

    child.on('close', (code) => {
      cleanup();
      // If server crashed before we finished, fail the test
      if (!isFinished) {
        console.error(`    Test 4 Failed: Server exited prematurely with code ${code}.`);
        reject(new Error('Server exited prematurely'));
      }
    });
  });

  console.log('\n All Host Header Injection security tests passed successfully!');
}

runTests().catch(err => {
  console.error('\n Security Regression tests failed:', err.message);
  process.exit(1);
});

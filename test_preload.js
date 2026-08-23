const Module = require('module');
const originalLoad = Module._load;

// Intercept global fetch to catch emails sent by Brevo SMTP API
const originalFetch = global.fetch;
global.lastSentEmail = null;

global.fetch = async function (url, options) {
  if (url === 'https://api.brevo.com/v3/smtp/email') {
    try {
      const body = JSON.parse(options.body);
      global.lastSentEmail = body;
      // Print the intercepted email body so the parent test process can inspect it
      console.log('INTERCEPTED_EMAIL:' + JSON.stringify(body));
      return {
        ok: true,
        json: async () => ({ message: 'Mocked email sent' })
      };
    } catch (e) {
      console.error('Failed to parse intercepted email request:', e);
    }
  }
  if (originalFetch) {
    return originalFetch.apply(this, arguments);
  }
  return { ok: true, json: async () => ({}) };
};

// Mock Supabase to return test user credentials for the password reset flow
Module._load = function (request, parent, isMain) {
  if (request === '@supabase/supabase-js') {
    return {
      createClient: () => {
        const query = {
          select: () => query,
          delete: () => query,
          insert: () => query,
          update: () => query,
          eq: (col, val) => {
            query._lastVal = val;
            return query;
          },
          gt: () => query,
          single: async () => {
            if (query._lastVal === 'test_user@hackalert.com') {
              return {
                data: {
                  id: 1,
                  name: 'Test User',
                  email: 'test_user@hackalert.com'
                },
                error: null
              };
            }
            return { data: null, error: new Error('User not found') };
          },
          then: (resolve) => resolve({ data: [], error: null })
        };
        return {
          from: (table) => {
            query._table = table;
            return query;
          }
        };
      }
    };
  }
  return originalLoad.apply(this, arguments);
};

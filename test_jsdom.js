const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlCode = fs.readFileSync(path.join(__dirname, 'realhackito.html'), 'utf8');
const jsCode = fs.readFileSync(path.join(__dirname, 'realhackito.js'), 'utf8');

const dom = new JSDOM(htmlCode, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost/"
});

const { window } = dom;

// Stub some browser features
window.fetch = () => Promise.resolve({
  json: () => Promise.resolve([])
});

const storage = {};
window.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (let k in storage) delete storage[k]; }
};
window.sessionStorage = window.localStorage;

window.console.error = (...args) => {
  console.log("CONSOLE ERROR:", ...args);
};
window.console.warn = (...args) => {
  console.log("CONSOLE WARN:", ...args);
};
window.console.log = (...args) => {
  console.log("CONSOLE LOG:", ...args);
};

window.addEventListener('error', (event) => {
  console.log("UNHANDLED RUNTIME ERROR:", event.error);
});

// Run marked.js and dompurify.js if needed, or stub them
window.marked = {
  parse: (str) => str
};
window.DOMPurify = {
  sanitize: (str) => str
};

try {
  // Let's run the javascript in window context
  window.eval(jsCode);
  console.log("Script evaluated successfully. Firing DOMContentLoaded...");
  const event = new window.Event('DOMContentLoaded');
  window.dispatchEvent(event);
  console.log("DOMContentLoaded fired.");
} catch (err) {
  console.error("Evaluation error:", err);
}

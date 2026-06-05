const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('realhackito.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

console.log('--- Checking all elements in realhackito.html ---');

// Let's check all elements that are visible and positioned fixed/absolute in style attributes
const allElements = Array.from(document.querySelectorAll('*'));
allElements.forEach(el => {
  const style = el.getAttribute('style') || '';
  const id = el.id ? `#${el.id}` : '';
  const cls = el.className ? `.${el.className.split(' ').join('.')}` : '';
  
  if (style.includes('position:fixed') || style.includes('position: fixed') || style.includes('position:absolute') || style.includes('position: absolute')) {
    console.log(`Element: ${el.tagName}${id}${cls} has inline style: "${style}"`);
  }
});

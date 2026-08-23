const fs = require('fs');
const { JSDOM } = require('jsdom');

async function main() {
  const html = fs.readFileSync('realhackito.html', 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  console.log('--- RUNTIME DOM VERIFICATION ---');

  // 1. SEO VERIFICATION
  console.log('\n[SEO Verification]');
  
  // Meta description
  const metaDesc = doc.querySelector('meta[name="description"]');
  console.log('Meta Description:', metaDesc ? `PASS (${metaDesc.getAttribute('content')})` : 'FAIL');

  // Meta keywords
  const metaKeywords = doc.querySelector('meta[name="keywords"]');
  console.log('Meta Keywords:', metaKeywords ? `PASS (${metaKeywords.getAttribute('content')})` : 'FAIL');

  // Canonical
  const canonical = doc.querySelector('link[rel="canonical"]');
  console.log('Canonical Link:', canonical ? `PASS (${canonical.getAttribute('href')})` : 'FAIL');

  // Open Graph
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const ogDesc = doc.querySelector('meta[property="og:description"]');
  const ogUrl = doc.querySelector('meta[property="og:url"]');
  const ogType = doc.querySelector('meta[property="og:type"]');
  const ogImage = doc.querySelector('meta[property="og:image"]');
  console.log('OG Title:', ogTitle ? `PASS (${ogTitle.getAttribute('content')})` : 'FAIL');
  console.log('OG Description:', ogDesc ? `PASS (${ogDesc.getAttribute('content')})` : 'FAIL');
  console.log('OG URL:', ogUrl ? `PASS (${ogUrl.getAttribute('content')})` : 'FAIL');
  console.log('OG Type:', ogType ? `PASS (${ogType.getAttribute('content')})` : 'FAIL');
  console.log('OG Image:', ogImage ? `PASS (${ogImage.getAttribute('content')})` : 'FAIL');

  // Twitter Cards
  const twitterCard = doc.querySelector('meta[name="twitter:card"]');
  const twitterTitle = doc.querySelector('meta[name="twitter:title"]');
  const twitterDesc = doc.querySelector('meta[name="twitter:description"]');
  console.log('Twitter Card Type:', twitterCard ? `PASS (${twitterCard.getAttribute('content')})` : 'FAIL');
  console.log('Twitter Title:', twitterTitle ? `PASS (${twitterTitle.getAttribute('content')})` : 'FAIL');
  console.log('Twitter Description:', twitterDesc ? `PASS (${twitterDesc.getAttribute('content')})` : 'FAIL');


  // 2. ACCESSIBILITY VERIFICATION
  console.log('\n[Accessibility Verification]');
  
  // Nav logo
  const logo = doc.querySelector('.nav-logo');
  if (logo) {
    console.log('Logo tabindex:', logo.getAttribute('tabindex') === '0' ? 'PASS (0)' : 'FAIL');
    console.log('Logo role:', logo.getAttribute('role') === 'link' ? 'PASS (link)' : 'FAIL');
    console.log('Logo aria-label:', logo.getAttribute('aria-label') === 'Hack/Alert Home' ? 'PASS (Hack/Alert Home)' : 'FAIL');
  } else {
    console.log('Logo element: FAIL (Not found)');
  }

  // Rating Stars
  const stars = doc.querySelectorAll('#star-input .star');
  console.log('Number of stars found:', stars.length);
  stars.forEach((star, i) => {
    const tabindex = star.getAttribute('tabindex');
    const role = star.getAttribute('role');
    const ariaLabel = star.getAttribute('aria-label');
    console.log(`Star ${i+1}: tabindex=${tabindex} (${tabindex==='0'?'PASS':'FAIL'}), role=${role} (${role==='button'?'PASS':'FAIL'}), aria-label="${ariaLabel}"`);
  });


  // 3. FEEDBACK SYSTEM MODAL VERIFICATION
  console.log('\n[Feedback Modal Verification]');
  
  const feedbackModal = doc.getElementById('feedback-modal');
  if (feedbackModal) {
    console.log('Feedback Modal div: PASS');
    
    // Check fields
    const titleField = doc.getElementById('feedback-title');
    const descField = doc.getElementById('feedback-desc');
    const ratingField = doc.getElementById('feedback-rating');
    const submitBtn = feedbackModal.querySelector('button[onclick="submitFeedback()"]');

    console.log('  Subject Field (feedback-title):', titleField ? 'PASS' : 'FAIL');
    console.log('  Description Field (feedback-desc):', descField ? 'PASS' : 'FAIL');
    console.log('  Rating Dropdown (feedback-rating):', ratingField ? 'PASS' : 'FAIL');
    console.log('  Submit button linked to submitFeedback():', submitBtn ? 'PASS' : 'FAIL');
  } else {
    console.log('Feedback Modal div: FAIL (Not found)');
  }

  // Nav menu feedback link
  const feedbackBtn = doc.querySelector('button[onclick="showFeedback();toggleNavMenu()"]');
  console.log('Feedback Button in Nav Dropdown:', feedbackBtn ? 'PASS' : 'FAIL');
}

main().catch(console.error);

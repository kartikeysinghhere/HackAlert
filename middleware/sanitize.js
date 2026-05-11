const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Anti-XSS Sanitization Middleware
 * Recursively sanitizes all strings in the request body to prevent XSS.
 */
const sanitizeBody = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    // Basic HTML sanitization to prevent script injection
    return DOMPurify.sanitize(obj, {
      ALLOWED_TAGS: [], // No tags allowed by default for plain text fields
      ALLOWED_ATTR: []
    }).trim();
  } else if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  } else if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Rich Text Sanitizer
 * Use this when you want to allow SOME safe HTML (e.g. bold, italics)
 */
const sanitizeRichText = (text) => {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li'],
    ALLOWED_ATTR: ['href', 'target']
  });
};

module.exports = {
  sanitizeBody,
  sanitizeRichText
};

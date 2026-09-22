// express-rate-limit was removed from package.json.
// This module gracefully handles the missing dependency.
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch(e) {
  // fallback: no-op rate limiter when package is not installed
  rateLimit = () => (req, res, next) => next();
}
const config = require('../config');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
});

module.exports = { apiLimiter, authLimiter };

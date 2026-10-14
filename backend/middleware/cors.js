const cors = require('cors');
const config = require('../config');

const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [...parseOrigins(config.corsOrigin), ...parseOrigins(config.frontendUrl)];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = cors(corsOptions);

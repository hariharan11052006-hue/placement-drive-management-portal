const cors = require('cors');
const config = require('../config');

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin === config.corsOrigin || origin === config.frontendUrl) {
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

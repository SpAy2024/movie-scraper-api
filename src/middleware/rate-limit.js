// src/middleware/rate-limit.js
const rateLimit = require('express-rate-limit');

const dailyRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 100, // 100 requests por día
  message: 'Límite de peticiones diarias excedido',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { dailyRateLimit };
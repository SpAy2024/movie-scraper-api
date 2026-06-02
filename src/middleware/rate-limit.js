const rateLimit = require('express-rate-limit');

const dailyRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 100, // 100 peticiones por día
  message: {
    success: false,
    error: 'Límite de peticiones diarias excedido (100/día)'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const publicRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 peticiones por minuto
  message: {
    success: false,
    error: 'Demasiadas peticiones, espera un momento'
  },
});

module.exports = { dailyRateLimit, publicRateLimit };
// src/middleware/auth.js
const { ApiError } = require('../utils/api-error');

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    throw new ApiError(401, 'Se requiere API Key');
  }
  
  if (apiKey !== process.env.API_KEY) {
    throw new ApiError(403, 'API Key inválida');
  }
  
  next();
}

module.exports = { requireApiKey };
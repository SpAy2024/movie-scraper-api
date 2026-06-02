const { ApiError } = require('../utils/api-error');

function requireApiKey(req, res, next) {
  // Omitir en desarrollo local
  if (process.env.NODE_ENV !== 'production' && !process.env.API_KEY) {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    throw new ApiError(401, 'Se requiere API Key. Envíala en el header x-api-key');
  }
  
  if (apiKey !== process.env.API_KEY) {
    throw new ApiError(403, 'API Key inválida');
  }
  
  next();
}

module.exports = { requireApiKey };
const { ApiError } = require('../utils/api-error');

function validateSearchQuery(req, res, next) {
  const { q } = req.query;
  
  if (!q || q.trim() === '') {
    throw new ApiError(400, 'Se requiere el parámetro "q" para la búsqueda');
  }
  
  next();
}

function validateInfoQuery(req, res, next) {
  const { url } = req.query;
  
  if (!url) {
    throw new ApiError(400, 'Se requiere el parámetro "url"');
  }
  
  next();
}

function validateDownloadRequest(req, res, next) {
  const { url } = req.body;
  
  if (!url) {
    throw new ApiError(400, 'Se requiere la URL de la película en el body');
  }
  
  next();
}

function validateBatchRequest(req, res, next) {
  const { urls } = req.body;
  
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    throw new ApiError(400, 'Se requiere un array "urls" con las URLs de las películas');
  }
  
  next();
}

module.exports = {
  validateSearchQuery,
  validateInfoQuery,
  validateDownloadRequest,
  validateBatchRequest,
};
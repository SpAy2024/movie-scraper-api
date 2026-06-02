// src/validators/movies.validator.js
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
    throw new ApiError(400, 'Se requiere la URL de la película');
  }
  
  next();
}

module.exports = {
  validateSearchQuery,
  validateInfoQuery,
  validateDownloadRequest,
};
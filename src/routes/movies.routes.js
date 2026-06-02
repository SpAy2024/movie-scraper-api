const express = require('express');
const { requireApiKey } = require('../middleware/auth');
const { dailyRateLimit } = require('../middleware/rate-limit');
const movieService = require('../services/movie.service');
const downloadService = require('../services/download.service');
const { ApiError } = require('../utils/api-error');
const {
  validateSearchQuery,
  validateInfoQuery,
  validateDownloadRequest,
  validateBatchRequest
} = require('../validators/movies.validator');

const router = express.Router();

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

// Middleware global
router.use(requireApiKey, dailyRateLimit);

// ============================================================
// ENDPOINTS PRINCIPALES
// ============================================================

// 1. Búsqueda de películas
router.get('/search', validateSearchQuery, asyncHandler(async (req, res) => {
  const { q, provider, year } = req.query;
  const results = await movieService.searchAll(q, provider, year);
  
  res.status(200).json({
    success: true,
    query: q,
    provider: provider || 'all',
    year: year || null,
    results,
  });
}));

// 2. Información de película
router.get('/info', validateInfoQuery, asyncHandler(async (req, res) => {
  const { url } = req.query;
  const info = await movieService.getMovieInfo(url);
  
  res.status(200).json({
    success: true,
    data: info,
  });
}));

// 3. Obtener servidores de una URL
router.get('/servers', asyncHandler(async (req, res) => {
  const { url, provider } = req.query;
  
  if (!url || !provider) {
    throw new ApiError(400, 'Se requieren los parámetros "url" y "provider"');
  }
  
  const servers = await movieService.getMovieServers(url, provider);
  
  res.status(200).json({
    success: true,
    servers,
  });
}));

// 4. Iniciar descarga individual
router.post('/download', validateDownloadRequest, asyncHandler(async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const downloadData = downloadService.createDownload(req.body, baseUrl);
  
  res.status(200).json({
    success: true,
    data: downloadData,
  });
}));

// 5. Estado de descarga
router.get('/download/:id', asyncHandler(async (req, res) => {
  const data = downloadService.getDownload(req.params.id);
  
  if (!data) {
    throw new ApiError(404, 'Descarga no encontrada');
  }
  
  res.status(200).json({
    success: true,
    data,
  });
}));

// 6. Descarga por lotes
router.post('/batch-download', validateBatchRequest, asyncHandler(async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const batchData = downloadService.createBatch(req.body, baseUrl);
  
  res.status(200).json({
    success: true,
    data: batchData,
  });
}));

// 7. Estado de lote
router.get('/batch/:id', asyncHandler(async (req, res) => {
  const data = downloadService.getBatch(req.params.id);
  
  if (!data) {
    throw new ApiError(404, 'Lote no encontrado');
  }
  
  res.status(200).json({
    success: true,
    data,
  });
}));

// 8. Proveedores disponibles
router.get('/providers', asyncHandler(async (req, res) => {
  const providers = movieService.getAvailableProviders();
  
  res.status(200).json({
    success: true,
    providers,
    total: providers.length,
  });
}));

// ============================================================
// ENDPOINTS DE TMDB
// ============================================================

// 9. Obtener géneros de TMDB
router.get('/tmdb/genres', asyncHandler(async (req, res) => {
  const { language } = req.query;
  const tmdbService = require('../services/tmdb.service');
  const result = await tmdbService.getGenres(language || 'es');
  
  res.status(200).json(result);
}));

// 10. Buscar película en TMDB
router.get('/tmdb/search', asyncHandler(async (req, res) => {
  const { title, year, language } = req.query;
  
  if (!title) {
    throw new ApiError(400, 'Se requiere el parámetro "title"');
  }
  
  const tmdbService = require('../services/tmdb.service');
  const result = await tmdbService.searchMovie(title, year, language || 'es');
  
  res.status(200).json(result);
}));

// 11. Buscar por actor/actriz
router.get('/tmdb/search-by-person', asyncHandler(async (req, res) => {
  const { name, language } = req.query;
  
  if (!name) {
    throw new ApiError(400, 'Se requiere el parámetro "name"');
  }
  
  const tmdbService = require('../services/tmdb.service');
  const result = await tmdbService.searchByPerson(name, language || 'es');
  
  res.status(200).json(result);
}));

// 12. Buscar por género
router.get('/tmdb/search-by-genre', asyncHandler(async (req, res) => {
  const { genreId, page, language } = req.query;
  
  if (!genreId) {
    throw new ApiError(400, 'Se requiere el parámetro "genreId"');
  }
  
  const tmdbService = require('../services/tmdb.service');
  const result = await tmdbService.searchByGenre(genreId, page || 1, language || 'es');
  
  res.status(200).json(result);
}));

// 13. Obtener película por ID
router.get('/tmdb/movie/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { language } = req.query;
  
  const tmdbService = require('../services/tmdb.service');
  const result = await tmdbService.getMovieById(id, language || 'es');
  
  res.status(200).json(result);
}));

// 14. Búsqueda con TMDB + proveedores
router.get('/search-with-tmdb', asyncHandler(async (req, res) => {
  const { title, year } = req.query;
  
  if (!title) {
    throw new ApiError(400, 'Se requiere el parámetro "title"');
  }
  
  const tmdbService = require('../services/tmdb.service');
  const result = await tmdbService.searchAndFindInProviders(title, year);
  
  res.status(200).json(result);
}));

// 15. Resolver enlace (para estrenoscinesaa)
router.post('/resolve-link', asyncHandler(async (req, res) => {
  const { url } = req.body;
  const resolverService = require('../services/resolver.service');
  
  if (!url) {
    throw new ApiError(400, 'Se requiere la URL');
  }
  
  const resolvedUrl = await resolverService.resolveUrl(url);
  
  res.status(200).json({
    success: true,
    resolvedUrl
  });
}));

module.exports = router;
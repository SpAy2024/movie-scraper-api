require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const moviesRoutes = require('./routes/movies.routes');
const { ApiError } = require('./utils/api-error');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Logging de peticiones
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rutas API
app.use('/api/v1/movies', moviesRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.json({
    message: '🎬 Movie Scraper API',
    version: '2.0.0',
    endpoints: {
      search: '/api/v1/movies/search?q=batman&provider=estrenoscinesaa',
      info: '/api/v1/movies/info?url=https://...',
      download: '/api/v1/movies/download (POST)'
    }
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: err.message
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor listo en http://0.0.0.0:${PORT}`);
  console.log(`🔍 API de búsqueda: http://0.0.0.0:${PORT}/api/v1/movies/search?q=batman`);
});
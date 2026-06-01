const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// IMPORTANTE: Primero declarar app
const app = express();

// Configurar middleware de archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Middlewares
app.use(cors());
app.use(express.json());

// Importar rutas
const moviesRoutes = require('./routes/movies.routes');

// Configurar puerto (SOLO UNA VEZ)
const PORT = process.env.PORT || 3001;

// Ruta de bienvenida
app.get('/', (req, res) => {
    res.json({ message: '🎬 Movie Scraper API is running!' });
});

// Conectar las rutas de películas
app.use('/api/v1/movies', moviesRoutes);

// Endpoint para obtener lista de proveedores
app.get('/api/v1/movies/providers', (req, res) => {
    const movieService = require('./services/movie.service');
    res.json({ providers: movieService.getAvailableProviders() });
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor listo en http://0.0.0.0:${PORT}`);
    console.log(`📱 Frontend disponible en http://0.0.0.0:${PORT}`);
    console.log(`🔍 API de búsqueda: http://0.0.0.0:${PORT}/api/v1/movies/search?q=batman`);
});
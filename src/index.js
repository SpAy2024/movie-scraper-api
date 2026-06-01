// PRIMERO: Importar dependencias
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// SEGUNDO: Crear la aplicación
const app = express();

// TERCERO: Configurar middlewares (AHORA sí podemos usar app)
app.use(express.static(path.join(__dirname, '../public')));
app.use(cors());
app.use(express.json());

// CUARTO: Importar rutas (después de crear app)
const moviesRoutes = require('./routes/movies.routes');

// QUINTO: Definir rutas
const PORT = process.env.PORT || 3001;

// Ruta de bienvenida
app.get('/', (req, res) => {
    res.json({ message: '🎬 Movie Scraper API is running!' });
});

// Conectar las rutas de películas
app.use('/api/v1/movies', moviesRoutes);

// Endpoint para obtener proveedores (necesario para el frontend)
app.get('/api/v1/movies/providers', (req, res) => {
    const movieService = require('./services/movie.service');
    res.json({ providers: movieService.getAvailableProviders() });
});

// SEXTO: Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    console.log(`📱 Frontend disponible en http://localhost:${PORT}`);
    console.log(`🔍 API de búsqueda: http://localhost:${PORT}/api/v1/movies/search?q=batman`);
});

// Headers con créditos (como anime1v-api)
app.use((req, res, next) => {
    res.setHeader('X-Created-By', 'Movie Scraper API');
    res.setHeader('X-Source', 'Based on anime1v-api by FxxMorgan');
    next();
});

// En la consola al iniciar
console.log('🎬 Movie Scraper API');
console.log('📡 Multi-proveedor de scraping para películas');
console.log('👨‍💻 Basado en anime1v-api por FxxMorgan');
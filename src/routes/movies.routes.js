const router = require('express').Router();
const movieService = require('../services/movie.service');

// Endpoint de búsqueda
router.get('/search', async (req, res) => {
    const { q, provider } = req.query;

    if (!q) {
        return res.status(400).json({ 
            error: 'El parámetro "q" (término de búsqueda) es requerido',
            ejemplo: '/api/v1/movies/search?q=batman'
        });
    }

    try {
        const results = await movieService.searchAll(q, provider);
        res.json({
            success: true,
            query: q,
            provider_used: provider || 'all',
            results,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error en /search:', error);
        res.status(500).json({ 
            error: 'Error interno al realizar la búsqueda', 
            details: error.message 
        });
    }
});

// Endpoint de información
router.get('/info', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ 
            error: 'El parámetro "url" es requerido',
            ejemplo: '/api/v1/movies/info?url=https://sololatino.net/pelicula/ejemplo'
        });
    }

    try {
        const movieInfo = await movieService.getMovieInfo(url);
        if (!movieInfo) {
            return res.status(404).json({ error: 'No se pudo obtener información de la película' });
        }
        res.json({ success: true, data: movieInfo });
    } catch (error) {
        console.error('Error en /info:', error);
        res.status(500).json({ 
            error: 'Error interno al obtener la información', 
            details: error.message 
        });
    }
});

// Endpoint para obtener proveedores disponibles
router.get('/providers', (req, res) => {
    res.json({ 
        providers: movieService.getAvailableProviders(),
        total: movieService.getAvailableProviders().length 
    });
});

// Endpoint para obtener TODOS los servidores de una película
router.get('/servers', async (req, res) => {
    const { url, provider } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'Se requiere la URL de la película' });
    }
    
    if (!provider) {
        return res.status(400).json({ error: 'Se requiere el nombre del proveedor' });
    }
    
    try {
        const serverResolver = require('../services/server-resolver.service');
        
        const servidores = await serverResolver.extraerServidores(url, provider);
        
        const iframes = servidores.filter(s => s.tipo === 'iframe');
        const descargas = servidores.filter(s => s.tipo === 'descarga');
        
        res.json({
            success: true,
            url: url,
            provider: provider,
            total: servidores.length,
            servidores: {
                iframes: iframes,
                descargas: descargas
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint unificado: busca en TMDB y luego en proveedores
router.get('/search-with-tmdb', async (req, res) => {
    const { title, year } = req.query;
    
    if (!title) {
        return res.status(400).json({ error: 'Se requiere el parámetro "title"' });
    }
    
    try {
        const tmdbService = require('../services/tmdb.service');
        const result = await tmdbService.searchAndFindInProviders(title, year);
        
        res.json({
            success: result.success,
            query: { title, year },
            tmdb: result.tmdb,
            providers: result.providers,
            servers: result.servers,
            totalServers: result.totalServers
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: buscar solo en TMDB
router.get('/tmdb/search', async (req, res) => {
    const { title, year, language } = req.query;
    
    if (!title) {
        return res.status(400).json({ error: 'Se requiere el parámetro "title"' });
    }
    
    try {
        const tmdbService = require('../services/tmdb.service');
        const result = await tmdbService.searchMovie(title, year, language || 'es');
        
        res.json(result);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: obtener película por ID de TMDB
router.get('/tmdb/movie/:id', async (req, res) => {
    const { id } = req.params;
    const { language } = req.query;
    
    try {
        const tmdbService = require('../services/tmdb.service');
        const result = await tmdbService.getMovieById(id, language || 'es');
        
        res.json(result);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: buscar por actor/actriz
router.get('/tmdb/search-by-person', async (req, res) => {
    const { name, language } = req.query;
    
    if (!name) {
        return res.status(400).json({ error: 'Se requiere el parámetro "name"' });
    }
    
    try {
        const tmdbService = require('../services/tmdb.service');
        const result = await tmdbService.searchByPerson(name, language || 'es');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: buscar por género
router.get('/tmdb/search-by-genre', async (req, res) => {
    const { genreId, page, language } = req.query;
    
    if (!genreId) {
        return res.status(400).json({ error: 'Se requiere el parámetro "genreId"' });
    }
    
    try {
        const tmdbService = require('../services/tmdb.service');
        const result = await tmdbService.searchByGenre(genreId, page || 1, language || 'es');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: obtener lista de géneros
router.get('/tmdb/genres', async (req, res) => {
    const { language } = req.query;
    
    try {
        const tmdbService = require('../services/tmdb.service');
        const result = await tmdbService.getGenres(language || 'es');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Endpoint para resolver un enlace de descarga
router.post('/resolve-link', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'Se requiere la URL del enlace' });
    }
    
    try {
        const resolverService = require('../services/resolver.service');
        
        // Detectar qué tipo de enlace es
        let resolvedUrl = url;
        
        if (url.includes('estrenoscinesaa.com/links/')) {
            resolvedUrl = await resolverService.resolveEstrenosCinesaa(url);
        } else {
            // Para otros proveedores
            resolvedUrl = await resolverService.resolveUrl(url);
        }
        
        res.json({
            success: true,
            originalUrl: url,
            resolvedUrl: resolvedUrl,
        });
    } catch (error) {
        console.error('Error resolviendo enlace:', error);
        res.status(500).json({
            error: 'Error al resolver el enlace',
            details: error.message,
        });
    }
});

// Endpoint para descargar directamente desde un enlace resuelto
router.post('/download-from-link', async (req, res) => {
    const { url, filename } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'Se requiere la URL del archivo' });
    }
    
    try {
        const resolverService = require('../services/resolver.service');
        const finalFilename = filename || `movie_${Date.now()}.mp4`;
        
        // Primero resolver si es necesario
        let downloadUrl = url;
        if (url.includes('estrenoscinesaa.com/links/')) {
            downloadUrl = await resolverService.resolveEstrenosCinesaa(url);
        }
        
        // Iniciar descarga (en background para no timeout)
        resolverService.download(downloadUrl, finalFilename, (percent) => {
            console.log(`📥 Progreso: ${percent.toFixed(2)}%`);
        }).then(outputPath => {
            console.log(`✅ Descarga completada: ${outputPath}`);
        }).catch(err => {
            console.error(`❌ Error en descarga:`, err.message);
        });
        
        res.json({
            success: true,
            message: 'Descarga iniciada en segundo plano',
            filename: finalFilename,
            downloadUrl: downloadUrl,
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Error al iniciar descarga',
            details: error.message,
        });
    }
});

// Nuevo endpoint: búsqueda con resolución automática
router.get('/search-and-resolve', async (req, res) => {
    const { q, provider } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'Se requiere el parámetro "q"' });
    }
    
    try {
        const movieService = require('../services/movie.service');
        const results = await movieService.searchAndResolve(q, provider);
        
        res.json({
            success: true,
            query: q,
            results: results,
            message: 'Los enlaces han sido resueltos automáticamente para reproducción'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para obtener stream directo de una película
router.get('/stream', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'Se requiere la URL de la película' });
    }
    
    try {
        const movieService = require('../services/movie.service');
        const movieData = await movieService.getMovieWithStreamUrl(url);
        
        res.json({
            success: true,
            title: movieData.title,
            streamUrl: movieData.streamUrl,
            quality: movieData.quality,
            size: movieData.size,
            provider: movieData.provider
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
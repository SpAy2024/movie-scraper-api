const BaseProvider = require('./BaseProvider');

class SeriesKaoProvider extends BaseProvider {
    constructor() {
        super('serieskao', 'https://serieskao.top', '/');
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'es-ES,es;q=0.9',
            'Referer': 'https://serieskao.top/'
        };
    }

    async search(query) {
        const searchUrl = `${this.baseURL}/search?s=${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const results = [];
        const queryLower = query.toLowerCase();
        
        $('a[href*="/pelicula/"], a[href*="/serie/"], a[href*="/anime/"], a[href*="/dorama/"]').each((i, el) => {
            let url = $(el).attr('href');
            let title = $(el).find('h3, .card__title, .title').text().trim();
            if (!title) title = $(el).text().trim();
            
            let type = 'movie';
            if (url.includes('/serie/')) type = 'serie';
            else if (url.includes('/anime/')) type = 'anime';
            else if (url.includes('/dorama/')) type = 'dorama';
            
            title = title.replace(/\s+\d{4}$/, '').trim();
            
            if (title && (title.toLowerCase().includes(queryLower) || url.toLowerCase().includes(queryLower))) {
                results.push({
                    id: this.extractId(url),
                    title: title,
                    url: url.startsWith('http') ? url : this.baseURL + url,
                    thumbnail: $(el).find('img').attr('src') || null,
                    provider: this.name,
                    type: type
                });
            }
        });
        
        const unique = [];
        const seen = new Set();
        for (const item of results) {
            if (!seen.has(item.url)) {
                seen.add(item.url);
                unique.push(item);
            }
        }
        
        console.log(`✅ ${this.name}: ${unique.length} resultados`);
        return unique;
    }

    async getInfo(url) {
        console.log(`📡 Obteniendo info de ${this.name}: ${url}`);
        const $ = await this.fetchHTML(url);
        if (!$) return null;
        
        // Título desde h1
        const title = $('h1').first().text().trim();
        
        // Tipo de contenido
        let type = 'movie';
        if (url.includes('/serie/')) type = 'serie';
        else if (url.includes('/anime/')) type = 'anime';
        else if (url.includes('/dorama/')) type = 'dorama';
        
        // Sinopsis
        let synopsis = '';
        $('.detail-hero__desc, .description, .sinopsis, .plot, .content p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 50 && !synopsis) {
                synopsis = text;
            }
        });
        
        // Año
        let year = null;
        $('.detail-hero__meta span, .year, .date').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\d{4}/);
            if (match && !year) year = match[0];
        });
        
        // Rating
        let rating = null;
        $('.detail-hero__rating, .rating, .score').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/(\d+(?:\.\d+)?)/);
            if (match) rating = match[1];
        });
        
        // Géneros
        const genres = [];
        $('.detail-hero__genre, .genre a, .sidebar__tag').each((i, el) => {
            const genre = $(el).text().trim();
            if (genre) genres.push(genre);
        });
        
        // Servidores de video
        const downloadLinks = [];
        
        // Buscar botones de servidores
        $('.server-btn').each((i, el) => {
            const serverName = $(el).text().trim();
            let videoUrl = $(el).attr('data-url');
            
            if (!videoUrl) videoUrl = $(el).attr('href');
            
            if (videoUrl) {
                // Completar URL relativa
                if (videoUrl.startsWith('/')) {
                    videoUrl = this.baseURL + videoUrl;
                }
                
                downloadLinks.push({
                    server: serverName || `Servidor ${i + 1}`,
                    url: videoUrl,
                    type: 'iframe',
                    quality: 'HD'
                });
            }
        });
        
        // Buscar iframe directo
        $('iframe#player-iframe, .player-box__frame iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src) {
                let fullUrl = src.startsWith('/') ? this.baseURL + src : src;
                if (!downloadLinks.some(l => l.url === fullUrl)) {
                    downloadLinks.push({
                        server: 'Reproductor',
                        url: fullUrl,
                        type: 'iframe',
                        quality: 'HD'
                    });
                }
            }
        });
        
        // Buscar imagen de portada
        let thumbnail = null;
        $('.detail-hero__poster img, .detail-hero__bg img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('image.tmdb.org')) {
                thumbnail = src;
            }
        });
        
        return {
            title: title || 'Sin título',
            synopsis: synopsis.substring(0, 500) || 'Sinopsis no disponible',
            year: year,
            rating: rating,
            genres: genres,
            thumbnail: thumbnail,
            url: url,
            provider: this.name,
            downloadLinks: downloadLinks,
            type: type
        };
    }
}

module.exports = SeriesKaoProvider;
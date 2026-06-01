const BaseProvider = require('./BaseProvider');

class PeliCineHDProvider extends BaseProvider {
    constructor() {
        super('pelicinehd', 'https://pelicinehd.com', '/');
    }

    async search(query) {
        const searchUrl = `https://pelicinehd.com/?s=${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        
        // Selector para los resultados de búsqueda
        $('.row .item, .peliculas .item, article[class*="movie"], .result-item').each((i, el) => {
            const titleEl = $(el).find('h3, .title, .entry-title');
            const linkEl = $(el).find('a');
            let url = linkEl.attr('href');
            
            if (url && (url.includes('/movies/') || url.includes('/pelicula/'))) {
                let title = titleEl.text().trim();
                if (!title) title = $(el).text().trim();
                title = title.replace(/Ver\s+/i, '').replace(/\s+\(\d{4}\)$/, '').trim();
                
                // Filtrar por búsqueda
                if (title.toLowerCase().includes(queryLower)) {
                    const fullUrl = url.startsWith('http') ? url : 'https://pelicinehd.com' + (url.startsWith('/') ? url : '/' + url);
                    
                    movies.push({
                        id: fullUrl.split('/').filter(p => p).pop() || this.extractId(fullUrl),
                        title: title,
                        url: fullUrl,
                        thumbnail: $(el).find('img').attr('src') || null,
                        provider: this.name,
                        type: 'movie'
                    });
                }
            }
        });
        
        console.log(`✅ ${this.name}: ${movies.length} resultados`);
        return movies;
    }

    async getInfo(url) {
        const $ = await this.fetchHTML(url);
        if (!$) return null;
        
        const title = $('h1').first().text().trim();
        
        let synopsis = '';
        $('.description, .sinopsis, .plot, .content p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 100 && !synopsis && !text.includes('Deja una respuesta')) {
                synopsis = text;
            }
        });
        
        let year = null;
        $('.year, .date, .fecha').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\d{4}/);
            if (match) year = match[0];
        });
        
        let rating = null;
        $('.tmdb, .rating, .puntuacion').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/(\d+(?:\.\d+)?)/);
            if (match) rating = match[1];
        });
        
        const downloadLinks = [];
        $('a[href*="1fichier"], a[href*="mega"], a[href*="mediafire"], .download-btn, .server-btn').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href !== '#') {
                downloadLinks.push({
                    server: $(el).text().trim() || `Servidor ${i + 1}`,
                    url: href,
                    quality: $(el).find('.quality').text().trim() || null
                });
            }
        });
        
        return {
            title: title || 'Sin título',
            synopsis: synopsis.substring(0, 500) || 'Sinopsis no disponible',
            year: year,
            rating: rating,
            url: url,
            provider: this.name,
            downloadLinks: downloadLinks
        };
    }
}

module.exports = PeliCineHDProvider;
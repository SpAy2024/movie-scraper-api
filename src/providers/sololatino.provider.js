const BaseProvider = require('./BaseProvider');

class SololatinoProvider extends BaseProvider {
    constructor() {
        super('sololatino', 'https://sololatino.net', '/buscar');
    }

    async search(query) {
        const searchUrl = `${this.baseURL}${this.searchPath}?q=${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        
        $('a[href*="/pelicula/"]').each((i, el) => {
            let url = $(el).attr('href');
            if (url && url.includes('/pelicula/')) {
                let title = $(el).find('h3').first().text().trim();
                if (!title || title.length < 2) {
                    const rawText = $(el).text().trim();
                    const match = rawText.match(/[A-Z][a-z]+(?:[\s:][A-Z][a-z]+)*(?=\s+\d{4}|$)/);
                    title = match ? match[0].trim() : 'Sin título';
                }
                
                if (title.toLowerCase().includes(queryLower) || url.toLowerCase().includes(queryLower)) {
                    movies.push({
                        id: this.extractId(url),
                        title: title,
                        url: url.startsWith('http') ? url : this.baseURL + url,
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
        $('.description, .sinopsis, .plot').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 100 && !synopsis) {
                synopsis = text;
            }
        });
        
        let year = null;
        $('.year, .date, .Year').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\d{4}/);
            if (match) year = match[0];
        });
        
        let rating = null;
        $('.rating, .puntuacion').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/(\d+(?:\.\d+)?)/);
            if (match) rating = match[1];
        });
        
        // ========== NUEVO: Extraer servidores de Sololatino ==========
        const downloadLinks = [];
        
        // Buscar botones de servidores con data-server-btn
        $('button[data-server-btn]').each((i, el) => {
            const serverName = $(el).text().trim();
            const playerToken = $(el).attr('data-player-token');
            const resolvedUrl = $(el).attr('data-resolved-url');
            
            if (resolvedUrl && resolvedUrl !== '#') {
                downloadLinks.push({
                    server: serverName,
                    url: resolvedUrl,
                    type: 'iframe'
                });
            } else if (playerToken) {
                downloadLinks.push({
                    server: serverName,
                    requiresAuth: true,
                    token: playerToken.substring(0, 50) + '...',
                    message: 'Requiere autenticación en sololatino.net'
                });
            }
        });
        
        // Buscar iframes directos
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('http')) {
                downloadLinks.push({
                    server: 'Reproductor',
                    url: src,
                    type: 'iframe'
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
            downloadLinks: downloadLinks,
            requiresAuth: downloadLinks.some(l => l.requiresAuth)
        };
    }
}

module.exports = SololatinoProvider;
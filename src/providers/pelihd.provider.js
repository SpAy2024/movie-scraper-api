const BaseProvider = require('./BaseProvider');

class PeliHDProvider extends BaseProvider {
    constructor() {
        super('pelihd', 'https://pelihd.com', '/');
    }

    async search(query) {
        const searchUrl = `https://pelihd.com/?s=${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        
        $('a[href*="/pelicula/"]').each((i, el) => {
            let url = $(el).attr('href');
            if (url && url.includes('/pelicula/')) {
                let title = $(el).find('h3').text().trim();
                if (!title) title = $(el).text().trim();
                title = title.replace('Ver', '').trim();
                
                if (title.toLowerCase().includes(queryLower) && title.length > 2) {
                    const fullUrl = url.startsWith('http') ? url : 'https://pelihd.com' + url;
                    
                    movies.push({
                        id: this.extractId(url),
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
        $('.content p, .description p, .plot p, article p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 100 && !synopsis && !text.includes('Busca o filtra')) {
                synopsis = text;
            }
        });
        
        let year = null;
        $('.year, .date').each((i, el) => {
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
        
        const downloadLinks = [];
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
        
        $('a[href*="yourupload"], a[href*="mega"], a[href*="mediafire"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                downloadLinks.push({
                    server: $(el).text().trim() || 'Servidor',
                    url: href
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

module.exports = PeliHDProvider;
const BaseProvider = require('./BaseProvider');

class RePelishdProvider extends BaseProvider {
    constructor() {
        super('repelishd', 'https://repelishd.ceo', '/');
    }

    async search(query) {
        const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        const seenUrls = new Set();
        
        $('a[href*="/ver-pelicula/"]').each((i, el) => {
            let url = $(el).attr('href');
            if (url && url.includes('/ver-pelicula/')) {
                let title = $(el).find('h3, .title').text().trim();
                if (!title) title = $(el).text().trim();
                
                // Filtrar solo los que coinciden con la búsqueda
                if ((title.toLowerCase().includes(queryLower) || url.toLowerCase().includes(queryLower)) && !seenUrls.has(url)) {
                    seenUrls.add(url);
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
        $('.Description, .sinopsis, .plot, .description').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 50 && !synopsis) synopsis = text;
        });

        let year = null;
        $('.Year, .year, .date').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\d{4}/);
            if (match) year = match[0];
        });

        const downloadLinks = [];
        $('a[href*="yourupload"], a[href*="mega"], a[href*="mediafire"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                downloadLinks.push({
                    server: $(el).text().trim() || 'Servidor',
                    url: href
                });
            }
        });
        
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('embed')) {
                downloadLinks.push({
                    server: 'Reproductor',
                    url: src,
                    type: 'iframe'
                });
            }
        });

        return {
            title: title || 'Sin título',
            synopsis: synopsis.substring(0, 500),
            year: year,
            url: url,
            provider: this.name,
            downloadLinks: downloadLinks
        };
    }
}

module.exports = RePelishdProvider;
const BaseProvider = require('./BaseProvider');

class CineCalidadProvider extends BaseProvider {
    constructor() {
        // Usar cinecalidad.ec como principal, pero aceptar múltiples dominios
        super('cinecalidad', 'https://www.cinecalidad.ec', '/ver-pelicula/');
        // Dominios alternativos que maneja este proveedor
        this.domains = [
            'https://www.cinecalidad.ec',
            'https://www.cinecalidad.rs', 
            'https://cinecalidad.onl'
        ];
    }

    async search(query) {
        const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        
        $('a[href*="/ver-pelicula/"]').each((i, el) => {
            let url = $(el).attr('href');
            if (url && url.includes('/ver-pelicula/')) {
                let title = $(el).find('h3, .title, .entry-title').text().trim();
                if (!title) title = $(el).text().trim();
                
                if (title.toLowerCase().includes(queryLower)) {
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
        $('.description, .sinopsis, .plot, .content p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 100 && !synopsis) synopsis = text;
        });
        
        let year = null;
        $('.year, .date, .fecha').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\d{4}/);
            if (match) year = match[0];
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
        
        $('[data-resolved-url]').each((i, el) => {
            const url = $(el).attr('data-resolved-url');
            if (url) {
                downloadLinks.push({
                    server: $(el).text().trim() || 'Servidor',
                    url: url,
                    type: 'iframe'
                });
            }
        });
        
        return {
            title: title || 'Sin título',
            synopsis: synopsis.substring(0, 500) || 'Sinopsis no disponible',
            year: year,
            url: url,
            provider: this.name,
            downloadLinks: downloadLinks
        };
    }
}

module.exports = CineCalidadProvider;
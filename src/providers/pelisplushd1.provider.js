const BaseProvider = require('./BaseProvider');

class PelisPlusHD1Provider extends BaseProvider {
    constructor() {
        super('pelisplushd1', 'https://pelisplushd1.ink', '');
    }

    async search(query) {
        const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        
        $('a[href*=".html"]').each((i, el) => {
            let url = $(el).attr('href');
            if (url && (url.includes('-ver-y-descargar-') || url.includes('/pelicula/'))) {
                let title = $(el).find('h3, .title').text().trim();
                if (!title) title = $(el).text().trim();
                
                if (title.toLowerCase().includes(queryLower)) {
                    movies.push({
                        id: url.split('/').pop()?.replace('.html', '') || this.extractId(url),
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
        $('.sinopsis, .description, .plot').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 100 && !synopsis) synopsis = text;
        });
        
        let year = null;
        $('.year, .date').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\d{4}/);
            if (match) year = match[0];
        });
        
        const downloadLinks = [];
        
        // Servidores: esplay, voe, veev, supervideo, 4K
        $('.server-btn, .btn-server, a[href*="esplay"], a[href*="voe"], a[href*="veev"], a[href*="supervideo"]').each((i, el) => {
            const serverName = $(el).text().trim();
            let serverUrl = $(el).attr('data-url') || $(el).attr('href');
            
            if (serverUrl && serverUrl !== '#') {
                downloadLinks.push({
                    server: serverName,
                    url: serverUrl,
                    type: 'iframe'
                });
            }
        });
        
        // Iframes
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src) {
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
            url: url,
            provider: this.name,
            downloadLinks: downloadLinks
        };
    }
}

module.exports = PelisPlusHD1Provider;
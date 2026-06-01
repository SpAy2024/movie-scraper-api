const BaseProvider = require('./BaseProvider');

class PelisPlusHDProvider extends BaseProvider {
    constructor() {
        super('pelisplushd', 'https://www.pelisplushd.la', '/');
    }

    async search(query) {
        const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(query)}`;
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
                title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                title = title.split('\n')[0].trim();
                
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
        $('.description, .sinopsis, .plot').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 100 && !synopsis) synopsis = text;
        });
        
        let year = null;
        $('.year, .date, .fecha').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\d{4}/);
            if (match) year = match[0];
        });
        
        // Extraer servidores de video
        const downloadLinks = [];
        
        // Servidores: esplay, voe, veev, supervideo, etc.
        $('.server-btn, .btn-server, .server-link, a[data-server]').each((i, el) => {
            const serverName = $(el).text().trim();
            const serverUrl = $(el).attr('data-url') || $(el).attr('href');
            if (serverUrl && serverUrl !== '#') {
                downloadLinks.push({
                    server: serverName,
                    url: serverUrl,
                    type: 'iframe'
                });
            }
        });
        
        // Buscar iframes
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('http')) {
                let serverName = 'Servidor';
                if (src.includes('voe')) serverName = 'VOE';
                else if (src.includes('esplay')) serverName = 'Esplay';
                else if (src.includes('veev')) serverName = 'Veev';
                else if (src.includes('supervideo')) serverName = 'Supervideo';
                
                downloadLinks.push({
                    server: serverName,
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

module.exports = PelisPlusHDProvider;
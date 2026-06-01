const BaseProvider = require('./BaseProvider');

class VerPelisTVProvider extends BaseProvider {
    constructor() {
        super('verpelistv', 'https://verpelistv.com', '/');
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
                title = title.replace('HD', '').trim();
                
                if (title.toLowerCase().includes(queryLower) && title.length > 2) {
                    const fullUrl = url.startsWith('http') ? url : this.baseURL + url;
                    
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
        $('.description, .sinopsis, .plot, .content').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 100 && !synopsis) synopsis = text;
        });
        
        const downloadLinks = [];
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
        
        $('a[href*="yourupload"], a[href*="mega"]').each((i, el) => {
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
            synopsis: synopsis.substring(0, 500),
            url: url,
            provider: this.name,
            downloadLinks: downloadLinks
        };
    }
}

module.exports = VerPelisTVProvider;
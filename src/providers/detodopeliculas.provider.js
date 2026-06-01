const BaseProvider = require('./BaseProvider');

class DeTodoPeliculasProvider extends BaseProvider {
    constructor() {
        super('detodopeliculas', 'https://detodopeliculas.net', '/');
        this.searchEndpoint = '/?s=';
    }

    async search(query) {
        const searchUrl = `${this.baseURL}${this.searchEndpoint}${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        
        $('a[href*="/pelicula/"]').each((i, el) => {
            let url = $(el).attr('href');
            if (url && url.includes('/pelicula/')) {
                let title = $(el).find('h3').text().trim();
                if (!title) title = $(el).find('.title').text().trim();
                if (!title) title = $(el).text().trim();
                title = title.replace(/Ver\s+/i, '').replace(/\s+\(\d{4}\)$/, '').trim();
                
                if (title && (title.toLowerCase().includes(queryLower) || url.toLowerCase().includes(queryLower))) {
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
            if (text.length > 100 && !synopsis && !text.includes('Preguntas frecuentes') && !text.includes('DTP Stream')) {
                synopsis = text;
            }
        });
        
        let year = null;
        $('.year, .date, .fecha, .release-year').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\d{4}/);
            if (match) year = match[0];
        });
        
        let rating = null;
        $('.rating, .puntuacion, .imdb-rating').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/(\d+(?:\.\d+)?)/);
            if (match) rating = match[1];
        });
        
        // ========== EXTRAER SERVIDORES ==========
        const downloadLinks = [];
        
        // Método 1: Buscar botones dooplay_player_option (Opcion 1-8)
        $('.dooplay_player_option').each((i, el) => {
            const titleText = $(el).find('.title').text().trim();
            const dataPost = $(el).attr('data-post');
            const dataNume = $(el).attr('data-nume');
            
            if (dataPost && dataNume) {
                downloadLinks.push({
                    server: titleText || `Opción ${dataNume}`,
                    requiresAPI: true,
                    postId: dataPost,
                    nume: dataNume,
                    message: 'Requiere llamada AJAX para obtener el iframe',
                    type: 'ajax'
                });
            }
        });
        
        // Método 2: Buscar iframes directos
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('http')) {
                downloadLinks.push({
                    server: `Reproductor ${i + 1}`,
                    url: src,
                    type: 'iframe'
                });
            }
        });
        
        // Método 3: Buscar enlaces de descarga con onclick
        $('li[onclick*="AbrirEnlaces"]').each((i, el) => {
            const onclick = $(el).attr('onclick');
            const match = onclick.match(/AbrirEnlaces\('([^']+)',\s*(\d+)\)/);
            if (match) {
                downloadLinks.push({
                    server: `Descargar (${match[1]})`,
                    requiresAPI: true,
                    postId: match[2],
                    language: match[1],
                    type: 'download'
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
            note: 'Para ver los iframes, usar el endpoint /api/v1/movies/resolve-link con la URL'
        };
    }
}

module.exports = DeTodoPeliculasProvider;
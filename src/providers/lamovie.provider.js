const BaseProvider = require('./BaseProvider');

class LaMovieProvider extends BaseProvider {
    constructor() {
        super('lamovie', 'https://lamovie.org', '/peliculas/');
    }

    async search(query) {
        const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        
        $('a[href*="/peliculas/"]').each((i, el) => {
            let url = $(el).attr('href');
            if (url && url.includes('/peliculas/')) {
                let title = $(el).find('h3, .title, .card-title').text().trim();
                if (!title) title = $(el).text().trim();
                title = title.replace('Online', '').trim();
                
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
        // Extraer ID de la URL
        const idMatch = url.match(/\/peliculas\/([^\/]+)/);
        const slug = idMatch ? idMatch[1] : '';
        
        // Intentar obtener datos de la API de WordPress
        const apiUrl = `https://lamovie.org/wp-json/wpf/v1/movies/${slug}`;
        
        try {
            const response = await axios.get(apiUrl, {
                headers: this.headers,
                timeout: 10000
            });
            
            const data = response.data;
            
            // Buscar servidores en la respuesta de la API
            const downloadLinks = [];
            
            if (data.video_urls && Array.isArray(data.video_urls)) {
                data.video_urls.forEach(video => {
                    downloadLinks.push({
                        server: video.server || 'Servidor',
                        url: video.url,
                        type: 'iframe'
                    });
                });
            }
            
            // También buscar en post_content
            if (data.post_content) {
                const iframeMatches = data.post_content.match(/<iframe[^>]+src=["']([^"']+)["']/gi);
                if (iframeMatches) {
                    iframeMatches.forEach(match => {
                        const srcMatch = match.match(/src=["']([^"']+)["']/);
                        if (srcMatch && srcMatch[1]) {
                            downloadLinks.push({
                                server: 'Reproductor',
                                url: srcMatch[1],
                                type: 'iframe'
                            });
                        }
                    });
                }
            }
            
            return {
                title: data.title || 'Sin título',
                synopsis: data.excerpt || 'Sinopsis no disponible',
                year: data.year || null,
                rating: data.rating || null,
                url: url,
                provider: this.name,
                downloadLinks: downloadLinks
            };
            
        } catch (error) {
            console.log(`API falló para ${slug}, usando HTML estático...`);
            
            // Fallback a HTML estático
            const $ = await this.fetchHTML(url);
            if (!$) return null;
            
            const title = $('h1').first().text().trim();
            
            let synopsis = '';
            $('.description, .sinopsis, .plot').each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 100 && !synopsis) synopsis = text;
            });
            
            let year = null;
            $('.year, .date').each((i, el) => {
                const text = $(el).text();
                const match = text.match(/\d{4}/);
                if (match) year = match[0];
            });
            
            return {
                title: title || 'Sin título',
                synopsis: synopsis.substring(0, 500) || 'Sinopsis no disponible',
                year: year,
                url: url,
                provider: this.name,
                downloadLinks: [],
                note: 'No se pudieron obtener servidores automáticamente'
            };
        }
    }
}

module.exports = LaMovieProvider;
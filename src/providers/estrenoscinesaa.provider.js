const BaseProvider = require('./BaseProvider');

class EstrenosCinesaaProvider extends BaseProvider {
    constructor() {
        super('estrenoscinesaa', 'https://www.estrenoscinesaa.com', '/');
    }

    async search(query) {
        const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(' ').filter(w => w.length > 3);
        
        $('a[href*="/movies/"], a[href*="/tvshows/"]').each((i, el) => {
            let url = $(el).attr('href');
            if (url && (url.includes('/movies/') || url.includes('/tvshows/'))) {
                let title = $(el).find('h3, .title').text().trim();
                if (!title) title = $(el).text().trim();
                
                const titleLower = title.toLowerCase();
                
                // Criterios de coincidencia mejorados
                let isMatch = false;
                
                // 1. Coincidencia exacta del título completo
                if (titleLower === queryLower) {
                    isMatch = true;
                }
                // 2. Coincidencia de palabras clave (al menos 2 palabras coinciden)
                else {
                    let matchCount = 0;
                    for (const word of queryWords) {
                        if (titleLower.includes(word)) {
                            matchCount++;
                        }
                    }
                    isMatch = matchCount >= Math.min(2, queryWords.length);
                }
                // 3. Coincidencia en la URL
                if (!isMatch && url.toLowerCase().includes(queryLower.replace(/ /g, '-'))) {
                    isMatch = true;
                }
                
                if (isMatch && title && title.length > 2) {
                    movies.push({
                        id: this.extractId(url),
                        title: title,
                        url: url.startsWith('http') ? url : this.baseURL + url,
                        thumbnail: $(el).find('img').attr('src') || null,
                        provider: this.name,
                        type: url.includes('/movies/') ? 'movie' : 'tvshow',
                        relevance: titleLower === queryLower ? 100 : matchCount
                    });
                }
            }
        });
        
        // Ordenar por relevancia (mayor primero)
        movies.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
        
        console.log(`✅ ${this.name}: ${movies.length} resultados (filtrados)`);
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
        $('.year, .date').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\d{4}/);
            if (match) year = match[0];
        });
        
        const downloadLinks = [];
        $('a[href*="/links/"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('/links/')) {
                downloadLinks.push({
                    server: 'Descarga directa',
                    url: href,
                    quality: $(el).closest('tr').find('td:nth-child(2)').text().trim() || 'HD',
                    language: $(el).closest('tr').find('td:nth-child(3)').text().trim() || 'spanish',
                    size: $(el).closest('tr').find('td:nth-child(4)').text().trim() || null
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

module.exports = EstrenosCinesaaProvider;
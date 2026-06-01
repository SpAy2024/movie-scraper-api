const BaseProvider = require('./BaseProvider');

class EstrenosCinesaaProvider extends BaseProvider {
    constructor() {
        super('estrenoscinesaa', 'https://www.estrenoscinesaa.com', '/');
    }

    /**
     * Normaliza texto para comparación (quita acentos, mayúsculas, artículos)
     */
    normalizeText(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quita acentos
            .replace(/^(the|a|an|el|la|los|las|un|una|unos|unas)\s+/i, '') // Quita artículos
            .replace(/[^\w\s]/g, '') // Quita puntuación
            .trim();
    }

    /**
     * Extrae año del texto o URL
     */
    extractYear(text, url) {
        if (!text && !url) return null;
        
        // Buscar años entre 1900-2099
        const yearMatch = (text || '').match(/\b(19|20)\d{2}\b/);
        if (yearMatch) return yearMatch[0];
        
        const urlMatch = (url || '').match(/\b(19|20)\d{2}\b/);
        if (urlMatch) return urlMatch[0];
        
        return null;
    }

    /**
     * Calcula puntuación de relevancia para un resultado
     */
    calculateRelevance(title, query, queryWords, yearMatch, requestedYear) {
        let score = 0;
        const normalizedTitle = this.normalizeText(title);
        const normalizedQuery = this.normalizeText(query);
        
        // 1. Coincidencia exacta del título (máxima puntuación)
        if (normalizedTitle === normalizedQuery) {
            score += 100;
        }
        // 2. Coincidencia del título completo (ignorando artículos)
        else if (normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle)) {
            score += 80;
        }
        
        // 3. Coincidencia de palabras individuales
        let wordMatches = 0;
        for (const word of queryWords) {
            if (normalizedTitle.includes(word)) {
                wordMatches++;
            }
        }
        
        if (queryWords.length > 0) {
            const wordMatchRatio = wordMatches / queryWords.length;
            score += wordMatchRatio * 60;
        }
        
        // 4. Bonus por coincidencia de año
        if (requestedYear && yearMatch) {
            if (yearMatch === requestedYear) {
                score += 30; // Año exacto
            } else if (Math.abs(parseInt(yearMatch) - parseInt(requestedYear)) <= 1) {
                score += 10; // Año cercano (±1)
            }
        }
        
        // 5. Bonus por título más corto (generalmente más relevante)
        score += Math.max(0, 20 - normalizedTitle.length) * 0.5;
        
        return Math.round(score);
    }

    async search(query, year = null) {
        // Si se proporciona año, agregarlo a la consulta
        const searchQuery = year ? `${query} ${year}` : query;
        const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(searchQuery)}`;
        
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl} ${year ? `(filtro año: ${year})` : ''}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(' ').filter(w => w.length > 2);
        const requestedYear = year ? year.toString() : null;
        
        // Selectores ampliados para capturar más resultados
        const selectors = [
            'a[href*="/movies/"]',
            'a[href*="/tvshows/"]',
            'article a',
            '.item a',
            '.post a'
        ];
        
        for (const selector of selectors) {
            $(selector).each((i, el) => {
                let url = $(el).attr('href');
                if (!url) return;
                
                // Verificar que sea URL de película/serie
                if (!url.includes('/movies/') && !url.includes('/tvshows/')) return;
                
                // Extraer título de múltiples fuentes
                let title = $(el).find('h3, .title, .entry-title, h2').text().trim();
                if (!title) title = $(el).attr('title') || $(el).text().trim();
                if (!title) return;
                
                // Extraer año del elemento o URL
                let yearText = $(el).find('.year, .date, .fecha').text().trim();
                let itemYear = this.extractYear(yearText, url);
                
                // Si no hay año en el elemento, buscar en el texto del título
                if (!itemYear) {
                    itemYear = this.extractYear(title, null);
                    // Limpiar año del título si está presente
                    title = title.replace(/\s*\(?\b(19|20)\d{2}\b\)?\s*$/, '').trim();
                }
                
                const titleLower = title.toLowerCase();
                let isMatch = false;
                
                // CRITERIOS DE COINCIDENCIA
                
                // 1. Coincidencia exacta del título completo
                if (titleLower === queryLower) {
                    isMatch = true;
                }
                // 2. Coincidencia de palabras clave (al menos 50% de palabras coinciden)
                else if (queryWords.length > 0) {
                    let matchCount = 0;
                    for (const word of queryWords) {
                        if (titleLower.includes(word)) {
                            matchCount++;
                        }
                    }
                    const matchRatio = matchCount / queryWords.length;
                    isMatch = matchRatio >= 0.5; // Al menos 50% de palabras coinciden
                }
                // 3. Coincidencia en la URL
                else if (url.toLowerCase().includes(queryLower.replace(/ /g, '-'))) {
                    isMatch = true;
                }
                // 4. Coincidencia en el título normalizado
                else if (this.normalizeText(title).includes(this.normalizeText(query))) {
                    isMatch = true;
                }
                
                // 5. Filtrar por año si se especificó
                if (isMatch && requestedYear && itemYear) {
                    isMatch = (itemYear === requestedYear);
                }
                
                if (isMatch && title && title.length > 2) {
                    const relevance = this.calculateRelevance(
                        title, query, queryWords, itemYear, requestedYear
                    );
                    
                    movies.push({
                        id: this.extractId(url),
                        title: title,
                        year: itemYear,
                        url: url.startsWith('http') ? url : this.baseURL + url,
                        thumbnail: $(el).find('img').attr('src') || null,
                        provider: this.name,
                        type: url.includes('/movies/') ? 'movie' : 'tvshow',
                        relevance: relevance
                    });
                }
            });
        }
        
        // Eliminar duplicados por URL
        const uniqueMovies = [];
        const seenUrls = new Set();
        for (const movie of movies) {
            if (!seenUrls.has(movie.url)) {
                seenUrls.add(movie.url);
                uniqueMovies.push(movie);
            }
        }
        
        // Ordenar por relevancia (mayor primero)
        uniqueMovies.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
        
        console.log(`✅ ${this.name}: ${uniqueMovies.length} resultados filtrados`);
        if (uniqueMovies.length > 0) {
            console.log(`   Top resultado: "${uniqueMovies[0].title}" (relevancia: ${uniqueMovies[0].relevance})`);
        }
        
        return uniqueMovies;
    }

    async getInfo(url) {
        console.log(`📄 Obteniendo info de ${this.name}: ${url}`);
        const $ = await this.fetchHTML(url);
        if (!$) return null;
        
        // Título
        let title = $('h1').first().text().trim();
        if (!title) title = $('.title, .entry-title').first().text().trim();
        
        // Año
        let year = null;
        $('.year, .date, .fecha, .meta-info, .release-date').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\b(19|20)\d{2}\b/);
            if (match) year = match[0];
        });
        
        // Si no hay año, buscarlo en la URL
        if (!year) {
            year = this.extractYear(url, null);
        }
        
        // Sinopsis
        let synopsis = '';
        const sinopsisSelectors = [
            '.description', '.sinopsis', '.plot', 
            '.content p', '.entry-content p', 
            'meta[name="description"]'
        ];
        
        for (const selector of sinopsisSelectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content && content.length > 100) {
                    synopsis = content;
                    break;
                }
            } else {
                const text = $(selector).first().text().trim();
                if (text && text.length > 100) {
                    synopsis = text;
                    break;
                }
            }
        }
        
        // Enlaces de descarga / servidores
        const downloadLinks = [];
        
        // Buscar enlaces en tablas de descarga
        $('a[href*="/links/"], .download-links a, .enlaces a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('/links/')) {
                const row = $(el).closest('tr, .item, .link-item');
                downloadLinks.push({
                    server: $(el).text().trim() || 'Descarga directa',
                    url: href,
                    quality: row.find('.quality, td:nth-child(2)').text().trim() || 'HD',
                    language: row.find('.language, td:nth-child(3)').text().trim() || 'Latino/Español',
                    size: row.find('.size, td:nth-child(4)').text().trim() || null
                });
            }
        });
        
        // Buscar iframes (servidores de video)
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.startsWith('http')) {
                downloadLinks.push({
                    server: `Servidor ${i+1}`,
                    url: src,
                    type: 'iframe',
                    quality: 'VER ONLINE'
                });
            }
        });
        
        // Poster / thumbnail
        let poster = null;
        const posterImg = $('.poster img, .thumbnail img, .entry-image img').attr('src');
        if (posterImg) poster = posterImg;
        
        console.log(`✅ ${this.name}: ${downloadLinks.length} enlaces encontrados`);
        
        return {
            title: this.cleanTitle(title) || 'Sin título',
            synopsis: synopsis.substring(0, 600) || 'Sinopsis no disponible',
            year: year,
            url: url,
            provider: this.name,
            poster: poster,
            downloadLinks: downloadLinks
        };
    }
    
    cleanTitle(title) {
        if (!title) return '';
        // Eliminar año al final y texto extra
        return title
            .replace(/\s*\(?\b(19|20)\d{2}\b\)?\s*$/, '')
            .replace(/\s*[-|].*$/, '')
            .trim();
    }
}

module.exports = EstrenosCinesaaProvider;
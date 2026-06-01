const BaseProvider = require('./BaseProvider');

class VerPelisTVProvider extends BaseProvider {
    constructor() {
        super('verpelistv', 'https://verpelistv.com', '/');
        
        // Dominios alternativos
        this.domains = [
            'https://verpelistv.com',
            'https://www.verpelistv.com',
            'https://verpelis.tv'
        ];
    }

    /**
     * Normaliza texto para comparación (quita acentos, mayúsculas, artículos)
     */
    normalizeText(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/^(the|a|an|el|la|los|las|un|una|unos|unas)\s+/i, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+hd\s*$/i, '')
            .replace(/\s+full\s+hd\s*$/i, '')
            .trim();
    }

    /**
     * Extrae año del texto o URL
     */
    extractYear(text, url) {
        if (!text && !url) return null;
        
        const yearMatch = (text || '').match(/\b(19|20)\d{2}\b/);
        if (yearMatch) return yearMatch[0];
        
        const urlMatch = (url || '').match(/\b(19|20)\d{2}\b/);
        if (urlMatch) return urlMatch[0];
        
        return null;
    }

    /**
     * Calcula puntuación de relevancia
     */
    calculateRelevance(title, query, queryWords, yearMatch, requestedYear) {
        let score = 0;
        const normalizedTitle = this.normalizeText(title);
        const normalizedQuery = this.normalizeText(query);
        
        // 1. Coincidencia exacta
        if (normalizedTitle === normalizedQuery) {
            score += 100;
        }
        // 2. Título contiene la consulta o viceversa
        else if (normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle)) {
            score += 80;
        }
        
        // 3. Coincidencia de palabras
        if (queryWords.length > 0) {
            let wordMatches = 0;
            for (const word of queryWords) {
                if (normalizedTitle.includes(word)) {
                    wordMatches++;
                }
            }
            const wordMatchRatio = wordMatches / queryWords.length;
            score += wordMatchRatio * 60;
        }
        
        // 4. Bonus por año
        if (requestedYear && yearMatch) {
            if (yearMatch === requestedYear) {
                score += 30;
            } else if (Math.abs(parseInt(yearMatch) - parseInt(requestedYear)) <= 1) {
                score += 10;
            }
        }
        
        // 5. Bonus por título más corto
        score += Math.max(0, 20 - normalizedTitle.length) * 0.5;
        
        return Math.round(score);
    }

    async search(query, year = null) {
        const searchQuery = year ? `${query} ${year}` : query;
        const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(searchQuery)}`;
        
        console.log(`🔍 Buscando en ${this.name}: ${searchUrl} ${year ? `(año: ${year})` : ''}`);
        
        const $ = await this.fetchHTML(searchUrl);
        if (!$) return [];

        const movies = [];
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(' ').filter(w => w.length > 2);
        const requestedYear = year ? year.toString() : null;
        
        // Selectores ampliados
        const selectors = [
            'a[href*="/pelicula/"]',
            'a[href*="/peliculas/"]',
            'article a',
            '.item a',
            '.post a'
        ];
        
        for (const selector of selectors) {
            $(selector).each((i, el) => {
                let url = $(el).attr('href');
                if (!url) return;
                
                if (!url.includes('/pelicula/') && !url.includes('/peliculas/')) return;
                
                // Extraer título
                let title = $(el).find('h3, .title, .entry-title, h2').text().trim();
                if (!title) title = $(el).attr('title') || $(el).text().trim();
                if (!title) return;
                
                // Limpiar título
                title = title.replace(/HD|FULL|MEGA|4K|1080p|720p/gi, '').trim();
                
                // Extraer año
                let yearText = $(el).find('.year, .date, .fecha').text().trim();
                let itemYear = this.extractYear(yearText, url);
                
                if (!itemYear) {
                    itemYear = this.extractYear(title, null);
                    title = title.replace(/\s*\(?\b(19|20)\d{2}\b\)?\s*$/, '').trim();
                }
                
                const titleLower = title.toLowerCase();
                let isMatch = false;
                
                // CRITERIOS DE COINCIDENCIA
                
                // 1. Coincidencia exacta
                if (titleLower === queryLower) {
                    isMatch = true;
                }
                // 2. Coincidencia de palabras (mínimo 50%)
                else if (queryWords.length > 0) {
                    let matchCount = 0;
                    for (const word of queryWords) {
                        if (titleLower.includes(word)) {
                            matchCount++;
                        }
                    }
                    const matchRatio = matchCount / queryWords.length;
                    isMatch = matchRatio >= 0.5;
                }
                // 3. Coincidencia en URL
                else if (url.toLowerCase().includes(queryLower.replace(/ /g, '-'))) {
                    isMatch = true;
                }
                // 4. Texto normalizado
                else if (this.normalizeText(title).includes(this.normalizeText(query))) {
                    isMatch = true;
                }
                
                // 5. Filtrar por año
                if (isMatch && requestedYear && itemYear) {
                    isMatch = (itemYear === requestedYear);
                }
                
                if (isMatch && title && title.length > 2) {
                    const relevance = this.calculateRelevance(
                        title, query, queryWords, itemYear, requestedYear
                    );
                    
                    const fullUrl = url.startsWith('http') ? url : this.baseURL + url;
                    
                    movies.push({
                        id: this.extractId(url),
                        title: title,
                        year: itemYear,
                        url: fullUrl,
                        thumbnail: $(el).find('img').attr('src') || null,
                        provider: this.name,
                        type: 'movie',
                        relevance: relevance
                    });
                }
            });
        }
        
        // Eliminar duplicados
        const uniqueMovies = [];
        const seenUrls = new Set();
        for (const movie of movies) {
            if (!seenUrls.has(movie.url)) {
                seenUrls.add(movie.url);
                uniqueMovies.push(movie);
            }
        }
        
        // Ordenar por relevancia
        uniqueMovies.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
        
        console.log(`✅ ${this.name}: ${uniqueMovies.length} resultados filtrados`);
        if (uniqueMovies.length > 0) {
            console.log(`   Top: "${uniqueMovies[0].title}" (relevancia: ${uniqueMovies[0].relevance})`);
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
        title = title.replace(/HD|FULL/gi, '').trim();
        
        // Año
        let year = null;
        $('.year, .date, .fecha, .meta-info').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\b(19|20)\d{2}\b/);
            if (match) year = match[0];
        });
        
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
        
        // Enlaces de video y descarga
        const downloadLinks = [];
        
        // 1. Iframes (reproductores)
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.startsWith('http')) {
                downloadLinks.push({
                    server: `Reproductor ${i+1}`,
                    url: src,
                    type: 'iframe',
                    quality: 'VER ONLINE'
                });
            }
        });
        
        // 2. Enlaces de descarga (Mega, YourUpload, etc.)
        $('a[href*="yourupload"], a[href*="mega"], a[href*="mediafire"], a[href*="drive"], a[href*="descargar"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.startsWith('http')) {
                let serverName = $(el).text().trim();
                if (!serverName || serverName.length < 2) {
                    if (href.includes('mega')) serverName = 'MEGA';
                    else if (href.includes('yourupload')) serverName = 'YourUpload';
                    else if (href.includes('mediafire')) serverName = 'MediaFire';
                    else if (href.includes('drive')) serverName = 'Google Drive';
                    else serverName = `Descarga ${i+1}`;
                }
                
                downloadLinks.push({
                    server: serverName,
                    url: href,
                    type: 'download',
                    quality: 'DESCARGAR'
                });
            }
        });
        
        // 3. Enlaces de la tabla de descargas
        $('.links_table a, .download-links a, .enlaces a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.startsWith('http') && !downloadLinks.some(l => l.url === href)) {
                downloadLinks.push({
                    server: $(el).text().trim() || `Enlace ${i+1}`,
                    url: href,
                    type: href.includes('magnet:') ? 'magnet' : 'download',
                    quality: 'DESCARGAR'
                });
            }
        });
        
        // Poster
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
        return title
            .replace(/\s*\(?\b(19|20)\d{2}\b\)?\s*$/, '')
            .replace(/\s*[-|].*$/, '')
            .replace(/HD|FULL/gi, '')
            .trim();
    }
}

module.exports = VerPelisTVProvider;
const BaseProvider = require('./BaseProvider');
const axios = require('axios');
const cheerio = require('cheerio');

class VerPelisTVProvider extends BaseProvider {
   constructor() {
    super('verpelistv', 'https://pelisplushd.to', '/');
    
    this.domains = [
        'https://pelisplushd.to',
        'https://pelisplushd.nz',
        'https://pelisplushd.ac',
        'https://pelisplus.so'
    ];
}

    normalizeText(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '')
            .replace(/[^\w\s]/g, '')
            .trim();
    }

    extractYear(text, url) {
        if (!text && !url) return null;
        const yearMatch = (text || '').match(/\b(19|20)\d{2}\b/);
        if (yearMatch) return yearMatch[0];
        const urlMatch = (url || '').match(/\b(19|20)\d{2}\b/);
        if (urlMatch) return urlMatch[0];
        return null;
    }

    async search(query, year = null) {
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
                title = title.replace(/HD|FULL/gi, '').trim();
                
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
        console.log(`📄 VerPelisTV.getInfo(): ${url}`);
        
        // Usar axios directamente para probar
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            
            const title = $('h1').first().text().trim() || 'Sin título';
            
            let synopsis = '';
            $('.description, .sinopsis, .plot, .content p').each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 100 && !synopsis) synopsis = text;
            });
            
            const downloadLinks = [];
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.startsWith('http')) {
                    downloadLinks.push({
                        server: `Servidor ${i+1}`,
                        url: src,
                        type: 'iframe'
                    });
                }
            });
            
            console.log(`✅ ${this.name}: ${downloadLinks.length} enlaces encontrados`);
            
            return {
                title: title,
                synopsis: synopsis.substring(0, 500) || 'Sinopsis no disponible',
                url: url,
                provider: this.name,
                downloadLinks: downloadLinks
            };
        } catch (error) {
            console.error(`❌ Error en getInfo: ${error.message}`);
            return null;
        }
    }
}

module.exports = VerPelisTVProvider;
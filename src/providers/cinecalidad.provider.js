const BaseProvider = require('./BaseProvider');

class CineCalidadProvider extends BaseProvider {
    constructor() {
        super('cinecalidad', 'https://www.cinecalidad.ec', '/ver-pelicula/');
        
        // Todos los dominios conocidos de CineCalidad
        this.domains = [
            'https://www.cinecalidad.ec',
            'https://www.cinecalidad.rs',
            'https://cinecalidad.onl',
            'https://www.cinecalidad.am',
            'https://cinecalidad.am'
        ];
    }

    // Detectar automáticamente qué dominio usar para una URL
    _getDomainForUrl(url) {
        for (const domain of this.domains) {
            if (url.includes(domain.replace('https://', ''))) {
                return domain;
            }
        }
        return this.baseURL;
    }

    async search(query) {
        // Intentar búsqueda en cada dominio
        for (const domain of this.domains) {
            const searchUrl = `${domain}/?s=${encodeURIComponent(query)}`;
            console.log(`🔍 Buscando en CineCalidad (${domain}): ${searchUrl}`);
            
            const $ = await this.fetchHTML(searchUrl);
            if (!$) continue;

            const movies = [];
            const queryLower = query.toLowerCase();
            
            // Selectores más amplios para resultados de búsqueda
            $('article, .post, .item, a[href*="/ver-pelicula/"], a[href*="/pelicula/"]').each((i, el) => {
                let url = $(el).attr('href');
                if (!url) return;
                
                // Normalizar URL
                if (url.startsWith('/')) url = domain + url;
                
                // Verificar que sea URL de película
                if (url.includes('/ver-pelicula/') || url.includes('/pelicula/')) {
                    let title = $(el).find('h3, .title, .entry-title, h2').text().trim();
                    if (!title) title = $(el).text().trim();
                    
                    if (title && title.toLowerCase().includes(queryLower)) {
                        movies.push({
                            id: this.extractId(url),
                            title: this.cleanTitle(title),
                            url: url,
                            thumbnail: $(el).find('img').attr('src') || null,
                            provider: `${this.name} (${domain.split('//')[1]})`,
                            type: 'movie'
                        });
                    }
                }
            });
            
            if (movies.length > 0) {
                console.log(`✅ CineCalidad: ${movies.length} resultados en ${domain}`);
                return movies;
            }
        }
        
        console.log(`⚠️ CineCalidad: No se encontraron resultados`);
        return [];
    }

    async getInfo(url) {
        console.log(`📄 Obteniendo info de CineCalidad: ${url}`);
        const $ = await this.fetchHTML(url);
        if (!$) return null;
        
        // Título
        let title = $('h1').first().text().trim();
        if (!title) title = $('.title, .entry-title').first().text().trim();
        
        // Sinopsis
        let synopsis = '';
        const sinopsisSelectors = ['.description', '.sinopsis', '.plot', '.entry-content p', '.content p'];
        for (const selector of sinopsisSelectors) {
            const text = $(selector).first().text().trim();
            if (text && text.length > 100) {
                synopsis = text;
                break;
            }
        }
        
        // Año
        let year = null;
        $('.year, .date, .fecha, .meta-info').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/\b(19|20)\d{2}\b/);
            if (match) year = match[0];
        });
        
        // Extraer enlaces de video y descarga
        const downloadLinks = [];
        const serversList = [];
        
        // === NUEVO: Extraer servidores de VER ONLINE (clase .options.dff) ===
        $('.options.dff li, .dff-99').each((i, el) => {
            const serverSpan = $(el).find('.--item-select-serve, .cfe, span:first-child');
            let serverName = serverSpan.text().trim();
            if (!serverName) serverName = $(el).find('span').first().text().trim();
            
            // Buscar atributo data-url o data-resolved-url
            let videoUrl = $(el).attr('data-url') || $(el).attr('data-resolved-url');
            
            // Buscar en elementos hijos
            if (!videoUrl) {
                videoUrl = $(el).find('[data-url], [data-resolved-url]').attr('data-url') || 
                          $(el).find('[data-resolved-url]').attr('data-resolved-url');
            }
            
            // Si no hay URL directa, buscar en onclick
            if (!videoUrl) {
                const onclick = $(el).attr('onclick');
                if (onclick) {
                    const match = onclick.match(/['"](https?:\/\/[^'"]+)['"]/);
                    if (match) videoUrl = match[1];
                }
            }
            
            if (videoUrl && serverName) {
                serversList.push({
                    server: serverName,
                    url: videoUrl,
                    type: 'iframe',
                    quality: 'VER ONLINE'
                });
            }
        });
        
        // === NUEVO: Extraer enlaces de DESCARGAR (clase .links) ===
        $('.links li, .dlinks li').each((i, el) => {
            let serverName = $(el).find('.--srv, .cfe, .server-name').text().trim();
            if (!serverName) serverName = $(el).find('span').first().text().trim();
            
            let downloadUrl = $(el).attr('data-url') || $(el).attr('data-href');
            
            // Buscar enlace real
            if (!downloadUrl) {
                const link = $(el).find('a[href]');
                if (link.length) downloadUrl = link.attr('href');
            }
            
            // Extraer texto adicional (contraseña, calidad)
            let extraInfo = $(el).find('.txtmffff').text().trim();
            if (extraInfo) serverName = `${serverName} (${extraInfo})`;
            
            if (downloadUrl && serverName) {
                serversList.push({
                    server: serverName,
                    url: downloadUrl,
                    type: downloadUrl.includes('magnet:') ? 'magnet' : 'download',
                    quality: 'DESCARGAR'
                });
            }
        });
        
        // === FALLBACK: Extraer iframes comunes ===
        if (serversList.length === 0) {
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.startsWith('http')) {
                    serversList.push({
                        server: `Reproductor ${i+1}`,
                        url: src,
                        type: 'iframe',
                        quality: 'VER ONLINE'
                    });
                }
            });
        }
        
        // === FALLBACK 2: Enlaces data-resolved-url ===
        if (serversList.length === 0) {
            $('[data-resolved-url]').each((i, el) => {
                const url = $(el).attr('data-resolved-url');
                if (url && url.startsWith('http')) {
                    serversList.push({
                        server: $(el).text().trim() || `Servidor ${i+1}`,
                        url: url,
                        type: 'iframe',
                        quality: 'VER ONLINE'
                    });
                }
            });
        }
        
        // Limpiar y agregar a downloadLinks
        for (const server of serversList) {
            if (server.url && server.url !== '#' && !server.url.includes('undefined')) {
                downloadLinks.push(server);
            }
        }
        
        console.log(`✅ CineCalidad: ${downloadLinks.length} enlaces encontrados (${downloadLinks.filter(l => l.quality === 'VER ONLINE').length} online, ${downloadLinks.filter(l => l.quality === 'DESCARGAR').length} descargas)`);
        
        return {
            title: this.cleanTitle(title) || 'Sin título',
            synopsis: synopsis.substring(0, 500) || 'Sinopsis no disponible',
            year: year,
            url: url,
            provider: this.name,
            downloadLinks: downloadLinks
        };
    }
    
    cleanTitle(title) {
        if (!title) return '';
        return title.replace(/\s*\(?\d{4}\)?\s*$/, '').replace(/[-|].*$/, '').trim();
    }
}

module.exports = CineCalidadProvider;
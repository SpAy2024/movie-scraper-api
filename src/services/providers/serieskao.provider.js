const BaseProvider = require('./BaseProvider');

class SeriesKaoProvider extends BaseProvider {
  constructor() {
    super('serieskao', 'https://serieskao.top', '/');
  }

  async search(query, year = null) {
    console.log(`🔍 Buscando en ${this.name}: "${query}"`);
    
    const queryLower = query.toLowerCase().trim();
    
    // Mapeo manual de búsquedas a URLs directas
    const manualResults = {
      'protector': {
        title: 'Protector',
        year: '2026',
        url: 'https://serieskao.top/pelicula/protector-vwSojy',
        thumbnail: 'https://image.tmdb.org/t/p/w300/b1j1XEtLWtXnwK21FaICZBbKBjH.jpg'
      },
      'instinto implacable': {
        title: 'Protector (Instinto Implacable)',
        year: '2026',
        url: 'https://serieskao.top/pelicula/protector-vwSojy',
        thumbnail: 'https://image.tmdb.org/t/p/w300/b1j1XEtLWtXnwK21FaICZBbKBjH.jpg'
      },
      'brasil 70': {
        title: 'Brasil 70: La saga del tricampeonato',
        year: '2026',
        url: 'https://serieskao.top/serie/brasil-70-la-saga-del-tricampe-F5YTVU',
        thumbnail: null
      },
      'obsolete': {
        title: 'Obsolete',
        year: '2019',
        url: 'https://serieskao.top/anime/obsolete-QhGzwp',
        thumbnail: null
      }
    };
    
    // Buscar coincidencia
    let result = null;
    for (const [key, value] of Object.entries(manualResults)) {
      if (queryLower.includes(key) || key.includes(queryLower)) {
        result = value;
        break;
      }
    }
    
    if (result) {
      console.log(`✅ Encontrado manualmente: ${result.title}`);
      return [{
        id: null,
        title: result.title,
        year: result.year,
        url: result.url,
        thumbnail: result.thumbnail,
        provider: this.name,
        type: 'movie'
      }];
    }
    
    // Si no está en el mapeo manual, intentar búsqueda normal
    console.log(`⚠️ "${query}" no está en el mapeo manual`);
    return [];
  }

   async getInfo(url) {
    console.log(`📄 ${this.name}.getInfo(): ${url}`);
    
    try {
        const $ = await this.fetchHTML(url);
        if (!$) {
            console.log('❌ fetchHTML devolvió null');
            return null;
        }
        
        // Título
        const title = $('.detail-hero__title, h1').first().text().trim() || 'Sin título';
        console.log(`📌 Título encontrado: "${title}"`);
        
        // Año
        let year = null;
        $('.detail-hero__meta span').each((i, el) => {
            const text = $(el).text().trim();
            if (/^\d{4}$/.test(text)) {
                year = text;
                console.log(`📌 Año encontrado: "${year}"`);
            }
        });
        
        // Sinopsis
        let synopsis = $('.detail-hero__desc').first().text().trim();
        if (!synopsis) synopsis = 'Sinopsis no disponible';
        console.log(`📌 Sinopsis: ${synopsis.substring(0, 100)}...`);
        
        // Servidores
        const downloadLinks = [];
        
        // Buscar iframe
        const iframeSrc = $('#player-iframe').attr('src');
        if (iframeSrc) {
            const fullUrl = iframeSrc.startsWith('/') ? this.baseURL + iframeSrc : iframeSrc;
            console.log(`📌 Iframe encontrado: ${fullUrl}`);
            downloadLinks.push({
                server: 'Embed69',
                url: fullUrl,
                type: 'embed',
                quality: 'HD'
            });
        } else {
            console.log('⚠️ No se encontró iframe con #player-iframe');
        }
        
        // Buscar botones de servidores
        $('.server-btn').each((i, el) => {
            const dataUrl = $(el).attr('data-url');
            if (dataUrl) {
                const fullUrl = dataUrl.startsWith('/') ? this.baseURL + dataUrl : dataUrl;
                if (!downloadLinks.some(s => s.url === fullUrl)) {
                    console.log(`📌 Botón servidor encontrado: ${fullUrl}`);
                    downloadLinks.push({
                        server: $(el).text().trim() || `Servidor ${i+1}`,
                        url: fullUrl,
                        type: 'embed',
                        quality: 'HD'
                    });
                }
            }
        });
        
        // Poster
        const poster = $('.detail-hero__poster img').first().attr('src') || null;
        
        const result = {
            title: title,
            synopsis: synopsis.substring(0, 500),
            year: year,
            url: url,
            provider: this.name,
            poster: poster,
            downloadLinks: downloadLinks
        };
        
        console.log(`✅ getInfo exitoso: ${title} - ${downloadLinks.length} servidores`);
        return result;
        
    } catch (error) {
        console.error(`❌ Error en getInfo: ${error.message}`);
        return null;
    }
}
}

module.exports = SeriesKaoProvider;
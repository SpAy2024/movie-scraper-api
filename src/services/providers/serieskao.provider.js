const BaseProvider = require('./BaseProvider');

class SeriesKaoProvider extends BaseProvider {
  constructor() {
    super('serieskao', 'https://serieskao.top', '/');
    
    // Mapeo EXACTO - AÑADIR MÁS TÍTULOS
    this.directUrls = {
      'protector': 'protector-vwSojy',
      'instinto implacable': 'protector-vwSojy',
      'instinto implacable 2026': 'protector-vwSojy',
      'brasil 70': 'brasil-70-la-saga-del-tricampe-F5YTVU',
      'obsolete': 'obsolete-QhGzwp',
      'la canción del samurái': 'la-cancion-del-samurai-VHYQJi',
      'cancion del samurai': 'la-cancion-del-samurai-VHYQJi'
    };
  }

  async search(query, year = null) {
    console.log(`🔍 Buscando en ${this.name}: "${query}"`);
    
    const queryLower = query.toLowerCase().trim();
    const movies = [];
    
    // Mostrar todos los mapeos disponibles para debug
    console.log(`   📋 Mapeos disponibles: ${Object.keys(this.directUrls).join(', ')}`);
    
    // Buscar slug en el mapeo (coincidencia exacta o parcial)
    let slug = null;
    
    // Primero coincidencia exacta
    if (this.directUrls[queryLower]) {
      slug = this.directUrls[queryLower];
      console.log(`   🎯 Coincidencia exacta: "${queryLower}" -> ${slug}`);
    } else {
      // Coincidencia parcial
      for (const [key, value] of Object.entries(this.directUrls)) {
        if (queryLower.includes(key) || key.includes(queryLower)) {
          slug = value;
          console.log(`   🎯 Coincidencia parcial: "${key}" -> ${slug}`);
          break;
        }
      }
    }
    
    if (!slug) {
      console.log(`❌ No hay mapeo para: "${queryLower}"`);
      console.log(`   💡 Sugerencia: Agrega "${queryLower}" al mapeo directUrls`);
      return [];
    }
    
    const directUrl = `${this.baseURL}/pelicula/${slug}`;
    console.log(`🌐 Probando URL directa: ${directUrl}`);
    
    try {
      const $ = await this.fetchHTML(directUrl);
      
      if ($) {
        const title = $('.detail-hero__title, h1').first().text().trim();
        console.log(`   📌 Título encontrado en página: "${title}"`);
        
        if (title && title.length > 2) {
          console.log(`✅ Encontrado: ${title}`);
          
          let itemYear = null;
          $('.detail-hero__meta span').each((i, el) => {
            const text = $(el).text().trim();
            if (/^\d{4}$/.test(text)) itemYear = text;
          });
          
          const thumbnail = $('.detail-hero__poster img').first().attr('src');
          
          movies.push({
            id: null,
            title: title,
            year: itemYear || year,
            url: directUrl,
            thumbnail: thumbnail,
            provider: this.name,
            type: 'movie'
          });
          
          console.log(`   ✅ Película agregada: ${title}`);
          return movies;
        } else {
          console.log(`   ❌ Título vacío o página no válida`);
        }
      } else {
        console.log(`   ❌ fetchHTML devolvió null`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(`❌ No se pudo encontrar "${query}" en SeriesKao`);
    return [];
  }

  async getInfo(url) {
    console.log(`📄 ${this.name}.getInfo(): ${url}`);
    const $ = await this.fetchHTML(url);
    if (!$) return null;
    
    const title = $('.detail-hero__title, h1').first().text().trim() || 'Sin título';
    
    let year = null;
    $('.detail-hero__meta span').each((i, el) => {
      const text = $(el).text().trim();
      if (/^\d{4}$/.test(text)) year = text;
    });
    
    const synopsis = $('.detail-hero__desc').first().text().trim() || 'Sinopsis no disponible';
    
    const downloadLinks = [];
    const iframeSrc = $('#player-iframe').attr('src');
    if (iframeSrc) {
      downloadLinks.push({
        server: 'Embed69',
        url: iframeSrc.startsWith('/') ? this.baseURL + iframeSrc : iframeSrc,
        type: 'embed',
        quality: 'HD'
      });
    }
    
    $('.server-btn').each((i, el) => {
      const dataUrl = $(el).attr('data-url');
      if (dataUrl) {
        const fullUrl = dataUrl.startsWith('/') ? this.baseURL + dataUrl : dataUrl;
        if (!downloadLinks.some(s => s.url === fullUrl)) {
          downloadLinks.push({
            server: $(el).text().trim() || `Servidor ${i+1}`,
            url: fullUrl,
            type: 'embed',
            quality: 'HD'
          });
        }
      }
    });
    
    const poster = $('.detail-hero__poster img').first().attr('src') || null;
    
    return {
      title: title,
      synopsis: synopsis.substring(0, 500),
      year: year,
      url: url,
      provider: this.name,
      poster: poster,
      downloadLinks: downloadLinks
    };
  }
}

module.exports = SeriesKaoProvider;
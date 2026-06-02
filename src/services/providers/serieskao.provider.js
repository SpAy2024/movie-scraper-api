const BaseProvider = require('./BaseProvider');

class SeriesKaoProvider extends BaseProvider {
  constructor() {
    super('serieskao', 'https://serieskao.top', '/');
    
    // Mapeo de títulos a URLs directas (slug real)
    this.directUrls = {
      'protector': 'protector-vwSojy',
      'instinto implacable': 'protector-vwSojy',
      'brasil 70': 'brasil-70-la-saga-del-tricampe-F5YTVU',
      'obsolete': 'obsolete-QhGzwp',
      'canción del samurái': 'la-cancion-del-samurai-VHYQJi'
    };
  }

  async search(query, year = null) {
    console.log(`🔍 Buscando en ${this.name}: "${query}"`);
    
    const queryLower = query.toLowerCase().trim();
    const movies = [];
    
    // 1. Buscar en el mapeo de URLs directas
    let slug = null;
    for (const [key, value] of Object.entries(this.directUrls)) {
      if (queryLower === key || queryLower.includes(key)) {
        slug = value;
        console.log(`   🎯 Mapeo encontrado: "${key}" -> ${slug}`);
        break;
      }
    }
    
    // 2. Si no hay mapeo, generar slug automático
    if (!slug) {
      slug = this.generateSlug(queryLower);
    }
    
    // 3. Probar URL directa
    const directUrl = `${this.baseURL}/pelicula/${slug}`;
    console.log(`🌐 Probando URL directa: ${directUrl}`);
    
    const $ = await this.fetchHTML(directUrl);
    
    if ($) {
      const title = $('.detail-hero__title, h1').first().text().trim();
      const has404 = $('body').text().includes('404') || $('body').text().includes('No encontrado');
      
      if (title && !has404 && title.length > 2) {
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
          year: itemYear,
          url: directUrl,
          thumbnail: thumbnail,
          provider: this.name,
          type: 'movie',
          relevance: 100
        });
        
        return movies;
      }
    }
    
    console.log(`⚠️ No se encontró "${query}" en SeriesKao`);
    return [];
  }
  
  generateSlug(text) {
    if (!text) return '';
    
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
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
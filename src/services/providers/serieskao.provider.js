const BaseProvider = require('./BaseProvider');

class SeriesKaoProvider extends BaseProvider {
  constructor() {
    super('serieskao', 'https://serieskao.top', '/');
  }

  async search(query, year = null) {
    console.log(`🔍 Buscando en ${this.name}: "${query}"`);
    
    // Construir slug a partir de la consulta
    const slug = this.generateSlug(query);
    const directUrl = `${this.baseURL}/pelicula/${slug}`;
    
    console.log(`🌐 Probando URL: ${directUrl}`);
    
    const $ = await this.fetchHTML(directUrl);
    
    if ($) {
      const title = $('.detail-hero__title, h1').first().text().trim();
      const errorMsg = $('body').text().includes('404') || $('body').text().includes('No encontrado');
      
      if (title && !errorMsg && title.length > 2) {
        console.log(`✅ Encontrada: ${title}`);
        
        let itemYear = null;
        $('.detail-hero__meta span').each((i, el) => {
          const text = $(el).text().trim();
          if (/^\d{4}$/.test(text)) itemYear = text;
        });
        
        const thumbnail = $('.detail-hero__poster img').first().attr('src');
        
        return [{
          id: slug,
          title: title,
          year: itemYear || year,
          url: directUrl,
          thumbnail: thumbnail,
          provider: this.name,
          type: 'movie'
        }];
      }
    }
    
    console.log(`❌ No encontrada: "${query}"`);
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

  generateSlug(text) {
    if (!text) return '';
    
    // Casos especiales conocidos
    const specials = {
      'protector': 'protector-vwSojy',
      'instinto implacable': 'protector-vwSojy',
      'batman': 'batman-el-caballero-de-la-noche',  // ejemplo
      'spiderman': 'spiderman-no-way-home',
      'thor': 'thor-amor-y-trueno'
    };
    
    const lowerText = text.toLowerCase().trim();
    if (specials[lowerText]) return specials[lowerText];
    
    // Generar slug automático
    return lowerText
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

module.exports = SeriesKaoProvider;
const BaseProvider = require('./BaseProvider');

class SeriesKaoProvider extends BaseProvider {
  constructor() {
    super('serieskao', 'https://serieskao.top', '/');
  }

  async search(query, year = null) {
    console.log(`🔍 Buscando en ${this.name}: "${query}"`);
    
    // Generar slug a partir de la consulta
    const slug = this.generateSlug(query);
    
    // Construir URL directa de la película
    const directUrl = `${this.baseURL}/pelicula/${slug}`;
    console.log(`🌐 Probando URL directa: ${directUrl}`);
    
    const $ = await this.fetchHTML(directUrl);
    
    if ($) {
      // Verificar si la página existe (no es 404)
      const title = $('h1').first().text().trim();
      const errorMsg = $('body').text().includes('404') || $('body').text().includes('No encontrado');
      
      if (title && !errorMsg && title.length > 2) {
        console.log(`✅ Encontrado: ${title}`);
        
        // Extraer año
        let itemYear = null;
        const yearMatch = title.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) itemYear = yearMatch[0];
        
        // Extraer thumbnail
        let thumbnail = $('.detail-hero__poster img').first().attr('src');
        if (!thumbnail) thumbnail = $('img').first().attr('src');
        
        return [{
          id: null,
          title: title,
          year: itemYear || year,
          url: directUrl,
          thumbnail: thumbnail,
          provider: this.name,
          type: 'movie',
          relevance: 100
        }];
      }
    }
    
    // Si no se encuentra con el slug directo, intentar búsqueda normal
    console.log(`⚠️ No encontrado con URL directa, intentando búsqueda...`);
    return await this.searchViaApi(query, year);
  }
  
  async searchViaApi(query, year = null) {
    const searchUrl = `${this.baseURL}/search?s=${encodeURIComponent(query)}`;
    console.log(`🔍 Buscando vía API: ${searchUrl}`);
    
    const $ = await this.fetchHTML(searchUrl);
    if (!$) return [];
    
    const movies = [];
    const queryLower = query.toLowerCase();
    
    // Buscar enlaces a películas
    $('a[href*="/pelicula/"]').each((i, el) => {
      let url = $(el).attr('href');
      if (!url || !url.includes('/pelicula/')) return;
      
      let title = $(el).find('.card__title, h4, h3').text().trim();
      if (!title) title = $(el).attr('title');
      if (!title) title = $(el).text().trim();
      
      if (title && title.toLowerCase().includes(queryLower)) {
        const fullUrl = url.startsWith('http') ? url : this.baseURL + url;
        movies.push({
          id: null,
          title: title,
          year: null,
          url: fullUrl,
          thumbnail: $(el).find('img').first().attr('src'),
          provider: this.name,
          type: 'movie'
        });
      }
    });
    
    console.log(`✅ ${this.name}: ${movies.length} resultados por búsqueda`);
    return movies;
  }
  
  generateSlug(text) {
    if (!text) return '';
    
    // Normalizar: minúsculas, sin acentos, espacios a guiones
    let slug = text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Casos especiales
    const specialCases = {
      'protector': 'protector-vwSojy',
      'instinto-implacable': 'protector-vwSojy',
      'brasil-70-la-saga-del-tricampeonato': 'brasil-70-la-saga-del-tricampe-F5YTVU'
    };
    
    if (specialCases[slug]) {
      console.log(`   🎯 Usando slug especial: ${specialCases[slug]}`);
      return specialCases[slug];
    }
    
    return slug;
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
const BaseProvider = require('./BaseProvider');

class SeriesKaoProvider extends BaseProvider {
  constructor() {
    super('serieskao', 'https://serieskao.top', '/');
  }

  async search(query, year = null) {
    console.log(`🔍 Buscando en ${this.name}: "${query}"`);
    
    // Usar el buscador de SeriesKao
    const searchUrl = `${this.baseURL}/search?s=${encodeURIComponent(query)}`;
    console.log(`🌐 Buscando en: ${searchUrl}`);
    
    const $ = await this.fetchHTML(searchUrl);
    if (!$) {
      console.log('❌ No se pudo cargar la página de búsqueda');
      return [];
    }
    
    const movies = [];
    const queryLower = query.toLowerCase();
    
    // Buscar enlaces a películas
    $('a[href*="/pelicula/"]').each((i, el) => {
      let url = $(el).attr('href');
      if (!url || !url.includes('/pelicula/')) return;
      
      let title = $(el).find('.card__title, h4, h3').text().trim();
      if (!title) title = $(el).attr('title');
      if (!title) title = $(el).find('img').attr('alt');
      if (!title) return;
      
      // Verificar que el título coincida con la búsqueda
      if (title.toLowerCase().includes(queryLower) || queryLower.includes(title.toLowerCase())) {
        const fullUrl = url.startsWith('http') ? url : this.baseURL + url;
        const thumbnail = $(el).find('img').first().attr('src');
        
        // Extraer año si está disponible
        let itemYear = null;
        const yearMatch = title.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) itemYear = yearMatch[0];
        
        console.log(`   ✅ Encontrada: ${title}`);
        
        movies.push({
          id: null,
          title: title,
          year: itemYear,
          url: fullUrl,
          thumbnail: thumbnail,
          provider: this.name,
          type: 'movie'
        });
      }
    });
    
    console.log(`✅ ${this.name}: ${movies.length} resultados`);
    return movies;
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
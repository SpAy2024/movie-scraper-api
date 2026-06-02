const BaseProvider = require('./BaseProvider');

class CineCalidadProvider extends BaseProvider {
  constructor() {
    super('cinecalidad', 'https://www.cinecalidad.ec', '/ver-pelicula/');
    
    this.domains = [
      'https://www.cinecalidad.ec',
      'https://www.cinecalidad.rs',
      'https://cinecalidad.onl',
      'https://www.cinecalidad.am'
    ];
  }
  
  isExactMatch(title, query, year = null, resultYear = null) {
    if (!title || !query) return false;
    
    const normalize = (str) => {
      return str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const normalizedTitle = normalize(title);
    const normalizedQuery = normalize(query);
    
    if (normalizedTitle === normalizedQuery) {
      console.log(`   ✅ EXACTO: "${title}" === "${query}"`);
      return true;
    }
    
    if (year && resultYear) {
      const titleWithYear = `${normalizedTitle} ${resultYear}`;
      const queryWithYear = `${normalizedQuery} ${year}`;
      if (titleWithYear === queryWithYear) {
        console.log(`   ✅ EXACTO (con año): "${title}" (${resultYear}) === "${query}" (${year})`);
        return true;
      }
    }
    
    return false;
  }
  
  async search(query, year = null) {
    for (const domain of this.domains) {
      const searchUrl = `${domain}/?s=${encodeURIComponent(query)}`;
      console.log(`🔍 Buscando en ${domain}: ${searchUrl}`);
      
      const $ = await this.fetchHTML(searchUrl);
      if (!$) continue;
      
      const movies = [];
      
      $('a[href*="/ver-pelicula/"], a[href*="/pelicula/"]').each((i, el) => {
        let url = $(el).attr('href');
        if (!url) return;
        
        if (url.startsWith('/')) url = domain + url;
        
        if (url.includes('/ver-pelicula/') || url.includes('/pelicula/')) {
          let title = $(el).find('h3, .title, .entry-title').text().trim();
          if (!title) title = $(el).text().trim();
          title = title.replace(/HD|FULL/gi, '').trim();
          
          let itemYear = null;
          const yearMatch = title.match(/\b(19|20)\d{2}\b/);
          if (yearMatch) itemYear = yearMatch[0];
          title = title.replace(/\s*\(?\b(19|20)\d{2}\b\)?\s*$/, '').trim();
          
          const isExact = this.isExactMatch(title, query, year, itemYear);
          
          if (isExact && title.length > 2) {
            movies.push({
              id: this.extractId(url),
              title: title,
              year: itemYear,
              url: url,
              thumbnail: $(el).find('img').attr('src') || null,
              provider: this.name,
              type: 'movie'
            });
          }
        }
      });
      
      if (movies.length > 0) {
        console.log(`✅ ${this.name}: ${movies.length} resultados en ${domain}`);
        return movies;
      }
    }
    
    console.log(`⚠️ ${this.name}: No se encontraron resultados`);
    return [];
  }
  
  async getInfo(url) {
    console.log(`📄 ${this.name}.getInfo(): ${url}`);
    const $ = await this.fetchHTML(url);
    if (!$) return null;
    
    const title = $('h1').first().text().trim() || 'Sin título';
    
    let year = null;
    $('.year, .date, .fecha').each((i, el) => {
      const text = $(el).text();
      const match = text.match(/\b(19|20)\d{2}\b/);
      if (match) year = match[0];
    });
    
    let synopsis = '';
    $('.description, .sinopsis, .plot').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 100 && !synopsis) synopsis = text;
    });
    
    const downloadLinks = [];
    
    $('iframe').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) {
        downloadLinks.push({
          server: 'Reproductor',
          url: src,
          type: 'iframe',
          quality: 'VER ONLINE'
        });
      }
    });
    
    $('[data-resolved-url]').each((i, el) => {
      const dataUrl = $(el).attr('data-resolved-url');
      if (dataUrl && dataUrl.startsWith('http')) {
        downloadLinks.push({
          server: $(el).text().trim() || 'Servidor',
          url: dataUrl,
          type: 'iframe',
          quality: 'VER ONLINE'
        });
      }
    });
    
    let poster = null;
    const posterImg = $('.poster img').attr('src');
    if (posterImg) poster = posterImg;
    
    return {
      title: title,
      synopsis: synopsis.substring(0, 500) || 'Sinopsis no disponible',
      year: year,
      url: url,
      provider: this.name,
      poster: poster,
      downloadLinks: downloadLinks
    };
  }
}

module.exports = CineCalidadProvider;
const BaseProvider = require('./BaseProvider');

class SeriesKaoProvider extends BaseProvider {
  constructor() {
    super('serieskao', 'https://serieskao.top', '/');
    
    this.domains = [
      'https://serieskao.top',
      'https://www.serieskao.top'
    ];
    
    // Tipos de contenido que maneja
    this.contentTypes = {
      movie: '/pelicula/',
      serie: '/serie/',
      anime: '/anime/',
      dorama: '/dorama/'
    };
  }

  isExactMatch(title, query, year = null, resultYear = null) {
    if (!title || !query) return false;
    
    const normalize = (str) => {
      return str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/^(el |la |los |las |un |una |unos |unas )/i, '')
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
    const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(query)}`;
    console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
    
    const $ = await this.fetchHTML(searchUrl);
    if (!$) return [];

    const movies = [];
    const queryLower = query.toLowerCase();
    
    // Buscar en todos los tipos de contenido
    const contentSelectors = [
      'a[href*="/pelicula/"]',
      'a[href*="/serie/"]',
      'a[href*="/anime/"]',
      'a[href*="/dorama/"]',
      'article a',
      '.item a'
    ];
    
    for (const selector of contentSelectors) {
      $(selector).each((i, el) => {
        let url = $(el).attr('href');
        if (!url) return;
        
        // Verificar qué tipo de contenido es
        let contentType = 'movie';
        if (url.includes('/serie/')) contentType = 'serie';
        else if (url.includes('/anime/')) contentType = 'anime';
        else if (url.includes('/dorama/')) contentType = 'dorama';
        else if (!url.includes('/pelicula/')) return;
        
        let title = $(el).find('h3, .title, .entry-title').text().trim();
        if (!title) title = $(el).attr('title') || $(el).text().trim();
        if (!title) return;
        
        title = title.replace(/\s*\|\s*SeriesKao$/, '').trim();
        
        let itemYear = null;
        const yearMatch = title.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) itemYear = yearMatch[0];
        title = title.replace(/\s*\(?\b(19|20)\d{2}\b\)?\s*$/, '').trim();
        
        const isExact = this.isExactMatch(title, query, year, itemYear);
        
        if (isExact && title.length > 2) {
          const fullUrl = url.startsWith('http') ? url : this.baseURL + url;
          
          movies.push({
            id: this.extractId(url),
            title: title,
            year: itemYear,
            url: fullUrl,
            thumbnail: $(el).find('img').attr('src') || null,
            provider: this.name,
            type: contentType
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
    
    console.log(`✅ ${this.name}: ${uniqueMovies.length} resultados`);
    return uniqueMovies;
  }

  async getInfo(url) {
    console.log(`📄 ${this.name}.getInfo(): ${url}`);
    const $ = await this.fetchHTML(url);
    if (!$) return null;
    
    // Detectar tipo de contenido
    let contentType = 'movie';
    if (url.includes('/serie/')) contentType = 'serie';
    else if (url.includes('/anime/')) contentType = 'anime';
    else if (url.includes('/dorama/')) contentType = 'dorama';
    
    // Título
    let title = $('h1').first().text().trim();
    if (!title) title = $('.title, .entry-title').first().text().trim();
    title = title.replace(/\s*\|\s*SeriesKao$/, '').trim();
    
    // Año
    let year = null;
    $('.year, .date, .fecha, .meta-info').each((i, el) => {
      const text = $(el).text();
      const match = text.match(/\b(19|20)\d{2}\b/);
      if (match) year = match[0];
    });
    
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
    
    // ============================================================
    // EXTRACCIÓN DE SERVIDORES DE VIDEO (Embed69)
    // ============================================================
    const downloadLinks = [];
    
    // Método 1: Buscar botones .server-btn con data-url
    $('.server-btn, [data-url]').each((i, el) => {
      let videoUrl = $(el).attr('data-url');
      if (!videoUrl) videoUrl = $(el).attr('href');
      
      if (videoUrl && videoUrl.includes('/vidurl/')) {
        const fullUrl = videoUrl.startsWith('/') ? this.baseURL + videoUrl : videoUrl;
        const serverName = $(el).text().trim() || `Servidor ${i + 1}`;
        
        downloadLinks.push({
          server: serverName,
          url: fullUrl,
          type: 'link',
          quality: 'HD',
          note: 'Abre este enlace en tu navegador para ver el contenido'
        });
      }
    });
    
    // Método 2: Buscar iframe del reproductor
    $('#player-iframe, .player-box__frame iframe, iframe[src*="/vidurl/"]').each((i, el) => {
      let src = $(el).attr('src');
      if (src && src.includes('/vidurl/')) {
        const fullUrl = src.startsWith('/') ? this.baseURL + src : src;
        if (!downloadLinks.some(s => s.url === fullUrl)) {
          downloadLinks.push({
            server: 'Reproductor Embed69',
            url: fullUrl,
            type: 'link',
            quality: 'HD'
          });
        }
      }
    });
    
    // Método 3: Para series, buscar estructura de episodios
    if (contentType === 'serie' || contentType === 'anime' || contentType === 'dorama') {
      const episodes = [];
      
      $('.episodes-list a, .episodios a, .capitulos a, .ep-list a').each((i, el) => {
        const episodeUrl = $(el).attr('href');
        const episodeNum = $(el).find('.episode-number, .num').text().trim() || i + 1;
        const episodeTitle = $(el).find('.title').text().trim() || `Episodio ${episodeNum}`;
        
        if (episodeUrl) {
          episodes.push({
            number: episodeNum,
            title: episodeTitle,
            url: episodeUrl.startsWith('http') ? episodeUrl : this.baseURL + episodeUrl
          });
        }
      });
      
      if (episodes.length > 0) {
        downloadLinks.push({
          server: 'Lista de Episodios',
          episodes: episodes,
          type: 'episodes',
          quality: 'HD'
        });
      }
    }
    
    // Si no se encontraron servidores, devolver la URL original
    if (downloadLinks.length === 0) {
      downloadLinks.push({
        server: `Ver en ${contentType.toUpperCase()}`,
        url: url,
        type: 'link',
        quality: 'HD',
        note: 'Visita la página directamente para ver el contenido'
      });
    }
    
    // Poster
    let poster = null;
    const posterImg = $('.poster img, .thumbnail img, .entry-image img').attr('src');
    if (posterImg) poster = posterImg;
    
    console.log(`✅ ${this.name}: ${downloadLinks.length} enlaces encontrados`);
    
    return {
      title: title || 'Sin título',
      synopsis: synopsis.substring(0, 600) || 'Sinopsis no disponible',
      year: year,
      url: url,
      provider: this.name,
      type: contentType,
      poster: poster,
      downloadLinks: downloadLinks
    };
  }
}

module.exports = SeriesKaoProvider;
const BaseProvider = require('./BaseProvider');

class SeriesKaoProvider extends BaseProvider {
  constructor() {
    super('serieskao', 'https://serieskao.top', '/');
    
    this.domains = [
      'https://serieskao.top',
      'https://www.serieskao.top'
    ];
  }

  // Normalizar texto para comparación exacta
  normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isExactMatch(title, query, year = null, resultYear = null) {
    if (!title || !query) return false;
    
    const normalizedTitle = this.normalizeText(title);
    const normalizedQuery = this.normalizeText(query);
    
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
    // SeriesKao usa /search?s=query (no /?s=query)
    const searchUrl = `${this.baseURL}/search?s=${encodeURIComponent(query)}`;
    console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
    
    const $ = await this.fetchHTML(searchUrl);
    if (!$) return [];

    const movies = [];
    const queryLower = this.normalizeText(query);
    
    // Buscar en los resultados de búsqueda - usando las clases reales del sitio
    $('.card, article.card, .grid--cards .card, a[href*="/pelicula/"], a[href*="/serie/"], a[href*="/anime/"]').each((i, el) => {
      let url = $(el).attr('href');
      if (!url) return;
      
      // Determinar tipo de contenido
      let contentType = 'movie';
      if (url.includes('/serie/')) contentType = 'serie';
      else if (url.includes('/anime/')) contentType = 'anime';
      else if (url.includes('/generos/dorama')) contentType = 'dorama';
      else if (!url.includes('/pelicula/') && !url.includes('/serie/') && !url.includes('/anime/')) return;
      
      // Extraer título
      let title = $(el).find('.card__title, h4, h3').text().trim();
      if (!title) title = $(el).attr('title') || $(el).find('img').attr('alt');
      if (!title) return;
      
      // Extraer año del badge
      let itemYear = null;
      const yearBadge = $(el).find('.card__badge--year, .year').text().trim();
      if (yearBadge) {
        const yearMatch = yearBadge.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) itemYear = yearMatch[0];
      }
      
      const normalizedTitle = this.normalizeText(title);
      const isExact = (normalizedTitle === queryLower);
      
      if (isExact && title.length > 2) {
        const fullUrl = url.startsWith('http') ? url : this.baseURL + url;
        
        movies.push({
          id: null,
          title: title,
          year: itemYear,
          url: fullUrl,
          thumbnail: $(el).find('img').first().attr('src') || null,
          provider: this.name,
          type: contentType
        });
      }
    });
    
    // Eliminar duplicados
    const uniqueMovies = [];
    const seenUrls = new Set();
    for (const movie of movies) {
      if (!seenUrls.has(movie.url)) {
        seenUrls.add(movie.url);
        uniqueMovies.push(movie);
      }
    }
    
    console.log(`✅ ${this.name}: ${uniqueMovies.length} resultados exactos`);
    return uniqueMovies;
  }

  async getInfo(url) {
    console.log(`📄 ${this.name}.getInfo(): ${url}`);
    const $ = await this.fetchHTML(url);
    if (!$) return null;
    
    // Detectar tipo de contenido por la URL
    let contentType = 'movie';
    if (url.includes('/serie/')) contentType = 'serie';
    else if (url.includes('/anime/')) contentType = 'anime';
    else if (url.includes('/dorama/')) contentType = 'dorama';
    
    // Título
    let title = $('.detail-hero__title, h1').first().text().trim();
    if (!title) title = $('meta[property="og:title"]').attr('content')?.replace(' - SeriesKao', '') || 'Sin título';
    
    // Año
    let year = null;
    $('.detail-hero__meta span, .year').each((i, el) => {
      const text = $(el).text();
      const match = text.match(/\b(19|20)\d{2}\b/);
      if (match) year = match[0];
    });
    
    // Sinopsis
    let synopsis = $('.detail-hero__desc, .description, meta[name="description"]').first().text().trim();
    if (!synopsis) synopsis = $('meta[property="og:description"]').attr('content') || 'Sinopsis no disponible';
    
    // Rating
    let rating = null;
    $('.detail-hero__rating').each((i, el) => {
      const text = $(el).text().trim();
      const match = text.match(/(\d+(?:\.\d+)?)/);
      if (match) rating = match[1];
    });
    
    // ============================================================
    // EXTRACCIÓN DE SERVIDORES
    // ============================================================
    const downloadLinks = [];
    
    // Buscar botones de servidores (Embed69)
    $('.server-btn, .player-box__servers button').each((i, el) => {
      const dataUrl = $(el).attr('data-url');
      const serverName = $(el).text().trim() || 'Servidor';
      
      if (dataUrl) {
        const fullUrl = dataUrl.startsWith('/') ? this.baseURL + dataUrl : dataUrl;
        downloadLinks.push({
          server: serverName,
          url: fullUrl,
          type: 'embed',
          quality: 'HD'
        });
      }
    });
    
    // Buscar iframe del reproductor
    $('#player-iframe, .player-box__frame iframe').each((i, el) => {
      let src = $(el).attr('src');
      if (src && src.includes('/vidurl/')) {
        const fullUrl = src.startsWith('/') ? this.baseURL + src : src;
        if (!downloadLinks.some(s => s.url === fullUrl)) {
          downloadLinks.push({
            server: 'Reproductor Embed69',
            url: fullUrl,
            type: 'embed',
            quality: 'HD'
          });
        }
      }
    });
    
    // Para series/animes: extraer lista de episodios
    if (contentType === 'serie' || contentType === 'anime') {
      const episodes = [];
      $('.episodes-list a.episode-item, .episodios a').each((i, el) => {
        const episodeUrl = $(el).attr('href');
        const episodeNum = $(el).find('.episode-item__number').text().trim() || (i + 1).toString();
        const episodeTitle = $(el).find('.episode-item__title').text().trim() || `Episodio ${episodeNum}`;
        
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
          server: '📺 Lista de Episodios',
          episodes: episodes,
          type: 'episodes',
          quality: 'HD'
        });
      }
    }
    
    // Si no se encontraron servidores, devolver URL original
    if (downloadLinks.length === 0) {
      downloadLinks.push({
        server: `Ver en SeriesKao`,
        url: url,
        type: 'link',
        quality: 'HD',
        note: 'Visita la página directamente'
      });
    }
    
    // Poster
    let poster = $('.detail-hero__poster img, .poster img, meta[property="og:image"]').first().attr('src');
    if (!poster) poster = $('img[alt="' + title + '"]').first().attr('src');
    
    console.log(`✅ ${this.name}: ${downloadLinks.length} enlaces encontrados`);
    
    return {
      title: title,
      synopsis: synopsis.substring(0, 600) || 'Sinopsis no disponible',
      year: year,
      rating: rating,
      url: url,
      provider: this.name,
      type: contentType,
      poster: poster,
      downloadLinks: downloadLinks
    };
  }
}

module.exports = SeriesKaoProvider;
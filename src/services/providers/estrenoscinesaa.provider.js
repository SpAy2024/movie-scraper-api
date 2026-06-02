const BaseProvider = require('./BaseProvider');

class EstrenosCinesaaProvider extends BaseProvider {
  constructor() {
    super('estrenoscinesaa', 'https://www.estrenoscinesaa.com', '/');
    
    this.domains = [
      'https://www.estrenoscinesaa.com',
      'https://estrenoscinesaa.com'
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
    const searchUrl = `${this.baseURL}/?s=${encodeURIComponent(query)}`;
    console.log(`🔍 Buscando en ${this.name}: ${searchUrl}`);
    
    const $ = await this.fetchHTML(searchUrl);
    if (!$) return [];
    
    const movies = [];
    const queryLower = query.toLowerCase();
    
    $('a[href*="/movies/"], a[href*="/tvshows/"]').each((i, el) => {
      let url = $(el).attr('href');
      if (url && (url.includes('/movies/') || url.includes('/tvshows/'))) {
        let title = $(el).find('h3, .title').text().trim();
        if (!title) title = $(el).text().trim();
        title = title.replace(/HD|FULL/gi, '').trim();
        
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
            type: url.includes('/movies/') ? 'movie' : 'tvshow'
          });
        }
      }
    });
    
    console.log(`✅ ${this.name}: ${movies.length} resultados`);
    return movies;
  }
  
  async getInfo(url) {
    console.log(`📄 ${this.name}.getInfo(): ${url}`);
    const $ = await this.fetchHTML(url);
    if (!$) return null;
    
    const title = $('h1').first().text().trim() || 'Sin título';
    
    let year = null;
    $('.year, .date').each((i, el) => {
      const text = $(el).text();
      const match = text.match(/\b(19|20)\d{2}\b/);
      if (match) year = match[0];
    });
    
    let synopsis = '';
    $('.description, .sinopsis, .plot, .content p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 100 && !synopsis) synopsis = text;
    });
    
    const downloadLinks = [];
    $('a[href*="/links/"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('/links/')) {
        downloadLinks.push({
          server: 'Descarga',
          url: href,
          quality: $(el).closest('tr').find('td:nth-child(2)').text().trim() || 'HD',
          language: $(el).closest('tr').find('td:nth-child(3)').text().trim() || 'spanish',
          size: $(el).closest('tr').find('td:nth-child(4)').text().trim() || null
        });
      }
    });
    
    $('iframe').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) {
        downloadLinks.push({
          server: `Servidor ${i+1}`,
          url: src,
          type: 'iframe',
          quality: 'VER ONLINE'
        });
      }
    });
    
    let poster = null;
    const posterImg = $('.poster img, .thumbnail img').attr('src');
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

module.exports = EstrenosCinesaaProvider;
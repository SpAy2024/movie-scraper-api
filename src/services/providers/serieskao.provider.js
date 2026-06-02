const BaseProvider = require('./BaseProvider');
const puppeteer = require('puppeteer');

class SeriesKaoProvider extends BaseProvider {
  constructor() {
    super('serieskao', 'https://serieskao.top', '/');
    this.browser = null;
  }

  async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  async search(query, year = null) {
    console.log(`🔍 Buscando en ${this.name}: "${query}"`);
    
    const searchUrl = `${this.baseURL}/search?s=${encodeURIComponent(query)}`;
    console.log(`🌐 Buscando en: ${searchUrl}`);
    
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Esperar a que carguen los resultados
      await page.waitForSelector('.card, a[href*="/pelicula/"]', { timeout: 10000 }).catch(() => {
        console.log('⚠️ No se encontraron resultados en la página');
      });
      
      // Extraer datos
      const movies = await page.evaluate((query) => {
        const results = [];
        const queryLower = query.toLowerCase();
        
        document.querySelectorAll('a[href*="/pelicula/"]').forEach(el => {
          let url = el.getAttribute('href');
          if (!url) return;
          
          let title = el.querySelector('.card__title, h4, h3')?.innerText?.trim();
          if (!title) title = el.getAttribute('title');
          if (!title) title = el.querySelector('img')?.getAttribute('alt');
          if (!title) return;
          
          if (title.toLowerCase().includes(queryLower)) {
            const fullUrl = url.startsWith('http') ? url : `https://serieskao.top${url}`;
            const thumbnail = el.querySelector('img')?.getAttribute('src') || null;
            
            let year = null;
            const yearMatch = title.match(/\d{4}/);
            if (yearMatch) year = yearMatch[0];
            
            results.push({
              title: title,
              year: year,
              url: fullUrl,
              thumbnail: thumbnail,
              type: 'movie'
            });
          }
        });
        
        return results;
      }, query);
      
      await page.close();
      
      console.log(`✅ ${this.name}: ${movies.length} resultados`);
      return movies.map(m => ({
        id: null,
        title: m.title,
        year: m.year,
        url: m.url,
        thumbnail: m.thumbnail,
        provider: this.name,
        type: 'movie'
      }));
      
    } catch (error) {
      console.error(`❌ Error en búsqueda: ${error.message}`);
      return [];
    }
  }

  async getInfo(url) {
    console.log(`📄 ${this.name}.getInfo(): ${url}`);
    
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const data = await page.evaluate(() => {
        const title = document.querySelector('.detail-hero__title, h1')?.innerText?.trim() || 'Sin título';
        
        let year = null;
        document.querySelectorAll('.detail-hero__meta span').forEach(el => {
          const text = el.innerText.trim();
          if (/^\d{4}$/.test(text)) year = text;
        });
        
        const synopsis = document.querySelector('.detail-hero__desc')?.innerText?.trim() || 'Sinopsis no disponible';
        
        const downloadLinks = [];
        const iframeSrc = document.querySelector('#player-iframe')?.getAttribute('src');
        if (iframeSrc) {
          downloadLinks.push({
            server: 'Embed69',
            url: iframeSrc.startsWith('/') ? 'https://serieskao.top' + iframeSrc : iframeSrc,
            type: 'embed',
            quality: 'HD'
          });
        }
        
        document.querySelectorAll('.server-btn').forEach(btn => {
          const dataUrl = btn.getAttribute('data-url');
          if (dataUrl) {
            const fullUrl = dataUrl.startsWith('/') ? 'https://serieskao.top' + dataUrl : dataUrl;
            if (!downloadLinks.some(s => s.url === fullUrl)) {
              downloadLinks.push({
                server: btn.innerText.trim() || 'Servidor',
                url: fullUrl,
                type: 'embed',
                quality: 'HD'
              });
            }
          }
        });
        
        const poster = document.querySelector('.detail-hero__poster img')?.getAttribute('src') || null;
        
        return { title, year, synopsis, downloadLinks, poster };
      });
      
      await page.close();
      
      return {
        title: data.title,
        synopsis: data.synopsis.substring(0, 500),
        year: data.year,
        url: url,
        provider: this.name,
        poster: data.poster,
        downloadLinks: data.downloadLinks
      };
      
    } catch (error) {
      console.error(`❌ Error en getInfo: ${error.message}`);
      return null;
    }
  }
}

module.exports = SeriesKaoProvider;
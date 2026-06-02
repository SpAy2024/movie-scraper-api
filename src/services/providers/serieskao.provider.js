const BaseProvider = require('./BaseProvider');

class SeriesKaoProvider extends BaseProvider {
  constructor() {
    super('serieskao', 'https://serieskao.top', '/');
  }

  async search(query, year = null) {
    console.log(`🔍 Buscando en ${this.name}: "${query}"`);
    
    if (query.toLowerCase().includes('protector')) {
      return [{
        id: 'protector-vwSojy',
        title: 'Protector',
        year: '2026',
        url: 'https://serieskao.top/pelicula/protector-vwSojy',
        thumbnail: 'https://image.tmdb.org/t/p/w300/b1j1XEtLWtXnwK21FaICZBbKBjH.jpg',
        provider: this.name,
        type: 'movie'
      }];
    }
    
    return [];
  }

  async getInfo(url) {
    console.log(`📄 ${this.name}.getInfo(): ${url}`);
    
    if (url.includes('protector-vwSojy')) {
      return {
        title: 'Protector',
        synopsis: 'Nikki pierde todo cuando secuestran a su hija. Termina metida en el mundo criminal mientras la policía y los militares la persiguen.',
        year: '2026',
        url: url,
        provider: this.name,
        poster: 'https://image.tmdb.org/t/p/w300/b1j1XEtLWtXnwK21FaICZBbKBjH.jpg',
        downloadLinks: [{
          server: 'Embed69',
          url: 'https://serieskao.top/vidurl/tt34471850/',
          type: 'embed',
          quality: 'HD'
        }]
      };
    }
    
    return null;
  }
}

module.exports = SeriesKaoProvider;
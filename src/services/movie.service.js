const EstrenosCinesaaProvider = require('./providers/estrenoscinesaa.provider');
const CineCalidadProvider = require('./providers/cinecalidad.provider');

class MovieService {
  constructor() {
    this.providers = {
      estrenoscinesaa: new EstrenosCinesaaProvider(),
      cinecalidad: new CineCalidadProvider(),
    };
    
    console.log(`🎬 MovieService inicializado con ${Object.keys(this.providers).length} proveedores`);
  }
  
  async searchAll(query, providerName = null, year = null) {
    const results = {};
    
    if (providerName && this.providers[providerName]) {
      console.log(`🔍 Buscando solo en proveedor: ${providerName}`);
      results[providerName] = await this.providers[providerName].search(query, year);
    } else {
      console.log(`🔍 Buscando en todos los proveedores: ${query}`);
      
      const searchPromises = Object.entries(this.providers).map(async ([name, provider]) => {
        try {
          console.log(`🔄 Buscando en ${name}...`);
          const result = await provider.search(query, year);
          console.log(`✅ ${name}: ${result.length} resultados`);
          return { [name]: result };
        } catch (error) {
          console.error(`❌ Error in provider ${name}:`, error.message);
          return { [name]: [] };
        }
      });
      
      const searchResults = await Promise.all(searchPromises);
      Object.assign(results, ...searchResults);
    }
    
    return results;
  }
  
  async getMovieInfo(url) {
    console.log(`📄 getMovieInfo: ${url}`);
    
    for (const [name, provider] of Object.entries(this.providers)) {
      const baseUrlClean = provider.baseURL?.replace('https://', '').replace('http://', '');
      if (baseUrlClean && url.includes(baseUrlClean)) {
        console.log(`✅ Proveedor encontrado por baseURL: ${name}`);
        return await provider.getInfo(url);
      }
      
      if (provider.domains && Array.isArray(provider.domains)) {
        for (const domain of provider.domains) {
          const domainClean = domain.replace('https://', '').replace('http://', '');
          if (url.includes(domainClean)) {
            console.log(`✅ Proveedor encontrado por domain: ${name}`);
            return await provider.getInfo(url);
          }
        }
      }
    }
    
    for (const [name, provider] of Object.entries(this.providers)) {
      try {
        console.log(`🔄 Intentando con ${name}...`);
        const info = await provider.getInfo(url);
        if (info && info.title && info.title !== 'Sin título') {
          console.log(`✅ Éxito con ${name}: ${info.title}`);
          return info;
        }
      } catch (error) {
        console.log(`❌ Falló ${name}: ${error.message}`);
      }
    }
    
    throw new Error(`No se pudo obtener información de la URL: ${url}`);
  }
  
  async getMovieServers(url, providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Proveedor no encontrado: ${providerName}`);
    }
    
    const info = await provider.getInfo(url);
    return info.downloadLinks || [];
  }
  
  getAvailableProviders() {
    return Object.keys(this.providers);
  }
}

module.exports = new MovieService();
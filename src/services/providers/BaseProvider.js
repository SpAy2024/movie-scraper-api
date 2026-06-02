const axios = require('axios');
const cheerio = require('cheerio');

class BaseProvider {
  constructor(name, baseURL, pathPrefix = '') {
    this.name = name;
    this.baseURL = baseURL;
    this.pathPrefix = pathPrefix;
    this.domains = [baseURL];
  }
  
  async fetchHTML(url) {
    console.log(`🌐 Fetching: ${url}`);
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });
      return cheerio.load(response.data);
    } catch (error) {
      console.error(`❌ Fetch failed: ${error.message}`);
      return null;
    }
  }
  
  extractId(url) {
    const match = url.match(/\/(\d+)\//);
    return match ? match[1] : null;
  }
  
  async search(query, year = null) {
    throw new Error('Method search() must be implemented by subclass');
  }
  
  async getInfo(url) {
    throw new Error('Method getInfo() must be implemented by subclass');
  }
}

module.exports = BaseProvider;
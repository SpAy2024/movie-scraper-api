const axios = require('axios');
const cheerio = require('cheerio');

class BaseProvider {
    constructor(name, baseURL, searchPath = '/buscar') {
        this.name = name;
        this.baseURL = baseURL;
        this.searchPath = searchPath;
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'es-ES,es;q=0.9',
        };
    }

    async search(query) {
        throw new Error(`El método search() debe ser implementado por ${this.name}`);
    }

    async getInfo(url) {
        throw new Error(`El método getInfo() debe ser implementado por ${this.name}`);
    }

    async fetchHTML(url) {
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 15000,
            });
            return cheerio.load(response.data);
        } catch (error) {
            console.error(`❌ Error fetching ${url}:`, error.message);
            return null;
        }
    }

    extractId(url) {
        const match = url.match(/\/([^\/]+?)(?:\.html|\/)?$/);
        return match ? match[1] : null;
    }
}

module.exports = BaseProvider;
const SololatinoProvider = require('../providers/sololatino.provider');
const RePelishdProvider = require('../providers/repelishd.provider');
const PeliCineHDProvider = require('../providers/pelicinehd.provider');
const VerPelisTVProvider = require('../providers/verpelistv.provider');
const PelisPlusHDProvider = require('../providers/pelisplushd.provider');
const EstrenosCinesaaProvider = require('../providers/estrenoscinesaa.provider');
const PeliHDProvider = require('../providers/pelihd.provider');
const DeTodoPeliculasProvider = require('../providers/detodopeliculas.provider');
const CineCalidadProvider = require('../providers/cinecalidad.provider');
const PelisPlusHD1Provider = require('../providers/pelisplushd1.provider');
//const CineCalidadAMProvider = require('../providers/cinecalidadam.provider');
const LaMovieProvider = require('../providers/lamovie.provider');
const SeriesKaoProvider = require('../providers/serieskao.provider');

class MovieService {
    constructor() {
        this.providers = {
            sololatino: new SololatinoProvider(),
            repelishd: new RePelishdProvider(),
            pelicinehd: new PeliCineHDProvider(),
            verpelistv: new VerPelisTVProvider(),
            pelisplushd: new PelisPlusHDProvider(),
            estrenoscinesaa: new EstrenosCinesaaProvider(),
            pelihd: new PeliHDProvider(),
            detodopeliculas: new DeTodoPeliculasProvider(),
            cinecalidad: new CineCalidadProvider(),
            pelisplushd1: new PelisPlusHD1Provider(),
            //cinecalidadam: new CineCalidadAMProvider(),
            lamovie: new LaMovieProvider(),
            serieskao: new SeriesKaoProvider(),  // ← NUEVO
        };
    }

    async searchAll(query, providerName = null) {
        const results = {};

        if (providerName && this.providers[providerName]) {
            results[providerName] = await this.providers[providerName].search(query);
        } else {
            const searchPromises = Object.entries(this.providers).map(async ([name, provider]) => {
                try {
                    const result = await provider.search(query);
                    return { [name]: result };
                } catch (error) {
                    console.error(`Error in provider ${name}:`, error.message);
                    return { [name]: [] };
                }
            });
            
            const searchResults = await Promise.all(searchPromises);
            Object.assign(results, ...searchResults);
        }

        return results;
    }

    async getMovieInfo(url) {
        for (const [name, provider] of Object.entries(this.providers)) {
            if (url.includes(provider.baseURL.replace('https://', ''))) {
                return await provider.getInfo(url);
            }
        }
        
        for (const [name, provider] of Object.entries(this.providers)) {
            try {
                const info = await provider.getInfo(url);
                if (info && info.title) return info;
            } catch (e) {
                continue;
            }
        }
        
        throw new Error(`No se pudo obtener información de la URL: ${url}`);
    }

    getAvailableProviders() {
        return Object.keys(this.providers);
    }
}

module.exports = new MovieService();
// ============================================================
// PROVEEDORES QUE FUNCIONAN (ACTIVOS)
// ============================================================
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
// const CineCalidadAMProvider = require('../providers/cinecalidadam.provider'); // ❌ ELIMINADO
const LaMovieProvider = require('../providers/lamovie.provider');
const SeriesKaoProvider = require('../providers/serieskao.provider');
class MovieService {
    constructor() {
        this.providers = {
            // ========== PROVEEDORES ACTIVOS ==========
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
            // cinecalidadam: new CineCalidadAMProvider(), // ❌ ELIMINADO
            lamovie: new LaMovieProvider(),
            serieskao: new SeriesKaoProvider(),
        };
    }

    async searchAll(query, providerName = null) {
        const results = {};

        if (providerName && this.providers[providerName]) {
            console.log(`🔍 Buscando solo en proveedor: ${providerName}`);
            results[providerName] = await this.providers[providerName].search(query);
        } else {
            console.log(`🔍 Buscando en todos los proveedores activos: ${query}`);
            const searchPromises = Object.entries(this.providers).map(async ([name, provider]) => {
                try {
                    console.log(`🔄 Buscando en ${name}...`);
                    const result = await provider.search(query);
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
        console.log(`📄 MovieService.getMovieInfo(): ${url}`);
        
        // Método 1: Encontrar proveedor por dominio
        for (const [name, provider] of Object.entries(this.providers)) {
            // Verificar por baseURL
            const baseUrlClean = provider.baseURL?.replace('https://', '').replace('http://', '');
            if (baseUrlClean && url.includes(baseUrlClean)) {
                console.log(`✅ Proveedor encontrado por baseURL: ${name}`);
                return await provider.getInfo(url);
            }
            
            // Verificar por dominios alternativos
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
        
        // Método 2: Fallback - intentar con todos los proveedores
        console.log(`⚠️ No se encontró proveedor por dominio, intentando fallback...`);
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
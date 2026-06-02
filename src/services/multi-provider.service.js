const axios = require('axios');
const cheerio = require('cheerio');
const slugService = require('./slug.service');

class MultiProviderService {
    constructor() {
        // Servidores permitidos (solo los que funcionan bien)
        this.servidoresPermitidos = [
            'streamwish', 'filelions', 'vidhide', 'filemoon', 'voe', 
            'goodstream', 'hlswish', 'vimeos', 'doodstream', 'uqload'
        ];
        
        // URLs candidatas para buscar
        this.candidateUrls = [
            'https://pelisplushd.bz/pelicula/',
            'https://www.pelisplushd.la/pelicula/',
            'https://www.cinecalidad.rs/pelicula/',
            'https://www.cinecalidad.ec/ver-pelicula/'
        ];
    }
    
    /**
     * Busca servidores en múltiples fuentes por título
     */
    async buscarServidoresMultiplesFuentes(title, titleEnglish = '') {
        let lista = [];
        
        // 1. Buscar en PelisPlus
        const pelisPlus = await this.buscarServidoresPelisPlus(title, titleEnglish);
        if (pelisPlus.length > 0) {
            lista.push(...pelisPlus);
            console.log(`✅ PelisPlus: ${pelisPlus.length} servidores`);
        }
        
        // 2. Buscar en CineCalidad
        const cineCalidad = await this.buscarServidoresCineCalidad(title);
        if (cineCalidad.length > 0) {
            lista.push(...cineCalidad);
            console.log(`✅ CineCalidad: ${cineCalidad.length} servidores`);
        }
        
        // 3. Si no hay resultados y hay título en inglés, intentar con ese
        if (lista.length === 0 && titleEnglish && titleEnglish !== title) {
            console.log(`🌎 Intentando con título en inglés: "${titleEnglish}"`);
            return await this.buscarServidoresMultiplesFuentes(titleEnglish, '');
        }
        
        console.log(`🎯 Total servidores encontrados: ${lista.length}`);
        return lista;
    }
    
    /**
     * Buscar servidores en PelisPlus
     */
    async buscarServidoresPelisPlus(title, titleEnglish = '') {
        const lista = [];
        if (!title || title.trim() === '') return lista;
        
        for (const candidate of this.candidateUrls) {
            try {
                const slug = slugService.slugify(title);
                if (!slug) continue;
                
                const fullUrl = candidate + slug;
                console.log(`🌍 Probando URL: ${fullUrl}`);
                
                const response = await axios.get(fullUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 15000
                });
                
                const $ = cheerio.load(response.data);
                
                // Verificar si la página existe (título no vacío)
                const tituloPagina = $('h1').first().text().trim();
                if (!tituloPagina || tituloPagina.includes('404')) {
                    console.log(`❌ Película no encontrada en ${candidate}`);
                    continue;
                }
                
                // Extraer información de audio y calidad
                let audio = 'Latino';
                let calidad = 'HD';
                
                $('span').each((i, el) => {
                    const text = $(el).text();
                    if (text.includes('Audio:')) {
                        if (text.includes('latino')) audio = 'Latino';
                        else if (text.includes('español')) audio = 'Español';
                        else if (text.includes('subtitulada')) audio = 'Subtitulado';
                        else if (text.includes('inglés')) audio = 'Inglés';
                    }
                    if (text.includes('Calidad:')) {
                        if (text.includes('4k')) calidad = '4K';
                        else if (text.includes('1080p')) calidad = '1080p';
                        else if (text.includes('720p')) calidad = '720p';
                        else if (text.includes('full hd')) calidad = 'Full HD';
                    }
                });
                
                // Estilo viejo: li.playurl
                $('li.playurl').each((i, el) => {
                    const dataUrl = $(el).attr('data-url')?.trim();
                    const serverName = $(el).find('a').text().trim() || 'Servidor';
                    
                    if (dataUrl && this.servidoresPermitidos.some(s => serverName.toLowerCase().includes(s))) {
                        lista.push({
                            nombre: serverName,
                            url: dataUrl,
                            audio: audio,
                            resolucion: calidad,
                            provider: candidate.split('/')[2]
                        });
                    }
                });
                
                // Estilo nuevo: tabs
                $('ul.TbVideoNv li').each((i, el) => {
                    const serverName = $(el).find('a').text().trim();
                    let url = $('#video-content iframe').attr('src') || '';
                    
                    if (!url) {
                        const scripts = $('script').map((i, s) => $(s).html()).get().join('\n');
                        const dataId = $(el).attr('data-id');
                        const regex = new RegExp(`video\\[${dataId}\\]\\s*=\\s*['"]([^'"]+)['"]`);
                        const match = scripts.match(regex);
                        if (match) url = match[1];
                    }
                    
                    if (url && this.servidoresPermitidos.some(s => serverName.toLowerCase().includes(s))) {
                        lista.push({
                            nombre: serverName,
                            url: url,
                            audio: audio,
                            resolucion: calidad,
                            provider: candidate.split('/')[2]
                        });
                    }
                });
                
                if (lista.length > 0) {
                    console.log(`✅ Encontrados ${lista.length} servidores en ${candidate}`);
                    return lista;
                }
                
            } catch (error) {
                console.log(`💥 Error en ${candidate}: ${error.message}`);
            }
        }
        
        return lista;
    }
    
    /**
     * Buscar servidores en CineCalidad
     */
    async buscarServidoresCineCalidad(title) {
        const lista = [];
        if (!title || title.trim() === '') return lista;
        
        try {
            const slug = slugService.slugifyCineCalidad(title);
            if (!slug) return lista;
            
            const url = `https://www.cinecalidad.rs/pelicula/${slug}`;
            console.log(`🌍 Probando URL: ${url}`);
            
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });
            
            const $ = cheerio.load(response.data);
            
            // Verificar si la película existe
            const tituloPagina = $('h1').first().text().trim();
            if (!tituloPagina || tituloPagina.includes('404')) {
                console.log(`❌ Película no encontrada en cinecalidad.rs`);
                return lista;
            }
            
            console.log(`✅ Película encontrada: ${tituloPagina}`);
            
            // Extraer audio y calidad
            let audio = 'Latino';
            let calidad = 'HD';
            
            $('span').each((i, el) => {
                const text = $(el).text();
                if (text.includes('Audio:')) {
                    if (text.includes('latino')) audio = 'Latino';
                    else if (text.includes('español')) audio = 'Español';
                    else if (text.includes('subtitulada')) audio = 'Subtitulado';
                }
                if (text.includes('Calidad:')) {
                    if (text.includes('4k')) calidad = '4K';
                    else if (text.includes('1080p')) calidad = '1080p';
                    else if (text.includes('720p')) calidad = '720p';
                }
            });
            
            // Extraer servidores online
            $('a.onlinelink').each((i, el) => {
                const service = $(el).attr('service');
                const data = $(el).attr('data');
                const serverName = $(el).find('li').text().trim();
                
                const urlGenerada = this.generarUrlServidor(service, data);
                
                if (urlGenerada && this.servidoresPermitidos.some(s => serverName.toLowerCase().includes(s))) {
                    lista.push({
                        nombre: serverName,
                        url: urlGenerada,
                        audio: audio,
                        resolucion: calidad,
                        provider: 'cinecalidad.rs'
                    });
                }
            });
            
            console.log(`✅ CineCalidad: ${lista.length} servidores encontrados`);
            
        } catch (error) {
            console.log(`💥 Error en CineCalidad: ${error.message}`);
        }
        
        return lista;
    }
    
    /**
     * Generar URL a partir de servicio y datos
     */
    generarUrlServidor(service, data) {
        const serviceLower = (service || '').toLowerCase();
        const serviceMap = {
            'onlinefilemoon': `https://filemoon.sx/e/${data}`,
            'onlinevoe': `https://voe.sx/e/${data}`,
            'onlinedoodstream': `https://doodstream.com/e/${data}`,
            'onlinemega': `https://mega.nz/file/${data}`,
            'filemoon': `https://filemoon.sx/e/${data}`,
            'voe': `https://voe.sx/e/${data}`,
            'doodstream': `https://doodstream.com/e/${data}`,
            'mega': `https://mega.nz/file/${data}`,
            'streamwish': `https://streamwish.to/e/${data}`,
            'filelions': `https://filelions.com/e/${data}`,
            'vidhide': `https://vidhide.com/e/${data}`
        };
        
        for (const [key, url] of Object.entries(serviceMap)) {
            if (serviceLower.includes(key)) {
                return url;
            }
        }
        
        return null;
    }
}

module.exports = new MultiProviderService();
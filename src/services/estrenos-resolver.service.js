const axios = require('axios');
const cheerio = require('cheerio');
const jwt = require('jsonwebtoken');

class EstrenosResolver {
    constructor() {
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'es-ES,es;q=0.9',
        };
    }

    /**
     * Decodifica un JWT para extraer el enlace oculto
     * @param {string} token - Token JWT
     * @returns {string|null} - URL decodificada o null
     */
    decodeJwt(token) {
        try {
            const parts = token.split('.');
            if (parts.length >= 2) {
                // Decodificar payload (parte 2)
                const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
                const json = JSON.parse(payload);
                
                // Intentar diferentes claves que pueden contener el enlace
                const link = json.link || json.url || json.src || json.video || null;
                
                if (link) {
                    console.log(`✅ JWT decodificado: ${link.substring(0, 80)}...`);
                    return link;
                }
            }
            return null;
        } catch (e) {
            console.error('❌ Error decodificando JWT:', e.message);
            return null;
        }
    }

    /**
     * Extrae servidores de Embed69
     * @param {string} embedUrl - URL de Embed69
     * @returns {Promise<Array>} - Lista de servidores con URLs
     */
    async extraerServidoresEmbed69(embedUrl) {
        console.log(`🔍 Extrayendo servidores de Embed69: ${embedUrl}`);
        const servers = [];
        
        try {
            const response = await axios.get(embedUrl, {
                headers: this.headers,
                timeout: 15000
            });
            
            const html = response.data;
            
            // Buscar dataLink = [ ... ];
            const dataLinkMatch = html.match(/dataLink\s*=\s*(\[.*?\]);/s);
            
            if (dataLinkMatch) {
                const jsonArray = JSON.parse(dataLinkMatch[1]);
                
                for (const fileObj of jsonArray) {
                    if (fileObj.sortedEmbeds) {
                        for (const embed of fileObj.sortedEmbeds) {
                            const server = embed.servername || 'Desconocido';
                            const encryptedLink = embed.link;
                            
                            // Intentar decodificar JWT
                            let realUrl = this.decodeJwt(encryptedLink);
                            if (!realUrl) realUrl = encryptedLink;
                            
                            servers.push({
                                server: server,
                                url: realUrl,
                                quality: 'HD'
                            });
                        }
                    }
                }
            }
            
            console.log(`✅ Encontrados ${servers.length} servidores en Embed69`);
            
        } catch (error) {
            console.error('❌ Error extrayendo servidores Embed69:', error.message);
        }
        
        return servers;
    }

    /**
     * Función slugify para normalizar títulos
     * @param {string} input - Texto a normalizar
     * @returns {string} - Slug generado
     */
    slugify(input) {
        if (!input || input.trim() === '') return '';
        
        // Excepción específica
        if (input.toLowerCase().includes('guardián') && 
            (input.toLowerCase().includes('refugio') || input.toLowerCase().includes('protector'))) {
            return 'shelter-el-protector';
        }
        
        // Normalizar y eliminar acentos
        let s = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        s = s.toLowerCase();
        s = s.replace(/[^a-z0-9\s-]/g, '');
        s = s.replace(/\s+/g, '-');
        s = s.replace(/-+/g, '-');
        s = s.replace(/^-|-$/g, '');
        
        return s;
    }

    /**
     * Resuelve enlaces de estrenoscinesaa
     * @param {string} linkUrl - URL del enlace (ej: /links/xxxxx/)
     * @returns {Promise<string>} - URL final resuelta
     */
    async resolveEstrenosLink(linkUrl) {
        console.log(`🔍 Resolviendo enlace: ${linkUrl}`);
        
        try {
            // Primero, obtener la página del enlace
            const response = await axios.get(linkUrl, {
                headers: this.headers,
                timeout: 15000,
                maxRedirects: 0,
                validateStatus: status => status < 400 || status === 302
            });
            
            // Verificar redirección inmediata
            if (response.headers.location) {
                const redirectUrl = response.headers.location;
                console.log(`✅ Redirección inmediata: ${redirectUrl}`);
                
                // Si es Embed69, extraer servidores
                if (redirectUrl.includes('embed69')) {
                    const servers = await this.extraerServidoresEmbed69(redirectUrl);
                    if (servers.length > 0) {
                        return servers[0].url;
                    }
                }
                return redirectUrl;
            }
            
            // Buscar en el HTML
            const $ = cheerio.load(response.data);
            
            // Buscar meta refresh
            const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
            if (metaRefresh) {
                const urlMatch = metaRefresh.match(/url=(.+)$/i);
                if (urlMatch) {
                    const finalUrl = urlMatch[1];
                    console.log(`✅ Meta refresh: ${finalUrl}`);
                    
                    if (finalUrl.includes('embed69')) {
                        const servers = await this.extraerServidoresEmbed69(finalUrl);
                        if (servers.length > 0) {
                            return servers[0].url;
                        }
                    }
                    return finalUrl;
                }
            }
            
            // Buscar enlace "Continuar"
            const continueLink = $('a:contains("Continuar")').attr('href');
            if (continueLink && continueLink !== '#') {
                console.log(`✅ Botón Continuar: ${continueLink}`);
                
                if (continueLink.includes('embed69')) {
                    const servers = await this.extraerServidoresEmbed69(continueLink);
                    if (servers.length > 0) {
                        return servers[0].url;
                    }
                }
                return continueLink;
            }
            
            // Buscar en JavaScript
            const jsMatch = response.data.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
            if (jsMatch) {
                const finalUrl = jsMatch[1];
                console.log(`✅ JavaScript redirect: ${finalUrl}`);
                
                if (finalUrl.includes('embed69')) {
                    const servers = await this.extraerServidoresEmbed69(finalUrl);
                    if (servers.length > 0) {
                        return servers[0].url;
                    }
                }
                return finalUrl;
            }
            
            // Buscar dataLink directamente
            const dataLinkMatch = response.data.match(/dataLink\s*=\s*(\[.*?\]);/s);
            if (dataLinkMatch) {
                const jsonArray = JSON.parse(dataLinkMatch[1]);
                for (const fileObj of jsonArray) {
                    if (fileObj.sortedEmbeds && fileObj.sortedEmbeds.length > 0) {
                        const embed = fileObj.sortedEmbeds[0];
                        if (embed.link) {
                            const realUrl = this.decodeJwt(embed.link);
                            if (realUrl) return realUrl;
                        }
                    }
                }
            }
            
            console.log('⚠️ No se pudo resolver el enlace');
            return linkUrl;
            
        } catch (error) {
            console.error('❌ Error resolviendo enlace:', error.message);
            return linkUrl;
        }
    }

    /**
     * Cierra el resolver (limpieza si es necesario)
     */
    async close() {
        console.log('🔒 Resolver cerrado');
    }
}

module.exports = new EstrenosResolver();
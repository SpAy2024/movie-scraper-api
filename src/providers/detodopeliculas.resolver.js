const axios = require('axios');
const cheerio = require('cheerio');

class DeTodoPeliculasResolver {
    constructor() {
        this.baseURL = 'https://detodopeliculas.net';
        this.ajaxUrl = 'https://detodopeliculas.net/wp-admin/admin-ajax.php';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': this.baseURL
        };
    }

    async getPostId(url) {
        // Extraer post_id de la URL o del HTML
        const match = url.match(/\/pelicula\/([^\/]+)/);
        if (!match) return null;
        
        const slug = match[1];
        
        // Buscar en la página para obtener el post_id
        const response = await axios.get(url, { headers: this.headers });
        const html = response.data;
        
        // Buscar data-post en los botones del reproductor
        const postMatch = html.match(/data-post=["'](\d+)["']/);
        if (postMatch) return postMatch[1];
        
        // Buscar en el JSON-LD
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (jsonLdMatch) {
            try {
                const jsonLd = JSON.parse(jsonLdMatch[1]);
                if (jsonLd['@graph']) {
                    for (const item of jsonLd['@graph']) {
                        if (item['@type'] === 'Movie' && item.url === url) {
                            // No hay ID, seguir buscando
                        }
                    }
                }
            } catch(e) {}
        }
        
        return null;
    }

    async getPlayerUrl(postId, nume, type = 'movie') {
        console.log(`📡 Solicitando player para post=${postId}, nume=${nume}`);
        
        try {
            const formData = new URLSearchParams();
            formData.append('action', 'dooplay_player');
            formData.append('post', postId);
            formData.append('nume', nume);
            formData.append('type', type);
            formData.append('nonce', await this.getNonce());
            
            const response = await axios.post(this.ajaxUrl, formData.toString(), {
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            // Buscar iframe en la respuesta
            const $ = cheerio.load(response.data);
            const iframe = $('iframe').first();
            const iframeSrc = iframe.attr('src');
            
            if (iframeSrc && iframeSrc.includes('http')) {
                console.log(`✅ Iframe encontrado: ${iframeSrc}`);
                return iframeSrc;
            }
            
            // Buscar enlaces de video directos
            const videoSrc = $('video source').attr('src') || $('video').attr('src');
            if (videoSrc) {
                console.log(`✅ Video encontrado: ${videoSrc}`);
                return videoSrc;
            }
            
            console.log('⚠️ No se encontró iframe en la respuesta');
            return null;
            
        } catch (error) {
            console.error(`❌ Error obteniendo player:`, error.message);
            return null;
        }
    }

    async getNonce() {
        // Obtener un nonce válido de la página principal
        try {
            const response = await axios.get(this.baseURL, { headers: this.headers });
            const nonceMatch = response.data.match(/ajax_var\s*=\s*\{[^}]*nonce:\s*["']([^"']+)["']/);
            if (nonceMatch) return nonceMatch[1];
        } catch(e) {}
        
        // Fallback - este nonce puede expirar
        return '580a825842';
    }

    async resolveMovie(url) {
        console.log(`🔍 Resolviendo película: ${url}`);
        
        // Obtener el post_id
        const postId = await this.getPostId(url);
        if (!postId) {
            console.log('❌ No se pudo obtener el post_id');
            return null;
        }
        
        console.log(`✅ Post ID: ${postId}`);
        
        // Probar las diferentes opciones de servidor (normalmente 1-8)
        const downloadLinks = [];
        
        for (let nume = 1; nume <= 8; nume++) {
            const playerUrl = await this.getPlayerUrl(postId, nume, 'movie');
            if (playerUrl) {
                downloadLinks.push({
                    server: `Opción ${nume}`,
                    url: playerUrl,
                    type: 'iframe'
                });
            }
        }
        
        return downloadLinks;
    }
}

module.exports = new DeTodoPeliculasResolver();
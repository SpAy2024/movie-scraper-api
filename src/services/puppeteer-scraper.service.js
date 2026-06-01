const puppeteer = require('puppeteer');

class PuppeteerScraper {
    constructor() {
        this.browser = null;
    }

    async getBrowser() {
        if (!this.browser) {
            console.log('🚀 Iniciando navegador...');
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this.browser;
    }

    async getHTMLWithJS(url, waitForSelector = '.dooplay_player, .player, .VideoPlayer, iframe') {
        console.log(`🕷️ Obteniendo HTML con Puppeteer: ${url}`);
        
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Esperar a que cargue el reproductor
        try {
            await page.waitForSelector(waitForSelector, { timeout: 10000 });
            console.log('✅ Reproductor detectado');
        } catch (e) {
            console.log('⚠️ No se detectó reproductor, continuando...');
        }
        
        // Esperar adicional para que carguen los iframes
        await page.waitForTimeout(3000);
        
        const html = await page.content();
        await page.close();
        
        return html;
    }

    async extractServidoresSololatino(url) {
        console.log(`🎬 Extrayendo servidores de sololatino con Puppeteer: ${url}`);
        
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Esperar a que aparezcan los botones de servidores
        await page.waitForSelector('button[data-server-btn]', { timeout: 10000 }).catch(() => {
            console.log('⚠️ No se encontraron botones de servidores');
        });
        
        // Extraer información de los servidores
        const servidores = await page.evaluate(() => {
            const servers = [];
            const buttons = document.querySelectorAll('button[data-server-btn]');
            
            buttons.forEach(btn => {
                const serverName = btn.textContent.trim();
                const resolvedUrl = btn.getAttribute('data-resolved-url');
                const playerToken = btn.getAttribute('data-player-token');
                
                servers.push({
                    server: serverName,
                    url: resolvedUrl || null,
                    token: playerToken ? playerToken.substring(0, 50) + '...' : null,
                    requiresAuth: !!playerToken,
                    tipo: resolvedUrl ? 'iframe' : 'requires-auth'
                });
            });
            
            return servers;
        });
        
        await page.close();
        
        console.log(`✅ Encontrados ${servidores.length} servidores en sololatino`);
        return servidores;
    }

    async extractServidoresDetodopeliculas(url) {
        console.log(`🎬 Extrayendo servidores de detodopeliculas con Puppeteer: ${url}`);
        
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Esperar a que cargue el reproductor
        await page.waitForSelector('.dooplay_player, #dooplay_player_response', { timeout: 10000 }).catch(() => {
            console.log('⚠️ No se encontró el reproductor');
        });
        
        // Extraer información de los iframes y opciones
        const servidores = await page.evaluate(() => {
            const servers = [];
            
            // Buscar iframes
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((iframe, idx) => {
                const src = iframe.src;
                if (src && src.includes('http')) {
                    let serverName = 'Reproductor';
                    if (src.includes('filemoon')) serverName = 'Filemoon';
                    else if (src.includes('voe')) serverName = 'VOE';
                    else if (src.includes('uqload')) serverName = 'Uqload';
                    else if (src.includes('fembed')) serverName = 'Fembed';
                    
                    servers.push({
                        server: serverName,
                        url: src,
                        tipo: 'iframe'
                    });
                }
            });
            
            // Buscar opciones del reproductor
            const options = document.querySelectorAll('.dooplay_player_option');
            options.forEach(opt => {
                const title = opt.querySelector('.title')?.textContent?.trim() || 'Opción';
                const dataPost = opt.getAttribute('data-post');
                const dataNume = opt.getAttribute('data-nume');
                
                if (dataPost && dataNume) {
                    servers.push({
                        server: title,
                        requiresAPI: true,
                        postId: dataPost,
                        nume: dataNume,
                        tipo: 'ajax',
                        message: 'Requiere llamada AJAX'
                    });
                }
            });
            
            return servers;
        });
        
        await page.close();
        
        console.log(`✅ Encontrados ${servidores.length} servidores en detodopeliculas`);
        return servidores;
    }

    async extractServidoresLamovie(url) {
        console.log(`🎬 Extrayendo servidores de lamovie con Puppeteer: ${url}`);
        
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Esperar a que cargue React
        await page.waitForTimeout(3000);
        
        // Extraer iframes y servidores
        const servidores = await page.evaluate(() => {
            const servers = [];
            
            // Buscar todos los iframes
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((iframe, idx) => {
                const src = iframe.src;
                if (src && src.includes('http')) {
                    let serverName = 'Reproductor';
                    if (src.includes('voe')) serverName = 'VOE';
                    else if (src.includes('filemoon')) serverName = 'Filemoon';
                    else if (src.includes('streamwish')) serverName = 'StreamWish';
                    else if (src.includes('vimeos')) serverName = 'Vimeos';
                    
                    servers.push({
                        server: serverName,
                        url: src,
                        tipo: 'iframe'
                    });
                }
            });
            
            // Buscar enlaces de video en el estado de React (puede estar en atributos data)
            const videoElements = document.querySelectorAll('[data-video-url], [data-src]');
            videoElements.forEach(el => {
                const videoUrl = el.getAttribute('data-video-url') || el.getAttribute('data-src');
                if (videoUrl && videoUrl.includes('http')) {
                    servers.push({
                        server: 'Video',
                        url: videoUrl,
                        tipo: 'direct'
                    });
                }
            });
            
            return servers;
        });
        
        await page.close();
        
        console.log(`✅ Encontrados ${servidores.length} servidores en lamovie`);
        return servidores;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('🔒 Navegador cerrado');
        }
    }
}

module.exports = new PuppeteerScraper();
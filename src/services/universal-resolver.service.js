const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class UniversalResolver {
    constructor() {
        this.browser = null;
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.8,en;q=0.5',
        };
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

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async resolveUrl(url, depth = 0) {
        if (depth > 5) {
            console.log('⚠️ Máxima profundidad alcanzada');
            return url;
        }

        console.log(`🔍 Resolviendo (nivel ${depth}): ${url.substring(0, 100)}`);

        try {
            // Si ya es un video directo
            if (url.match(/\.(mp4|mkv|avi|mov|webm|m3u8)$/i)) {
                console.log('✅ URL directa de video');
                return url;
            }

            // Manejar drop.download
            if (url.includes('drop.download')) {
                console.log('📥 Detectado drop.download, resolviendo...');
                const resolved = await this.resolveDropDownload(url);
                if (resolved !== url) return resolved;
            }

            // Manejar enlaces de estrenoscinesaa
            if (url.includes('estrenoscinesaa.com/links/')) {
                console.log('🔗 Enlace interno de estrenoscinesaa, resolviendo...');
                const resolved = await this.resolveInternalLink(url);
                if (resolved !== url) return resolved;
            }

            // Si es Mega, Drive, etc.
            if (url.includes('mega.nz')) {
                console.log('📦 Enlace de Mega.nz detectado');
                return url;
            }
            if (url.includes('drive.google.com')) {
                console.log('📁 Enlace de Google Drive detectado');
                return url;
            }
            if (url.includes('mediafire.com')) {
                console.log('📂 Enlace de MediaFire detectado');
                return url;
            }

            // Probar resolución con HTTP
            const httpResult = await this.resolveWithHttp(url);
            if (httpResult && httpResult !== url) {
                return await this.resolveUrl(httpResult, depth + 1);
            }

            // Si HTTP falla, usar Puppeteer
            const browserResult = await this.resolveWithBrowser(url);
            if (browserResult && browserResult !== url) {
                return await this.resolveUrl(browserResult, depth + 1);
            }

            console.log('⚠️ No se pudo resolver, devolviendo URL original');
            return url;

        } catch (error) {
            console.error(`❌ Error resolviendo: ${error.message}`);
            return url;
        }
    }

    async resolveDropDownload(url) {
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                maxRedirects: 5,
                timeout: 15000
            });
            
            const html = response.data;
            
            // Buscar enlace de descarga directa
            const directLink = html.match(/href=["']([^"']+\.mp4[^"']*)["']/i);
            if (directLink) return directLink[1];
            
            // Buscar botón de descarga
            const downloadBtn = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
            if (downloadBtn) return downloadBtn[1];
            
            return url;
        } catch (error) {
            console.error('Error en drop.download:', error.message);
            return url;
        }
    }

    async resolveInternalLink(url) {
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 15000
            });
            
            const html = response.data;
            
            // Buscar la URL de destino
            const patterns = [
                /window\.location\.href\s*=\s*['"]([^'"]+)['"]/,
                /<a[^>]+href=["']([^"']+)["'][^>]*>Continuar<\/a>/i,
                /<meta[^>]+url=([^"'\s>]+)/i
            ];
            
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match && match[1] && !match[1].includes('estrenoscinesaa')) {
                    console.log(`✅ Enlace interno resuelto: ${match[1]}`);
                    return match[1];
                }
            }
            
            return url;
        } catch (error) {
            return url;
        }
    }

    async resolveWithHttp(url) {
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                maxRedirects: 5,
                timeout: 15000
            });

            const html = response.data;
            const $ = cheerio.load(html);

            const videoSrc = $('video source').attr('src') || $('video').attr('src');
            if (videoSrc) return videoSrc;

            const iframeSrc = $('iframe').attr('src');
            if (iframeSrc && iframeSrc !== url) return iframeSrc;

            const downloadLink = $('a[href*="download"], a[href*="mega"], a[href*="drive"], a[href*="mediafire"]').first().attr('href');
            if (downloadLink) return downloadLink;

            return url;
        } catch (error) {
            return url;
        }
    }

    async resolveWithBrowser(url) {
        let page = null;
        try {
            const browser = await this.getBrowser();
            page = await browser.newPage();
            
            await page.setUserAgent(this.headers['User-Agent']);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            const clicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('a, button, .btn'));
                const continueBtn = buttons.find(btn => 
                    btn.textContent.toLowerCase().includes('continuar')
                );
                if (continueBtn) {
                    continueBtn.click();
                    return true;
                }
                return false;
            });
            
            if (clicked) {
                console.log('✅ Botón "Continuar" clickeado');
                await this.wait(3000);
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
            }
            
            const finalUrl = page.url();
            await page.close();
            
            return finalUrl !== url ? finalUrl : null;
            
        } catch (error) {
            if (page) await page.close();
            return null;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = new UniversalResolver();
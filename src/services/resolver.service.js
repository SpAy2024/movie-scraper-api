const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

class ResolverService {
    constructor() {
        this.downloadsDir = process.env.DOWNLOADS_DIR || 'downloads';
        this.browser = null; // Para puppeteer reutilizable
        
        // Crear directorio de descargas si no existe
        if (!fs.existsSync(this.downloadsDir)) {
            fs.mkdirSync(this.downloadsDir, { recursive: true });
        }
    }

    // Añade este método a la clase ResolverService
async resolveEstrenosCinesaa(linkUrl) {
    console.log(`🔍 Resolviendo enlace de estrenoscinesaa: ${linkUrl}`);
    
    try {
        // Primero, obtener la página con el contador
        const response = await axios.get(linkUrl, {
            headers: this.headers,
            timeout: 15000,
        });
        
        const $ = cheerio.load(response.data);
        
        // Buscar el enlace de "Continuar" o el enlace oculto
        let finalUrl = null;
        
        // Opción 1: Botón de continuar
        const continueLink = $('a:contains("Continuar"), .btn-continuar, button:contains("Continuar")').attr('href');
        if (continueLink) {
            finalUrl = continueLink;
        }
        
        // Opción 2: Enlace en un script o data
        if (!finalUrl) {
            const scriptMatch = response.data.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
            if (scriptMatch) finalUrl = scriptMatch[1];
        }
        
        // Opción 3: Meta refresh
        if (!finalUrl) {
            const metaRefresh = response.data.match(/<meta\s+http-equiv=["']refresh["']\s+content=["']\d+;\s*url=([^"']+)["']/i);
            if (metaRefresh) finalUrl = metaRefresh[1];
        }
        
        if (finalUrl) {
            console.log(`✅ Enlace resuelto: ${finalUrl}`);
            return finalUrl;
        }
        
        return linkUrl;
        
    } catch (error) {
        console.error(`❌ Error resolviendo enlace:`, error.message);
        return linkUrl;
    }
}

    /**
     * Obtiene la URL real de descarga desde un enlace acortado o protegido
     */
    async resolveUrl(url, options = {}) {
        const { type = 'direct', useBrowser = false } = options;
        
        console.log(`🔍 Resolviendo URL: ${url}`);
        
        // Caso 1: Enlace directo
        if (type === 'direct' || url.match(/\.(mp4|mkv|avi|mov)$/i)) {
            return url;
        }
        
        // Caso 2: YourUpload (enlace directo después de seguir redirects)
        if (url.includes('yourupload.com')) {
            return await this.resolveYourUpload(url);
        }
        
        // Caso 3: Mega (requiere API o librería especial)
        if (url.includes('mega.nz')) {
            return await this.resolveMega(url);
        }
        
        // Caso 4: StreamWish o similares (requieren puppeteer)
        if (url.includes('streamwish') || url.includes('dood') || useBrowser) {
            return await this.resolveWithBrowser(url);
        }
        
        // Por defecto, intentar seguir redirects
        return await this.followRedirects(url);
    }

    /**
     * Resuelve enlaces de YourUpload
     */
    async resolveYourUpload(url) {
        try {
            const response = await axios.get(url, {
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                },
            });
            
            // Buscar el enlace al video en el HTML
            const videoMatch = response.data.match(/source:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i);
            if (videoMatch) return videoMatch[1];
            
            const iframeMatch = response.data.match(/<iframe[^>]+src=["']([^"']+)["']/i);
            if (iframeMatch) return await this.followRedirects(iframeMatch[1]);
            
            return response.request.res.responseUrl || url;
        } catch (error) {
            console.error('Error resolving YourUpload:', error.message);
            return url;
        }
    }

    /**
     * Resuelve Mega (simplificado - para producción usar mega.js)
     */
    async resolveMega(url) {
        // Nota: Mega requiere autenticación y manejo de archivos
        // Esta es una versión simplificada
        console.log('⚠️ Mega requiere implementación adicional con mega.js');
        return url;
    }

    /**
     * Usa Puppeteer para sitios con protección JS
     */
    async resolveWithBrowser(url) {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }
        
        const page = await this.browser.newPage();
        
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Esperar un momento para que cargue el reproductor
            await page.waitForTimeout(5000);
            
            // Buscar enlace de video
            const videoUrl = await page.evaluate(() => {
                // Buscar elemento video
                const video = document.querySelector('video');
                if (video && video.src) return video.src;
                
                // Buscar enlaces .m3u8
                const m3u8 = document.querySelector('link[href*=".m3u8"], script[src*=".m3u8"]');
                if (m3u8) return m3u8.href || m3u8.src;
                
                // Buscar en iframes
                const iframe = document.querySelector('iframe');
                if (iframe && iframe.src) return iframe.src;
                
                return null;
            });
            
            if (videoUrl) return videoUrl;
            
            // Si no se encuentra, devolver la URL actual
            return page.url();
            
        } catch (error) {
            console.error('Error in browser resolution:', error.message);
            return url;
        } finally {
            await page.close();
        }
    }

    /**
     * Sigue redirects hasta obtener la URL final
     */
    async followRedirects(url, maxRedirects = 5) {
        let currentUrl = url;
        for (let i = 0; i < maxRedirects; i++) {
            try {
                const response = await axios.head(currentUrl, {
                    maxRedirects: 0,
                    validateStatus: status => status >= 200 && status < 400,
                });
                
                if (response.headers.location) {
                    const location = response.headers.location;
                    currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
                } else {
                    return currentUrl;
                }
            } catch (error) {
                if (error.response && error.response.status === 302) {
                    currentUrl = error.response.headers.location;
                } else {
                    return currentUrl;
                }
            }
        }
        return currentUrl;
    }

    /**
     * Descarga un archivo desde una URL
     */
    async downloadFile(url, outputPath, onProgress = null) {
        const writer = fs.createWriteStream(outputPath);
        
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });
        
        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;
        
        response.data.on('data', (chunk) => {
            downloadedLength += chunk.length;
            if (onProgress && totalLength) {
                const percent = (downloadedLength / totalLength) * 100;
                onProgress(percent, downloadedLength, totalLength);
            }
        });
        
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(outputPath));
            writer.on('error', reject);
        });
    }

    /**
     * Descarga streams HLS (.m3u8) usando ffmpeg
     */
    async downloadHLS(m3u8Url, outputPath, onProgress = null) {
        return new Promise((resolve, reject) => {
            const command = ffmpeg(m3u8Url)
                .outputOptions([
                    '-c copy',
                    '-bsf:a aac_adtstoasc',
                ])
                .on('progress', (progress) => {
                    if (onProgress && progress.percent) {
                        onProgress(progress.percent);
                    }
                })
                .on('end', () => resolve(outputPath))
                .on('error', reject);
            
            command.save(outputPath);
        });
    }

    /**
     * Detecta el tipo de contenido y descarga apropiadamente
     */
    async download(url, filename, onProgress = null) {
        const outputPath = path.join(this.downloadsDir, filename);
        
        // Verificar si es HLS
        if (url.includes('.m3u8')) {
            return await this.downloadHLS(url, outputPath, onProgress);
        }
        
        // Descarga normal
        const finalUrl = await this.resolveUrl(url);
        return await this.downloadFile(finalUrl, outputPath, onProgress);
    }

    /**
     * Cierra el navegador de Puppeteer al finalizar
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = new ResolverService();
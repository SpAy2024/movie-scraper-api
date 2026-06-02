const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { extractStreamwish } = require('../utils/streamwish-resolver');

const execPromise = util.promisify(exec);

class ResolverService {
  constructor() {
    this.downloadsDir = process.env.DOWNLOADS_DIR || path.join(process.cwd(), 'downloads');
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT_MS) || 15000;
    this.debug = process.env.DEBUG_DOWNLOAD === 'true';
    
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
    }
    
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Referer': 'https://www.google.com/'
    };
  }
  
  log(message, data = null) {
    if (this.debug) {
      console.log(`[Resolver] ${message}`);
      if (data) console.log(data);
    }
  }
  
  identifyServer(url) {
    const servers = [
      { name: 'StreamWish', patterns: [/streamwish\.(to|com)/, /streamwish/i] },
      { name: 'Filemoon', patterns: [/filemoon\.sx/, /filemoon/i] },
      { name: 'VidHide', patterns: [/vidhide\.com/, /vidhide/i] },
      { name: 'VOE', patterns: [/voe\.sx/, /voe/i] },
      { name: 'Doodstream', patterns: [/doodstream\.com/, /dood/i] },
      { name: 'Uqload', patterns: [/uqload\.(com|is)/, /uqload/i] },
      { name: 'Mega', patterns: [/mega\.nz/, /mega/i] },
      { name: 'MediaFire', patterns: [/mediafire\.com/, /mediafire/i] },
      { name: 'YouTube', patterns: [/youtube\.com/, /youtu\.be/] },
      { name: '1Fichier', patterns: [/1fichier\.com/, /1fichier/i] },
      { name: 'MP4Upload', patterns: [/mp4upload\.com/, /mp4upload/i] }
    ];
    
    for (const server of servers) {
      for (const pattern of server.patterns) {
        if (pattern.test(url)) return server.name;
      }
    }
    return 'Servidor';
  }
  
  async resolveUrl(url, maxRedirects = 10) {
    this.log(`Resolviendo URL: ${url}`);
    
    // Verificar si es StreamWish
    if (url.includes('streamwish')) {
      const resolved = await extractStreamwish(url);
      if (resolved) return resolved;
    }
    
    let currentUrl = url;
    let redirectCount = 0;
    
    while (redirectCount < maxRedirects) {
      try {
        const response = await axios.get(currentUrl, {
          headers: this.headers,
          maxRedirects: 0,
          validateStatus: status => status < 400 || status === 302,
          timeout: this.timeout
        });
        
        if (response.headers.location) {
          currentUrl = response.headers.location;
          redirectCount++;
          this.log(`Redirigiendo a: ${currentUrl}`);
          continue;
        }
        
        const html = response.data;
        
        const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (iframeMatch && iframeMatch[1]) {
          const iframeUrl = iframeMatch[1];
          this.log(`Iframe encontrado: ${iframeUrl}`);
          return iframeUrl;
        }
        
        const metaMatch = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']+url=([^"']+)/i);
        if (metaMatch && metaMatch[1]) {
          currentUrl = metaMatch[1];
          redirectCount++;
          this.log(`Meta refresh a: ${currentUrl}`);
          continue;
        }
        
        break;
        
      } catch (error) {
        this.log(`Error en resolución: ${error.message}`);
        break;
      }
    }
    
    return currentUrl;
  }
  
  async downloadVideo(url, filename, onProgress = null) {
    const outputPath = path.join(this.downloadsDir, filename);
    this.log(`Iniciando descarga: ${filename}`);
    
    try {
      if (url.includes('.m3u8')) {
        return await this.downloadHLS(url, outputPath, onProgress);
      }
      
      const response = await axios({
        method: 'GET',
        url: url,
        headers: this.headers,
        responseType: 'stream',
        timeout: parseInt(process.env.DOWNLOAD_REQUEST_TIMEOUT_MS) || 120000
      });
      
      const totalLength = parseInt(response.headers['content-length']);
      const writer = fs.createWriteStream(outputPath);
      
      let downloaded = 0;
      response.data.on('data', (chunk) => {
        downloaded += chunk.length;
        if (onProgress && totalLength) {
          const percent = (downloaded / totalLength) * 100;
          onProgress(Math.min(percent, 99.9));
        }
      });
      
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          if (onProgress) onProgress(100);
          this.log(`Descarga completada: ${outputPath}`);
          resolve(outputPath);
        });
        writer.on('error', reject);
      });
      
    } catch (error) {
      this.log(`Error en descarga: ${error.message}`);
      throw error;
    }
  }
  
  async downloadHLS(url, outputPath, onProgress = null) {
    try {
      const command = `ffmpeg -i "${url}" -c copy -bsf:a aac_adtstoasc "${outputPath}" -y`;
      this.log(`Ejecutando ffmpeg: ${command}`);
      
      const { stdout, stderr } = await execPromise(command);
      
      if (onProgress) onProgress(100);
      this.log(`HLS descargado: ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      this.log(`Error en HLS: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ResolverService();
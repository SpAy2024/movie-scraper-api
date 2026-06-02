const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const resolverService = require('./resolver.service');

class DownloadService {
  constructor() {
    this.downloadsDir = process.env.DOWNLOADS_DIR || path.join(process.cwd(), 'downloads');
    this.downloads = new Map();
    this.batches = new Map();
    this.debug = process.env.DEBUG_DOWNLOAD === 'true';
    
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
    }
  }
  
  log(message, data = null) {
    if (this.debug) {
      console.log(`[DownloadService] ${message}`);
      if (data) console.log(data);
    }
  }
  
  generateId() {
    return crypto.randomBytes(8).toString('hex');
  }
  
  sanitizeFilename(title) {
    return title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\u00f1\u00d1]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 100);
  }
  
  createDownload(data, baseUrl) {
    const { url, title, provider, quality = 'HD' } = data;
    
    if (!url || !title) {
      throw new Error('Se requieren url y title');
    }
    
    const id = this.generateId();
    const filename = `${this.sanitizeFilename(title)}_${quality}.mp4`;
    const filepath = path.join(this.downloadsDir, filename);
    
    const download = {
      id,
      url,
      title,
      provider,
      quality,
      filename,
      filepath,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      statusUrl: `${baseUrl}/api/v1/movies/download/${id}`
    };
    
    this.downloads.set(id, download);
    
    // Iniciar descarga en segundo plano
    this._startDownload(id);
    
    return download;
  }
  
  async _startDownload(id) {
    const download = this.downloads.get(id);
    if (!download) return;
    
    download.status = 'downloading';
    download.startedAt = new Date().toISOString();
    
    try {
      const resolvedUrl = await resolverService.resolveUrl(download.url);
      
      const result = await resolverService.downloadVideo(resolvedUrl, download.filename, (percent) => {
        download.progress = percent;
      });
      
      download.status = 'completed';
      download.completedAt = new Date().toISOString();
      download.filepath = result;
      
      this.log(`Descarga completada: ${download.filename}`);
      
    } catch (error) {
      download.status = 'failed';
      download.error = error.message;
      this.log(`Error en descarga: ${error.message}`);
    }
  }
  
  getDownload(id) {
    return this.downloads.get(id) || null;
  }
  
  createBatch(data, baseUrl) {
    const { urls, provider, quality = 'HD' } = data;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error('Se requiere un array urls');
    }
    
    const id = this.generateId();
    const downloads = [];
    
    for (const item of urls) {
      const downloadData = {
        url: item.url,
        title: item.title,
        provider: provider || item.provider,
        quality: quality || item.quality
      };
      
      const download = this.createDownload(downloadData, baseUrl);
      downloads.push(download);
    }
    
    const batch = {
      id,
      downloads,
      total: downloads.length,
      completed: 0,
      failed: 0,
      status: 'processing',
      createdAt: new Date().toISOString(),
      statusUrl: `${baseUrl}/api/v1/movies/batch/${id}`
    };
    
    this.batches.set(id, batch);
    
    // Monitorear progreso del lote
    this._monitorBatch(id);
    
    return batch;
  }
  
  async _monitorBatch(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    const checkInterval = setInterval(() => {
      const currentBatch = this.batches.get(batchId);
      if (!currentBatch) {
        clearInterval(checkInterval);
        return;
      }
      
      let completed = 0;
      let failed = 0;
      
      for (const download of currentBatch.downloads) {
        const currentDownload = this.downloads.get(download.id);
        if (currentDownload) {
          download.status = currentDownload.status;
          download.progress = currentDownload.progress;
          
          if (currentDownload.status === 'completed') completed++;
          if (currentDownload.status === 'failed') failed++;
        }
      }
      
      currentBatch.completed = completed;
      currentBatch.failed = failed;
      
      if (completed + failed === currentBatch.total) {
        currentBatch.status = 'completed';
        clearInterval(checkInterval);
      }
    }, 1000);
  }
  
  getBatch(id) {
    const batch = this.batches.get(id);
    if (!batch) return null;
    
    // Actualizar estado de los downloads
    for (const download of batch.downloads) {
      const current = this.downloads.get(download.id);
      if (current) {
        download.status = current.status;
        download.progress = current.progress;
      }
    }
    
    return batch;
  }
}

module.exports = new DownloadService();
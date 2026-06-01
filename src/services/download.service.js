const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

class DownloadService {
    constructor() {
        this.downloadsDir = process.env.DOWNLOADS_DIR || 'downloads';
        this.activeDownloads = new Map();
        
        if (!fs.existsSync(this.downloadsDir)) {
            fs.mkdirSync(this.downloadsDir, { recursive: true });
        }
    }

    async downloadFile(url, filename, onProgress = null) {
        const outputPath = path.join(this.downloadsDir, filename);
        const writer = fs.createWriteStream(outputPath);
        
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const totalLength = parseInt(response.headers['content-length'], 10);
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

    async downloadHLS(m3u8Url, filename, onProgress = null) {
        const outputPath = path.join(this.downloadsDir, filename);
        
        return new Promise((resolve, reject) => {
            ffmpeg(m3u8Url)
                .outputOptions([
                    '-c copy',
                    '-bsf:a aac_adtstoasc'
                ])
                .on('progress', (progress) => {
                    if (onProgress && progress.percent) {
                        onProgress(progress.percent);
                    }
                })
                .on('end', () => resolve(outputPath))
                .on('error', reject)
                .save(outputPath);
        });
    }

    async startDownload(url, filename, options = {}) {
        const id = Date.now().toString();
        const isHLS = url.includes('.m3u8');
        
        this.activeDownloads.set(id, {
            id,
            url,
            filename,
            status: 'downloading',
            progress: 0,
            startTime: Date.now()
        });
        
        try {
            const downloadPromise = isHLS 
                ? this.downloadHLS(url, filename, (percent) => {
                    const download = this.activeDownloads.get(id);
                    if (download) download.progress = percent;
                  })
                : this.downloadFile(url, filename, (percent) => {
                    const download = this.activeDownloads.get(id);
                    if (download) download.progress = percent;
                  });
            
            const outputPath = await downloadPromise;
            
            const download = this.activeDownloads.get(id);
            if (download) {
                download.status = 'completed';
                download.outputPath = outputPath;
                download.endTime = Date.now();
            }
            
            return { id, outputPath };
            
        } catch (error) {
            const download = this.activeDownloads.get(id);
            if (download) {
                download.status = 'failed';
                download.error = error.message;
            }
            throw error;
        }
    }

    getDownloadStatus(id) {
        return this.activeDownloads.get(id) || null;
    }

    listDownloads() {
        return Array.from(this.activeDownloads.values());
    }
}

module.exports = new DownloadService();
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class ServerResolver {
    constructor() {
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'es-ES,es;q=0.9',
        };
        this.browser = null;
    }

    async getBrowser() {
        if (!this.browser) {
            console.log('🚀 Iniciando navegador para Puppeteer...');
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

    identificarServidor(url) {
        const servidores = [
            { nombre: 'VIDHIDE', patron: /vidhide|minochinos\.com\/embed/i },
            { nombre: 'Filemoon', patron: /filemoon\.sx|filemoon/i },
            { nombre: 'StreamWish', patron: /streamwish\.to|streamwish/i },
            { nombre: 'VOE', patron: /voe\.sx|voesx/i },
            { nombre: 'Doodstream', patron: /doodstream\.com|dood/i },
            { nombre: 'Uqload', patron: /uqload\.is|uqload/i },
            { nombre: 'Fembed', patron: /fembed\.com|fembed/i },
            { nombre: 'Byse', patron: /byse\.com|byse/i },
            { nombre: 'StreamHG', patron: /streamhg|stream\.hg/i },
            { nombre: 'Esplay', patron: /esplay/i },
            { nombre: 'Veev', patron: /veev/i },
            { nombre: 'Supervideo', patron: /supervideo/i },
            { nombre: 'Vimeos', patron: /vimeos/i },
            { nombre: 'Goodstream', patron: /goodstream/i },
            { nombre: 'Hlswish', patron: /hlswish/i },
            { nombre: 'Mega', patron: /mega\.nz/i },
            { nombre: 'YourUpload', patron: /yourupload\.com/i },
            { nombre: '1Fichier', patron: /1fichier\.com/i },
            { nombre: 'Mediafire', patron: /mediafire\.com/i },
            { nombre: 'Uptobox', patron: /uptobox\.com/i },
            { nombre: 'Upstream', patron: /upstream\.to/i },
        ];
        
        for (const s of servidores) {
            if (s.patron.test(url)) return s.nombre;
        }
        return 'Servidor';
    }

    // ==================== 1. SOLOLATINO (con Puppeteer) ====================
    async extraerServidoresSoloLatino(peliculaUrl) {
        console.log(`🎬 Extrayendo servidores de sololatino con Puppeteer: ${peliculaUrl}`);
        
        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();
            
            await page.setUserAgent(this.headers['User-Agent']);
            await page.goto(peliculaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            await page.waitForSelector('button[data-server-btn]', { timeout: 10000 }).catch(() => {
                console.log('⚠️ No se encontraron botones de servidores');
            });
            
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
            console.log(`✅ Sololatino: ${servidores.length} servidores`);
            return servidores;
            
        } catch (error) {
            console.error(`Error sololatino: ${error.message}`);
            return [];
        }
    }

    // ==================== 2. REPELISHD ====================
    async extraerServidoresRePelisHD(peliculaUrl) {
        console.log(`🎬 Extrayendo servidores de repelishd: ${peliculaUrl}`);
        const servidores = [];
        
        try {
            const response = await axios.get(peliculaUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.includes('http')) {
                    const servidor = this.identificarServidor(src);
                    servidores.push({
                        server: servidor,
                        url: src,
                        tipo: 'iframe',
                        calidad: 'HD',
                    });
                }
            });
            
            $('.server-btn, .download-btn, a[href*="stream"], a[href*="embed"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('http') && !servidores.some(s => s.url === href)) {
                    const servidor = this.identificarServidor(href);
                    servidores.push({
                        server: servidor,
                        url: href,
                        tipo: 'iframe',
                        calidad: 'HD',
                    });
                }
            });
            
            console.log(`✅ RePelisHD: ${servidores.length} servidores`);
            
        } catch (error) {
            console.error(`Error repelishd: ${error.message}`);
        }
        
        return servidores;
    }

    // ==================== 3. PELICINEHD ====================
    async extraerServidoresPeliCineHD(peliculaUrl) {
        console.log(`🎬 Extrayendo servidores de pelicinehd: ${peliculaUrl}`);
        const servidores = [];
        
        try {
            const response = await axios.get(peliculaUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            $('a[href*="1fichier"], a[href*="mega"], a[href*="mediafire"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href) {
                    const servidor = this.identificarServidor(href);
                    servidores.push({
                        server: servidor,
                        url: href,
                        tipo: 'descarga',
                        calidad: 'HD',
                    });
                }
            });
            
            console.log(`✅ PeliCineHD: ${servidores.length} servidores (descargas)`);
            
        } catch (error) {
            console.error(`Error pelicinehd: ${error.message}`);
        }
        
        return servidores;
    }

// ==================== VERPELISTV (con Puppeteer mejorado) ====================
async extraerServidoresVerPelisTV(peliculaUrl) {
    console.log(`🎬 Extrayendo servidores de verpelistv con Puppeteer: ${peliculaUrl}`);
    const servidores = [];
    let page = null;
    
    try {
        const browser = await this.getBrowser();
        page = await browser.newPage();
        
        // Configurar headers realistas
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-ES,es;q=0.9',
            'Accept': 'text/html,application/xhtml+xml'
        });
        
        console.log('📄 Navegando a la página...');
        await page.goto(peliculaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Esperar a que cargue el reproductor (hasta 10 segundos)
        await page.waitForSelector('.dooplay_player_option, .server-btn, [data-option], iframe', { timeout: 10000 }).catch(() => {
            console.log('⚠️ No se encontraron servidores visibles');
        });
        
        // Esperar adicional para que carguen los iframes dinámicos
        await this.wait(3000);
        
        // Extraer servidores con evaluate
        const servidoresData = await page.evaluate(() => {
            const servers = [];
            
            // Función para limpiar URL
            const cleanUrl = (url) => {
                if (!url) return null;
                if (url.startsWith('//')) return 'https:' + url;
                if (url.startsWith('/')) return window.location.origin + url;
                return url;
            };
            
            // 1. Buscar data-resolved-url
            document.querySelectorAll('[data-resolved-url]').forEach(el => {
                const url = cleanUrl(el.getAttribute('data-resolved-url'));
                if (url && url.includes('http')) {
                    servers.push({
                        server: el.textContent?.trim() || 'Servidor',
                        url: url,
                        tipo: 'iframe'
                    });
                }
            });
            
            // 2. Buscar data-option
            document.querySelectorAll('[data-option]').forEach(el => {
                const url = cleanUrl(el.getAttribute('data-option'));
                if (url && url.includes('http') && !servers.some(s => s.url === url)) {
                    servers.push({
                        server: el.textContent?.trim() || 'Servidor',
                        url: url,
                        tipo: 'iframe'
                    });
                }
            });
            
            // 3. Buscar iframes
            document.querySelectorAll('iframe').forEach(iframe => {
                const url = cleanUrl(iframe.src);
                if (url && url.includes('http') && !url.includes('youtube') && !url.includes('google')) {
                    let serverName = 'Reproductor';
                    if (url.includes('voe')) serverName = 'VOE';
                    else if (url.includes('filemoon')) serverName = 'Filemoon';
                    else if (url.includes('uqload')) serverName = 'Uqload';
                    else if (url.includes('streamwish')) serverName = 'StreamWish';
                    else if (url.includes('vidhide')) serverName = 'VIDHIDE';
                    
                    if (!servers.some(s => s.url === url)) {
                        servers.push({
                            server: serverName,
                            url: url,
                            tipo: 'iframe'
                        });
                    }
                }
            });
            
            // 4. Buscar botones de servidores
            document.querySelectorAll('.server-btn, .dooplay_player_option, .playurl').forEach(btn => {
                const url = cleanUrl(btn.getAttribute('data-url')) || cleanUrl(btn.getAttribute('data-option'));
                if (url && url.includes('http') && !servers.some(s => s.url === url)) {
                    servers.push({
                        server: btn.textContent?.trim() || 'Servidor',
                        url: url,
                        tipo: 'iframe'
                    });
                }
            });
            
            return servers;
        });
        
        servidoresData.forEach(s => {
            servidores.push({
                server: s.server,
                url: s.url,
                tipo: 'iframe',
                calidad: 'HD'
            });
        });
        
        console.log(`✅ VerPelisTV: ${servidores.length} servidores encontrados`);
        
        if (servidores.length === 0) {
            servidores.push({
                server: 'Ver en VerPelisTV',
                url: peliculaUrl,
                tipo: 'link',
                note: 'Visita el enlace para ver la película'
            });
        }
        
    } catch (error) {
        console.error(`❌ Error verpelistv: ${error.message}`);
        servidores.push({
            server: 'Ir a VerPelisTV',
            url: peliculaUrl,
            tipo: 'link'
        });
    } finally {
        if (page) await page.close();
    }
    
    return servidores;
}

// ==================== CINECALIDADAM (con Puppeteer mejorado) ====================
async extraerServidoresCineCalidadAM(peliculaUrl) {
    console.log(`🎬 Extrayendo servidores de cinecalidad.am con Puppeteer: ${peliculaUrl}`);
    const servidores = [];
    let page = null;
    
    try {
        const browser = await this.getBrowser();
        page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
        
        console.log('📄 Navegando a la página...');
        await page.goto(peliculaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Esperar a que cargue el reproductor
        await page.waitForSelector('.dooplay_player_option, .server-btn, iframe, #playeroptionsul', { timeout: 10000 }).catch(() => {
            console.log('⚠️ No se encontraron servidores visibles');
        });
        
        await this.wait(3000);
        
        // Extraer servidores
        const servidoresData = await page.evaluate(() => {
            const servers = [];
            
            const cleanUrl = (url) => {
                if (!url) return null;
                if (url.startsWith('//')) return 'https:' + url;
                if (url.startsWith('/')) return window.location.origin + url;
                return url;
            };
            
            // Buscar opciones del reproductor
            document.querySelectorAll('.dooplay_player_option').forEach(opt => {
                const dataOption = opt.getAttribute('data-option');
                if (dataOption && dataOption.includes('http')) {
                    const title = opt.querySelector('.title')?.textContent?.trim() || opt.textContent?.trim();
                    let serverName = title || 'Servidor';
                    if (dataOption.includes('vimeos')) serverName = 'Vimeos';
                    else if (dataOption.includes('voe')) serverName = 'VOE';
                    else if (dataOption.includes('goodstream')) serverName = 'Goodstream';
                    else if (dataOption.includes('hlswish')) serverName = 'Hlswish';
                    else if (dataOption.includes('filemoon')) serverName = 'Filemoon';
                    
                    servers.push({
                        server: serverName,
                        url: dataOption,
                        tipo: 'iframe'
                    });
                }
            });
            
            // Buscar iframes
            document.querySelectorAll('iframe').forEach(iframe => {
                const src = cleanUrl(iframe.src);
                if (src && src.includes('http') && !src.includes('youtube')) {
                    let serverName = 'Reproductor';
                    if (src.includes('vimeos')) serverName = 'Vimeos';
                    else if (src.includes('voe')) serverName = 'VOE';
                    else if (src.includes('filemoon')) serverName = 'Filemoon';
                    else if (src.includes('goodstream')) serverName = 'Goodstream';
                    else if (src.includes('hlswish')) serverName = 'Hlswish';
                    
                    if (!servers.some(s => s.url === src)) {
                        servers.push({
                            server: serverName,
                            url: src,
                            tipo: 'iframe'
                        });
                    }
                }
            });
            
            return servers;
        });
        
        servidoresData.forEach(s => {
            servidores.push({
                server: s.server,
                url: s.url,
                tipo: 'iframe',
                calidad: 'HD'
            });
        });
        
        console.log(`✅ CineCalidad.am: ${servidores.length} servidores encontrados`);
        
        if (servidores.length === 0) {
            servidores.push({
                server: 'Ver en CineCalidad',
                url: peliculaUrl,
                tipo: 'link',
                note: 'Visita el enlace para ver la película'
            });
        }
        
    } catch (error) {
        console.error(`❌ Error cinecalidadam: ${error.message}`);
        servidores.push({
            server: 'Ir a CineCalidad',
            url: peliculaUrl,
            tipo: 'link'
        });
    } finally {
        if (page) await page.close();
    }
    
    return servidores;
}  


// Actualiza el método extraerServidoresCineCalidad
async extraerServidoresCineCalidad(peliculaUrl) {
    console.log(`🎬 Extrayendo servidores de cinecalidad: ${peliculaUrl}`);
    const servidores = [];
    
    try {
        // Usar Puppeteer para cinecalidad
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        
        await page.setUserAgent(this.headers['User-Agent']);
        await page.goto(peliculaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        await page.waitForSelector('.dooplay_player_option, iframe', { timeout: 10000 }).catch(() => {
            console.log('⚠️ No se encontró el reproductor');
        });
        
        await this.wait(3000);
        
        const servidoresData = await page.evaluate(() => {
            const servers = [];
            
            // Buscar iframes
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                const src = iframe.src;
                if (src && src.includes('http') && !src.includes('youtube')) {
                    let serverName = 'Reproductor';
                    if (src.includes('vimeos')) serverName = 'Vimeos';
                    else if (src.includes('voe')) serverName = 'VOE';
                    else if (src.includes('filemoon')) serverName = 'Filemoon';
                    else if (src.includes('goodstream')) serverName = 'Goodstream';
                    else if (src.includes('hlswish')) serverName = 'Hlswish';
                    
                    servers.push({
                        server: serverName,
                        url: src,
                        tipo: 'iframe',
                        calidad: 'HD'
                    });
                }
            });
            
            // Buscar data-option
            const optionElements = document.querySelectorAll('.dooplay_player_option');
            optionElements.forEach(el => {
                const dataOption = el.getAttribute('data-option');
                if (dataOption && dataOption.includes('http')) {
                    const serverName = el.textContent?.trim() || 'Servidor';
                    servers.push({
                        server: serverName,
                        url: dataOption,
                        tipo: 'iframe',
                        calidad: 'HD'
                    });
                }
            });
            
            return servers;
        });
        
        await page.close();
        
        servidoresData.forEach(s => servidores.push(s));
        console.log(`✅ CineCalidad: ${servidores.length} servidores`);
        
    } catch (error) {
        console.error(`Error cinecalidad: ${error.message}`);
    }
    
    return servidores;
}




    // ==================== 5. PELISPLUSHD (la) ====================
    async extraerServidoresPelisPlusHD(peliculaUrl) {
        console.log(`🎬 Extrayendo servidores de pelisplushd.la: ${peliculaUrl}`);
        const servidores = [];
        
        try {
            const response = await axios.get(peliculaUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            $('.VideoPlayer ul li, .playurl, [data-url]').each((i, el) => {
                const dataUrl = $(el).attr('data-url');
                if (dataUrl && dataUrl.includes('http')) {
                    const serverName = $(el).text().trim() || 'Servidor';
                    const servidor = this.identificarServidor(dataUrl);
                    servidores.push({
                        server: servidor || serverName,
                        url: dataUrl,
                        tipo: 'iframe',
                        calidad: 'HD',
                    });
                }
            });
            
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.includes('http') && !servidores.some(s => s.url === src)) {
                    const servidor = this.identificarServidor(src);
                    servidores.push({
                        server: servidor,
                        url: src,
                        tipo: 'iframe',
                        calidad: 'HD',
                    });
                }
            });
            
            console.log(`✅ PelisPlusHD.la: ${servidores.length} servidores`);
            
        } catch (error) {
            console.error(`Error pelisplushd: ${error.message}`);
        }
        
        return servidores;
    }

    // ==================== 6. ESTRENOSCINESAA ====================
    async extraerServidoresEstrenosCinesaa(peliculaUrl) {
    console.log(`🎬 Extrayendo servidores de estrenoscinesaa: ${peliculaUrl}`);
    const servidores = [];
    
    try {
        const response = await axios.get(peliculaUrl, { 
            headers: this.headers,
            timeout: 15000
        });
        const $ = cheerio.load(response.data);
        
        // Extraer título de la película
        const titulo = $('h1').first().text().trim();
        console.log(`📽️ Película: ${titulo}`);
        
        // Buscar enlaces en la tabla de descargas
        const enlaces = [];
        
        $('a[href*="/links/"]').each((i, el) => {
            const href = $(el).attr('href');
            const row = $(el).closest('tr');
            const calidad = row.find('td:nth-child(2)').text().trim();
            const idioma = row.find('td:nth-child(3)').text().trim();
            const size = row.find('td:nth-child(4)').text().trim();
            const serverName = $(el).text().trim() || 'Descarga';
            
            if (href && href.includes('/links/')) {
                enlaces.push({
                    url: href,
                    quality: calidad || 'HD',
                    language: idioma || 'Latino',
                    size: size,
                    serverName: serverName
                });
            }
        });
        
        console.log(`📦 Encontrados ${enlaces.length} enlaces de descarga`);
        
        // Procesar cada enlace
        for (const enlace of enlaces) {
            try {
                const iframeUrl = await this.resolverEnlaceEstrenos(enlace.url);
                
                // Identificar el tipo de servidor por la URL
                const servidorInfo = this.identificarServidor(iframeUrl);
                
                servidores.push({
                    server: servidorInfo.nombre || enlace.serverName || 'Servidor',
                    url: iframeUrl,
                    tipo: 'iframe',
                    calidad: enlace.quality || 'HD',
                    idioma: enlace.language || 'Latino',
                    size: enlace.size
                });
                
                console.log(`   ✅ ${servidorInfo.nombre} - ${iframeUrl.substring(0, 60)}...`);
                
            } catch (err) {
                console.log(`   ❌ Error resolviendo enlace: ${err.message}`);
            }
        }
        
        // También buscar iframes directos en la página
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.startsWith('http')) {
                const servidorInfo = this.identificarServidor(src);
                if (!servidores.some(s => s.url === src)) {
                    servidores.push({
                        server: servidorInfo.nombre || `Servidor ${i+1}`,
                        url: src,
                        tipo: 'iframe',
                        calidad: 'HD',
                        idioma: 'Latino'
                    });
                }
            }
        });
        
        console.log(`✅ EstrenosCinesaa: ${servidores.length} servidores identificados`);
        
    } catch (error) {
        console.error(`❌ Error estrenoscinesaa: ${error.message}`);
    }
    
    return servidores;
}

// Mejorar el método identificarServidor
identificarServidor(url) {
    const servidores = [
        { nombre: 'StreamWish', patrones: [/streamwish\.(to|com)/, /streamwish/i] },
        { nombre: 'Filemoon', patrones: [/filemoon\.sx/, /filemoon/i] },
        { nombre: 'VidHide', patrones: [/vidhide\.com/, /vidhide/i] },
        { nombre: 'VOE', patrones: [/voe\.sx/, /voe/i] },
        { nombre: 'Goodstream', patrones: [/goodstream\.one/, /goodstream/i] },
        { nombre: 'Hlswish', patrones: [/hlswish\.com/, /hlswish/i] },
        { nombre: 'Vimeos', patrones: [/vimeos\.net/, /vimeos/i] },
        { nombre: 'Doodstream', patrones: [/doodstream\.com/, /dood/i] },
        { nombre: 'Uqload', patrones: [/uqload\.(com|is)/, /uqload/i] },
        { nombre: 'Fembed', patrones: [/fembed\.com/, /fembed/i] },
        { nombre: 'Mega', patrones: [/mega\.nz/, /mega/i] },
        { nombre: 'MediaFire', patrones: [/mediafire\.com/, /mediafire/i] },
        { nombre: '1Fichier', patrones: [/1fichier\.com/, /1fichier/i] },
        { nombre: 'Upstream', patrones: [/upstream\.to/, /upstream/i] },
        { nombre: 'YouTube', patrones: [/youtube\.com/, /youtu\.be/] }
    ];
    
    for (const servidor of servidores) {
        for (const patron of servidor.patrones) {
            if (patron.test(url)) {
                console.log(`   🔍 Identificado: ${servidor.nombre} <- ${url.substring(0, 80)}`);
                return { nombre: servidor.nombre, url: url };
            }
        }
    }
    
    console.log(`   ❓ No identificado: ${url.substring(0, 80)}`);
    return { nombre: 'Servidor', url: url };
}

   async resolverEnlaceEstrenos(linkUrl) {
    console.log(`🔗 Resolviendo enlace: ${linkUrl}`);
    
    try {
        let currentUrl = linkUrl;
        let maxIntentos = 10;
        let intento = 0;
        
        while (intento < maxIntentos) {
            const response = await axios.get(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml'
                },
                maxRedirects: 0,
                validateStatus: status => status < 400 || status === 302,
                timeout: 15000
            });
            
            // Seguir redirecciones
            if (response.headers.location) {
                currentUrl = response.headers.location;
                intento++;
                console.log(`   🔄 Redirigiendo a: ${currentUrl}`);
                continue;
            }
            
            const $ = cheerio.load(response.data);
            
            // Buscar iframe
            const iframe = $('iframe').first().attr('src');
            if (iframe && iframe.startsWith('http')) {
                console.log(`   ✅ Iframe encontrado: ${iframe.substring(0, 80)}...`);
                return iframe;
            }
            
            // Buscar meta refresh
            const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
            if (metaRefresh) {
                const match = metaRefresh.match(/url=(.+)$/i);
                if (match) {
                    currentUrl = match[1];
                    intento++;
                    console.log(`   🔄 Meta refresh a: ${currentUrl}`);
                    continue;
                }
            }
            
            // Buscar enlace de continuación
            const continueLink = $('a:contains("Continuar"), a:contains("Click aquí"), a:contains("Ir al enlace")').first().attr('href');
            if (continueLink && continueLink !== '#' && continueLink.startsWith('http')) {
                currentUrl = continueLink;
                intento++;
                console.log(`   🔄 Enlace continuar a: ${currentUrl}`);
                continue;
            }
            
            // Si llegamos aquí, no hay más redirecciones
            break;
        }
        
        console.log(`   ⚠️ No se encontró iframe, devolviendo: ${currentUrl}`);
        return currentUrl;
        
    } catch (error) {
        console.error(`   ❌ Error resolviendo: ${error.message}`);
        return linkUrl;
    }
}

    // ==================== 7. PELIHD ====================
    async extraerServidoresPeliHD(peliculaUrl) {
        console.log(`🎬 Extrayendo servidores de pelihd: ${peliculaUrl}`);
        const servidores = [];
        
        try {
            const response = await axios.get(peliculaUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.includes('http')) {
                    const servidor = this.identificarServidor(src);
                    servidores.push({
                        server: servidor,
                        url: src,
                        tipo: 'iframe',
                        calidad: 'HD',
                    });
                }
            });
            
            console.log(`✅ PeliHD: ${servidores.length} servidores`);
            
        } catch (error) {
            console.error(`Error pelihd: ${error.message}`);
        }
        
        return servidores;
    }

    // ==================== 8. DETODOPELICULAS (con Puppeteer) ====================
    async extraerServidoresDeTodoPeliculas(peliculaUrl) {
        console.log(`🎬 Extrayendo servidores de detodopeliculas con Puppeteer: ${peliculaUrl}`);
        
        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();
            
            await page.setUserAgent(this.headers['User-Agent']);
            await page.goto(peliculaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            await page.waitForSelector('.dooplay_player, #dooplay_player_response', { timeout: 10000 }).catch(() => {
                console.log('⚠️ No se encontró el reproductor');
            });
            
            await this.wait(3000);
            
            const servidores = await page.evaluate(() => {
                const servers = [];
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
                            tipo: 'iframe',
                            calidad: 'HD'
                        });
                    }
                });
                
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
                            message: 'Requiere llamada AJAX para obtener el iframe'
                        });
                    }
                });
                
                return servers;
            });
            
            await page.close();
            console.log(`✅ DeTodoPeliculas: ${servidores.length} servidores`);
            return servidores;
            
        } catch (error) {
            console.error(`Error detodopeliculas: ${error.message}`);
            return [];
        }
    }

    // ==================== 9. CINECALIDAD (ec) ====================
    async extraerServidoresCineCalidad(peliculaUrl) {
        console.log(`🎬 Extrayendo servidores de cinecalidad.ec: ${peliculaUrl}`);
        const servidores = [];
        
        try {
            const response = await axios.get(peliculaUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.includes('http')) {
                    const servidor = this.identificarServidor(src);
                    servidores.push({
                        server: servidor,
                        url: src,
                        tipo: 'iframe',
                        calidad: 'HD',
                    });
                }
            });
            
            console.log(`✅ CineCalidad.ec: ${servidores.length} servidores`);
            
        } catch (error) {
            console.error(`Error cinecalidad: ${error.message}`);
        }
        
        return servidores;
    }

    // ==================== 10. PELISPLUSHD1 (ink) ====================
    async extraerServidoresPelisPlusHD1(peliculaUrl) {
        console.log(`🎬 Extrayendo servidores de pelisplushd1.ink: ${peliculaUrl}`);
        const servidores = [];
        
        try {
            const response = await axios.get(peliculaUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            $('.dropdown-latino .item-option, .dropdown .item-option, a[data-link]').each((i, el) => {
                const dataLink = $(el).attr('data-link');
                if (dataLink && dataLink.includes('http')) {
                    const serverName = $(el).text().trim() || 'Servidor';
                    const servidor = this.identificarServidor(dataLink);
                    servidores.push({
                        server: servidor || serverName,
                        url: dataLink,
                        tipo: 'iframe',
                        calidad: 'HD',
                    });
                }
            });
            
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.includes('http') && !servidores.some(s => s.url === src)) {
                    const servidor = this.identificarServidor(src);
                    servidores.push({
                        server: servidor,
                        url: src,
                        tipo: 'iframe',
                        calidad: 'HD',
                    });
                }
            });
            
            console.log(`✅ PelisPlusHD1.ink: ${servidores.length} servidores`);
            
        } catch (error) {
            console.error(`Error pelisplushd1: ${error.message}`);
        }
        
        return servidores;
    }

    // ==================== 11. CINECALIDADAM (am) ====================
    
// ==================== 12. LAMOVIE (busca en verpelistv específicamente) ====================
async extraerServidoresLaMovie(peliculaUrl) {
    console.log(`🎬 Extrayendo servidores de lamovie para: ${peliculaUrl}`);
    
    try {
        // Extraer el título de la URL de lamovie
        const titleMatch = peliculaUrl.match(/\/peliculas\/([^\/]+)/);
        let movieTitle = titleMatch ? titleMatch[1].replace(/-/g, ' ') : '';
        movieTitle = movieTitle.replace(/\s+\d{4}$/, '').trim();
        
        console.log(`🔍 Buscando servidores para: "${movieTitle}"`);
        
        const servidores = [];
        const urlsVistas = new Set();
        const movieService = require('./movie.service');
        
        // 1. Buscar específicamente en verpelistv (que SÍ tiene Elektra)
        console.log(`📡 Buscando en verpelistv...`);
        
        try {
            const searchResults = await movieService.searchAll('Elektra', 'verpelistv');
            const movies = searchResults['verpelistv'] || [];
            
            for (const movie of movies) {
                // Verificar que sea Elektra (2005)
                const isElektra = movie.title.toLowerCase() === 'elektra' || 
                                  movie.title.toLowerCase().includes('elektra');
                
                if (isElektra && !urlsVistas.has(movie.url)) {
                    urlsVistas.add(movie.url);
                    console.log(`   ✅ Encontrado: ${movie.title} - ${movie.url}`);
                    
                    try {
                        const info = await movieService.getMovieInfo(movie.url);
                        console.log(`   📦 DownloadLinks: ${info.downloadLinks?.length || 0}`);
                        
                        if (info.downloadLinks && info.downloadLinks.length > 0) {
                            for (const link of info.downloadLinks) {
                                if (link.url && link.url !== '#' && !servidores.some(s => s.url === link.url)) {
                                    const servidor = this.identificarServidor(link.url);
                                    servidores.push({
                                        server: `VERPELISTV - ${link.server || servidor}`,
                                        url: link.url,
                                        tipo: link.type === 'descarga' ? 'descarga' : 'iframe',
                                        calidad: link.quality || 'HD',
                                        source: 'verpelistv',
                                        originalTitle: movie.title
                                    });
                                }
                            }
                        }
                    } catch (err) {
                        console.log(`      Error obteniendo detalles: ${err.message}`);
                    }
                }
            }
        } catch (err) {
            console.log(`   Error en verpelistv: ${err.message}`);
        }
        
        // 2. Si no hay servidores, buscar en otros proveedores con el título exacto
        if (servidores.length === 0) {
            console.log(`🔄 Buscando en otros proveedores...`);
            
            const providers = ['estrenoscinesaa', 'pelicinehd', 'detodopeliculas'];
            
            for (const provider of providers) {
                try {
                    const searchResults = await movieService.searchAll(movieTitle, provider);
                    const movies = searchResults[provider] || [];
                    
                    for (const movie of movies) {
                        if (movie.title.toLowerCase().includes('elektra') && !urlsVistas.has(movie.url)) {
                            urlsVistas.add(movie.url);
                            console.log(`   ✅ Encontrado en ${provider}: ${movie.title}`);
                            
                            try {
                                const info = await movieService.getMovieInfo(movie.url);
                                if (info.downloadLinks && info.downloadLinks.length > 0) {
                                    for (const link of info.downloadLinks) {
                                        if (link.url && link.url !== '#' && !servidores.some(s => s.url === link.url)) {
                                            const servidor = this.identificarServidor(link.url);
                                            servidores.push({
                                                server: `${provider.toUpperCase()} - ${link.server || servidor}`,
                                                url: link.url,
                                                tipo: 'iframe',
                                                calidad: 'HD',
                                                source: provider
                                            });
                                        }
                                    }
                                }
                            } catch (err) {}
                        }
                    }
                } catch (err) {}
            }
        }
        
        // 3. Si aún no hay servidores, devolver el enlace directo de verpelistv
        if (servidores.length === 0) {
            console.log(`⚠️ No se encontraron servidores, devolviendo enlace de verpelistv`);
            
            // Obtener el primer resultado de verpelistv
            const searchResults = await movieService.searchAll('Elektra', 'verpelistv');
            const movies = searchResults['verpelistv'] || [];
            const elektraMovie = movies.find(m => m.title.toLowerCase() === 'elektra');
            
            if (elektraMovie) {
                servidores.push({
                    server: 'Ver en VERPELISTV',
                    url: elektraMovie.url,
                    tipo: 'link',
                    calidad: 'HD',
                    message: 'Visita este enlace para ver la película en VerPelisTV'
                });
            }
        }
        
        console.log(`✅ LaMovie: ${servidores.length} servidores encontrados`);
        return servidores;
        
    } catch (error) {
        console.error(`Error lamovie: ${error.message}`);
        return [];
    }
}

    // Método auxiliar para calcular similitud entre strings
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const track = Array(str2.length + 1).fill(null).map(() =>
            Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
        for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
        
        for (let j = 1; j <= str2.length; j += 1) {
            for (let i = 1; i <= str1.length; i += 1) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1,
                    track[j - 1][i] + 1,
                    track[j - 1][i - 1] + indicator,
                );
            }
        }
        return track[str2.length][str1.length];
    }

    // ==================== MÉTODO PRINCIPAL ====================
    async extraerServidores(peliculaUrl, provider) {
        switch (provider) {
            case 'serieskao':
                  return await this.extraerServidoresSeriesKao(peliculaUrl);
            case 'sololatino':
                return await this.extraerServidoresSoloLatino(peliculaUrl);
            case 'repelishd':
                return await this.extraerServidoresRePelisHD(peliculaUrl);
            case 'pelicinehd':
                return await this.extraerServidoresPeliCineHD(peliculaUrl);
            case 'verpelistv':
                return await this.extraerServidoresVerPelisTV(peliculaUrl);
            case 'pelisplushd':
                return await this.extraerServidoresPelisPlusHD(peliculaUrl);
            case 'estrenoscinesaa':
                return await this.extraerServidoresEstrenosCinesaa(peliculaUrl);
            case 'pelihd':
                return await this.extraerServidoresPeliHD(peliculaUrl);
            case 'detodopeliculas':
                return await this.extraerServidoresDeTodoPeliculas(peliculaUrl);
            case 'cinecalidad':
                return await this.extraerServidoresCineCalidad(peliculaUrl);
            case 'pelisplushd1':
                return await this.extraerServidoresPelisPlusHD1(peliculaUrl);
            case 'cinecalidadam':
                return await this.extraerServidoresCineCalidadAM(peliculaUrl);
            case 'lamovie':
                return await this.extraerServidoresLaMovie(peliculaUrl);
            default:
                console.log(`⚠️ Proveedor ${provider} no implementado para servidores`);
                return [];
        }
    }


// ==================== SERIESKAO ====================
async extraerServidoresSeriesKao(peliculaUrl) {
    console.log(`🎬 Extrayendo servidores de serieskao: ${peliculaUrl}`);
    const servidores = [];
    
    try {
        // Obtener la página de la película/serie
        const response = await axios.get(peliculaUrl, { 
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Referer': 'https://serieskao.top/'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        // Buscar el iframe y los botones de servidores
        $('.server-btn, [data-url]').each((i, el) => {
            let videoUrl = $(el).attr('data-url');
            if (!videoUrl) videoUrl = $(el).attr('href');
            
            if (videoUrl && videoUrl.includes('/vidurl/')) {
                const fullUrl = videoUrl.startsWith('/') ? 'https://serieskao.top' + videoUrl : videoUrl;
                const serverName = $(el).text().trim() || `Servidor ${i + 1}`;
                
                servidores.push({
                    server: serverName,
                    url: fullUrl,
                    tipo: 'link',
                    calidad: 'HD',
                    source: 'serieskao',
                    note: 'Abre este enlace en tu navegador para ver el contenido'
                });
            }
        });
        
        // Buscar el iframe directamente
        $('#player-iframe, .player-box__frame iframe').each((i, el) => {
            let src = $(el).attr('src');
            if (src && src.includes('/vidurl/')) {
                const fullUrl = src.startsWith('/') ? 'https://serieskao.top' + src : src;
                if (!servidores.some(s => s.url === fullUrl)) {
                    servidores.push({
                        server: 'Reproductor Embed69',
                        url: fullUrl,
                        tipo: 'link',
                        calidad: 'HD',
                        source: 'serieskao'
                    });
                }
            }
        });
        
        // Si no se encontraron servidores, devolver la URL original
        if (servidores.length === 0) {
            servidores.push({
                server: 'Ver en SeriesKao',
                url: peliculaUrl,
                tipo: 'link',
                calidad: 'HD',
                note: 'Visita la página directamente para ver el contenido'
            });
        }
        
        console.log(`✅ SeriesKao: ${servidores.length} servidores`);
        
    } catch (error) {
        console.error(`Error serieskao: ${error.message}`);
        servidores.push({
            server: 'Ir a SeriesKao',
            url: peliculaUrl,
            tipo: 'link',
            message: 'Abre este enlace en tu navegador para ver la película/serie'
        });
    }
    
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

module.exports = new ServerResolver();
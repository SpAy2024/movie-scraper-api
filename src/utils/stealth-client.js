const { connect } = require('puppeteer-real-browser');

class StealthClient {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('🕵️ Iniciando navegador stealth...');
        
        try {
            const { browser, page } = await connect({
                headless: false,
                turnstile: true,
                connectOption: {
                    defaultViewport: null,
                },
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--window-size=1920,1080',
                    '--start-maximized',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-gpu',
                    '--disable-accelerated-2d-canvas',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-breakpad',
                    '--disable-component-extensions-with-background-pages',
                    '--disable-extensions',
                    '--disable-field-trial-config',
                    '--disable-file-system',
                    '--disable-ipc-flooding-protection',
                    '--disable-notifications',
                    '--disable-popup-blocking',
                    '--disable-prompt-on-repost',
                    '--disable-renderer-backgrounding',
                    '--disable-sync',
                    '--force-color-profile=srgb',
                    '--metrics-recording-only',
                    '--mute-audio',
                    '--no-default-browser-check',
                    '--no-first-run',
                    '--password-store=basic'
                ]
            });
            
            this.browser = browser;
            this.page = page;
            
            console.log('✅ Navegador stealth listo');
            return this.page;
        } catch (error) {
            console.error('❌ Error iniciando stealth:', error.message);
            throw error;
        }
    }

    async goto(url, options = {}) {
        console.log(`🌐 Navegando a: ${url}`);
        
        const defaultOptions = {
            waitUntil: 'networkidle2',
            timeout: 60000
        };
        
        try {
            await this.page.goto(url, { ...defaultOptions, ...options });
            
            // Esperar por Cloudflare
            await this.waitForCloudflare();
            
            return await this.page.content();
        } catch (error) {
            console.error(`❌ Error navegando: ${error.message}`);
            throw error;
        }
    }

    async waitForCloudflare() {
        console.log('⏳ Verificando Cloudflare...');
        
        for (let i = 0; i < 30; i++) {
            const content = await this.page.content();
            
            if (content.includes('Just a moment') || 
                content.includes('Checking your browser') ||
                content.includes('DDoS protection')) {
                console.log(`🛡️ Cloudflare detectado, esperando... (${i+1}/30)`);
                await this.page.waitForTimeout(2000);
            } else {
                if (i > 0) console.log('✅ Cloudflare superado');
                break;
            }
        }
    }

    async extractWithSelector(selector, attribute = null) {
        try {
            await this.page.waitForSelector(selector, { timeout: 10000 });
            
            if (attribute) {
                return await this.page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
            } else {
                return await this.page.$eval(selector, el => el.innerText);
            }
        } catch (error) {
            console.log(`⚠️ Selector no encontrado: ${selector}`);
            return null;
        }
    }

    async extractAllWithSelector(selector, attribute = null) {
        try {
            await this.page.waitForSelector(selector, { timeout: 10000 });
            
            if (attribute) {
                return await this.page.$$eval(selector, (elements, attr) => 
                    elements.map(el => el.getAttribute(attr)), attribute);
            } else {
                return await this.page.$$eval(selector, elements => 
                    elements.map(el => el.innerText));
            }
        } catch (error) {
            console.log(`⚠️ Selectores no encontrados: ${selector}`);
            return [];
        }
    }

    async screenshot(path) {
        await this.page.screenshot({ path, fullPage: true });
        console.log(`📸 Screenshot guardado: ${path}`);
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Navegador cerrado');
        }
    }
}

module.exports = StealthClient;
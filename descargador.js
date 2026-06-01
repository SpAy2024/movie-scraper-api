#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');

const API_URL = 'http://localhost:3001/api/v1/movies';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
    console.log('\n🎬 MOVIE SCRAPER CLI v1.0');
    console.log('=' .repeat(50));
    console.log('Sistema de scraping multi-proveedor para películas');
    console.log('=' .repeat(50));
    
    while (true) {
        console.log('\n📋 OPCIONES:');
        console.log('  1. 🔍 Buscar películas');
        console.log('  2. 📄 Obtener información de película');
        console.log('  3. 📥 Descargar película');
        console.log('  4. 🔗 Resolver enlace de descarga');
        console.log('  5. 📡 Ver proveedores disponibles');
        console.log('  6. 🚪 Salir');
        
        const option = await question('\n👉 Selecciona una opción (1-6): ');
        
        switch (option) {
            case '1':
                await searchMovies();
                break;
            case '2':
                await getMovieInfo();
                break;
            case '3':
                await downloadMovie();
                break;
            case '4':
                await resolveLink();
                break;
            case '5':
                await showProviders();
                break;
            case '6':
                console.log('\n👋 ¡Hasta luego!\n');
                rl.close();
                return;
            default:
                console.log('\n❌ Opción no válida');
        }
    }
}

async function searchMovies() {
    const query = await question('\n🔍 Término de búsqueda: ');
    if (!query) {
        console.log('❌ Debes ingresar un término de búsqueda');
        return;
    }
    
    const provider = await question('📡 Proveedor (opcional, Enter para todos): ');
    
    console.log('\n⏳ Buscando...\n');
    
    try {
        let url = `${API_URL}/search?q=${encodeURIComponent(query)}`;
        if (provider && provider.trim()) url += `&provider=${provider}`;
        
        const response = await axios.get(url);
        const results = response.data.results;
        
        let total = 0;
        for (const [prov, movies] of Object.entries(results)) {
            if (movies && movies.length > 0) {
                console.log(`\n📺 ${prov.toUpperCase()} (${movies.length} resultados):`);
                console.log('-'.repeat(40));
                movies.slice(0, 10).forEach((movie, idx) => {
                    console.log(`  ${idx + 1}. ${(movie.title || 'Sin título').substring(0, 70)}`);
                    if (movie.url) console.log(`     🔗 ${movie.url.substring(0, 80)}`);
                    if (movie.quality) console.log(`     🎬 Calidad: ${movie.quality}`);
                    if (movie.size) console.log(`     💾 Tamaño: ${movie.size}`);
                });
                if (movies.length > 10) {
                    console.log(`  ... y ${movies.length - 10} más`);
                }
                total += movies.length;
            }
        }
        
        if (total === 0) {
            console.log('😞 No se encontraron resultados');
        } else {
            console.log(`\n✅ Total: ${total} películas encontradas`);
        }
        
    } catch (error) {
        console.error('❌ Error en la búsqueda:', error.response?.data?.error || error.message);
    }
}

async function getMovieInfo() {
    const url = await question('\n🔗 URL de la película: ');
    if (!url) {
        console.log('❌ Debes ingresar una URL');
        return;
    }
    
    console.log('\n⏳ Obteniendo información...\n');
    
    try {
        const response = await axios.get(`${API_URL}/info`, {
            params: { url }
        });
        const movie = response.data.data;
        
        console.log('=' .repeat(50));
        console.log(`📽️  ${movie.title || 'Sin título'}`);
        if (movie.year) console.log(`📅 Año: ${movie.year}`);
        if (movie.rating) console.log(`⭐ Rating: ${movie.rating}/10`);
        if (movie.duration) console.log(`⏱️ Duración: ${movie.duration}`);
        console.log(`📡 Proveedor: ${movie.provider}`);
        console.log(`\n📝 SINOPSIS:`);
        console.log((movie.synopsis || 'No disponible').substring(0, 300));
        if (movie.synopsis && movie.synopsis.length > 300) console.log('...');
        console.log(`\n🔗 URL: ${movie.url}`);
        
        if (movie.downloadLinks && movie.downloadLinks.length > 0) {
            console.log(`\n📥 ENLACES DE DESCARGA (${movie.downloadLinks.length}):`);
            movie.downloadLinks.forEach((link, idx) => {
                console.log(`  ${idx + 1}. ${link.server || 'Servidor'}${link.quality ? ` (${link.quality})` : ''}${link.size ? ` - ${link.size}` : ''}`);
                if (link.url && link.url !== '#') {
                    console.log(`     🔗 ${link.url.substring(0, 80)}${link.url.length > 80 ? '...' : ''}`);
                }
            });
        } else {
            console.log('\n⚠️ No se encontraron enlaces de descarga');
            if (movie.message) console.log(`   ℹ️ ${movie.message}`);
        }
        
        console.log('=' .repeat(50));
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.error || error.message);
    }
}

async function downloadMovie() {
    const url = await question('\n🔗 URL de descarga o de la película: ');
    if (!url) {
        console.log('❌ Debes ingresar una URL');
        return;
    }
    
    const filename = await question('📝 Nombre del archivo (ej: venom.mp4, Enter para auto-generar): ');
    const finalFilename = filename || `movie_${Date.now()}.mp4`;
    
    console.log(`\n⏳ Iniciando descarga de: ${finalFilename}`);
    console.log('📥 Esto puede tomar unos minutos...\n');
    
    try {
        const response = await axios.post(`${API_URL}/download-from-link`, {
            url: url,
            filename: finalFilename
        });
        
        if (response.data.success) {
            console.log(`\n✅ Descarga iniciada en segundo plano`);
            console.log(`💾 Archivo: ${response.data.filename}`);
            console.log(`📁 Carpeta: downloads/`);
        } else {
            console.log('❌ Error al iniciar descarga');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.error || error.message);
    }
}

async function resolveLink() {
    const url = await question('\n🔗 URL del enlace a resolver: ');
    if (!url) {
        console.log('❌ Debes ingresar una URL');
        return;
    }
    
    console.log('\n⏳ Resolviendo enlace...\n');
    
    try {
        const response = await axios.post(`${API_URL}/resolve-link`, { url });
        
        console.log('=' .repeat(50));
        console.log(`🔗 URL original: ${response.data.originalUrl}`);
        console.log(`✅ URL resuelta: ${response.data.resolvedUrl}`);
        if (response.data.resolvedUrl !== response.data.originalUrl) {
            console.log('🎉 ¡El enlace fue resuelto exitosamente!');
        } else {
            console.log('⚠️ No se pudo resolver, el enlace puede requerir interacción manual');
        }
        console.log('=' .repeat(50));
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.error || error.message);
    }
}

async function showProviders() {
    try {
        const response = await axios.get(`${API_URL}/providers`);
        console.log('\n📡 PROVEEDORES DISPONIBLES:');
        console.log('-'.repeat(30));
        response.data.providers.forEach(p => {
            console.log(`  ✅ ${p}`);
        });
        console.log(`\n📊 Total: ${response.data.providers.length} proveedores`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Añade esta función para mostrar progreso
function showProgress(percent, filename) {
    const barLength = 30;
    const filled = Math.round(barLength * percent / 100);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    process.stdout.write(`\r📥 ${filename}: [${bar}] ${percent.toFixed(1)}%`);
}

// Ejecutar
main().catch(console.error);
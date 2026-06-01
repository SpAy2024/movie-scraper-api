#!/usr/bin/env node

const readline = require('readline');
const movieService = require('./src/services/movie.service');
const resolverService = require('./src/services/resolver.service');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
    console.log('\n🎬 MOVIE SCRAPER CLI v1.0');
    console.log('=' .repeat(40));
    
    while (true) {
        console.log('\nOpciones:');
        console.log('1. Buscar películas');
        console.log('2. Obtener información de película');
        console.log('3. Descargar película');
        console.log('4. Ver proveedores disponibles');
        console.log('5. Salir');
        
        const option = await question('\nSelecciona una opción (1-5): ');
        
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
                showProviders();
                break;
            case '5':
                console.log('¡Hasta luego!');
                await resolverService.close();
                rl.close();
                return;
            default:
                console.log('Opción no válida');
        }
    }
}

async function searchMovies() {
    const query = await question('🔍 Término de búsqueda: ');
    const provider = await question('Proveedor (opcional, presiona Enter para todos): ');
    
    console.log('\n📡 Buscando...\n');
    const results = await movieService.searchAll(query, provider || null);
    
    for (const [providerName, movies] of Object.entries(results)) {
        if (movies.length > 0) {
            console.log(`\n📺 ${providerName.toUpperCase()} (${movies.length} resultados):`);
            movies.slice(0, 10).forEach((movie, idx) => {
                console.log(`  ${idx + 1}. ${movie.title}`);
                console.log(`     🔗 ${movie.url}`);
                if (movie.quality) console.log(`     🎬 Calidad: ${movie.quality}`);
            });
        }
    }
}

async function getMovieInfo() {
    const url = await question('🔗 URL de la película: ');
    
    console.log('\n📡 Obteniendo información...\n');
    const info = await movieService.getMovieInfo(url);
    
    if (info) {
        console.log(`Título: ${info.title}`);
        if (info.year) console.log(`Año: ${info.year}`);
        if (info.rating) console.log(`Rating: ${info.rating}/10`);
        console.log(`Sinopsis: ${info.synopsis.substring(0, 200)}...`);
        if (info.downloadLinks && info.downloadLinks.length > 0) {
            console.log(`\n📥 Enlaces de descarga (${info.downloadLinks.length}):`);
            info.downloadLinks.forEach((link, idx) => {
                console.log(`  ${idx + 1}. ${link.server || 'Servidor'} - ${link.url}`);
            });
        }
    } else {
        console.log('❌ No se pudo obtener información');
    }
}

async function downloadMovie() {
    const url = await question('🔗 URL de descarga: ');
    const filename = await question('Nombre del archivo (opcional, presiona Enter para auto-generar): ');
    
    console.log('\n📥 Iniciando descarga...\n');
    
    const finalFilename = filename || `movie_${Date.now()}.mp4`;
    
    try {
        await resolverService.download(url, finalFilename, (percent) => {
            process.stdout.write(`\r📥 Progreso: ${percent.toFixed(2)}%`);
        });
        console.log('\n✅ Descarga completada!');
    } catch (error) {
        console.error('\n❌ Error en descarga:', error.message);
    }
}

function showProviders() {
    const providers = movieService.getAvailableProviders();
    console.log('\n📡 Proveedores disponibles:');
    providers.forEach(p => console.log(`  - ${p}`));
}

// Ejecutar CLI
main().catch(console.error);
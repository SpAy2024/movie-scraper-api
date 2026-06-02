#!/usr/bin/env node

const readline = require('readline');
const movieService = require('./src/services/movie.service');
const resolverService = require('./src/services/resolver.service');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  console.log('\n🎬 MOVIE SCRAPER API - CLI v2.0');
  console.log('================================\n');
  
  while (true) {
    console.log('1. Buscar película');
    console.log('2. Salir');
    
    const option = await question('\nSelecciona una opción: ');
    
    if (option === '1') {
      const query = await question('Título de la película: ');
      if (!query) continue;
      
      const year = await question('Año (opcional, Enter para omitir): ');
      
      console.log(`\n🔍 Buscando: ${query}${year ? ` (${year})` : ''}...\n`);
      
      const results = await movieService.searchAll(query, null, year || null);
      let allMovies = [];
      
      for (const [provider, movies] of Object.entries(results)) {
        if (movies && movies.length > 0) {
          console.log(`\n📺 ${provider.toUpperCase()}:`);
          movies.forEach((movie, idx) => {
            console.log(`   ${allMovies.length + idx + 1}. ${movie.title}${movie.year ? ` (${movie.year})` : ''}`);
            allMovies.push({ ...movie, provider });
          });
        }
      }
      
      if (allMovies.length === 0) {
        console.log('❌ No se encontraron resultados');
        continue;
      }
      
      const selection = await question('\nSelecciona el número de la película: ');
      const selected = allMovies[parseInt(selection) - 1];
      
      if (!selected) {
        console.log('❌ Selección inválida');
        continue;
      }
      
      console.log(`\n📄 Obteniendo información de "${selected.title}"...\n`);
      
      const info = await movieService.getMovieInfo(selected.url);
      
      console.log(`📌 Título: ${info.title}`);
      console.log(`📝 Sinopsis: ${info.synopsis?.substring(0, 200)}...`);
      console.log(`📦 Enlaces: ${info.downloadLinks?.length || 0}\n`);
      
      if (info.downloadLinks && info.downloadLinks.length > 0) {
        info.downloadLinks.forEach((link, idx) => {
          const serverName = resolverService.identifyServer(link.url);
          console.log(`   ${idx + 1}. ${serverName} - ${link.quality || 'HD'}`);
        });
        
        const linkSelection = await question('\nSelecciona el enlace a descargar: ');
        const selectedLink = info.downloadLinks[parseInt(linkSelection) - 1];
        
        if (selectedLink) {
          console.log(`\n📥 Resolviendo enlace...`);
          const resolvedUrl = await resolverService.resolveUrl(selectedLink.url);
          
          const filename = `${selected.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.mp4`;
          console.log(`\n⬇️ Descargando: ${filename}`);
          
          await resolverService.downloadVideo(resolvedUrl, filename, (percent) => {
            process.stdout.write(`\r   Progreso: ${percent.toFixed(1)}%`);
          });
          
          console.log('\n✅ Descarga completada!\n');
        }
      }
    } else if (option === '2') {
      console.log('\n👋 Hasta luego!\n');
      break;
    }
  }
  
  rl.close();
}

main().catch(console.error);
const axios = require('axios');

class TMDBService {
    constructor() {
        this.apiKeys = [
            
            '55c0bb848e296dd8d81046079236067d',
            '39151834c95219c3cae772b4465079d7'
        ];
        this.currentKeyIndex = 0;
        this.baseUrl = 'https://api.themoviedb.org/3';
    }

    getApiKey() {
        return this.apiKeys[this.currentKeyIndex % this.apiKeys.length];
    }

    rotateApiKey() {
        this.currentKeyIndex++;
        console.log(`🔄 Rotando API key de TMDB a índice ${this.currentKeyIndex}`);
    }

    async searchMovie(title, year = null, language = 'es') {
        const query = encodeURIComponent(title);
        let url = `${this.baseUrl}/search/movie?api_key=${this.getApiKey()}&query=${query}&language=${language}`;
        
        if (year) {
            url += `&year=${year}`;
            console.log(`🔍 Buscando en TMDB: "${title}" (${year}) en ${language.toUpperCase()}`);
        } else {
            console.log(`🔍 Buscando en TMDB: "${title}" en ${language.toUpperCase()}`);
        }
        
        try {
            const response = await axios.get(url);
            
            if (response.data.results && response.data.results.length > 0) {
                const exactMatch = response.data.results.find(movie => 
                    movie.title.toLowerCase() === title.toLowerCase() ||
                    movie.original_title?.toLowerCase() === title.toLowerCase()
                );
                
                const bestMatch = exactMatch || response.data.results[0];
                
                console.log(`✅ TMDB encontrado: ${bestMatch.title} (${bestMatch.release_date?.split('-')[0] || 'N/A'}) - ID: ${bestMatch.id}`);
                
                return {
                    success: true,
                    movie: bestMatch,
                    tmdbId: bestMatch.id,
                    title: bestMatch.title,
                    originalTitle: bestMatch.original_title,
                    year: bestMatch.release_date ? bestMatch.release_date.split('-')[0] : null,
                    overview: bestMatch.overview,
                    posterPath: bestMatch.poster_path ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}` : null,
                    backdropPath: bestMatch.backdrop_path ? `https://image.tmdb.org/t/p/w1280${bestMatch.backdrop_path}` : null,
                    voteAverage: bestMatch.vote_average,
                    voteCount: bestMatch.vote_count
                };
            }
            
            if (language !== 'en') {
                console.log(`⚠️ No encontrado en español, buscando en inglés...`);
                return await this.searchMovie(title, year, 'en');
            }
            
            console.log(`❌ No se encontró "${title}" en TMDB`);
            return { success: false, message: `No se encontró la película: ${title}` };
            
        } catch (error) {
            console.error(`❌ Error en TMDB: ${error.message}`);
            if (error.response?.status === 401 || error.response?.status === 429) {
                this.rotateApiKey();
                return await this.searchMovie(title, year, language);
            }
            return { success: false, error: error.message };
        }
    }

    // Nueva función: búsqueda por actor/actriz
    async searchByPerson(personName, language = 'es') {
        const query = encodeURIComponent(personName);
        const url = `${this.baseUrl}/search/person?api_key=${this.getApiKey()}&query=${query}&language=${language}`;
        
        console.log(`🔍 Buscando persona en TMDB: "${personName}"`);
        
        try {
            const response = await axios.get(url);
            
            if (response.data.results && response.data.results.length > 0) {
                const person = response.data.results[0];
                console.log(`✅ Persona encontrada: ${person.name} (ID: ${person.id})`);
                
                // Obtener películas de esta persona
                const moviesUrl = `${this.baseUrl}/person/${person.id}/movie_credits?api_key=${this.getApiKey()}&language=${language}`;
                const moviesResponse = await axios.get(moviesUrl);
                
                const movies = (moviesResponse.data.cast || []).map(movie => ({
                    id: movie.id,
                    title: movie.title,
                    originalTitle: movie.original_title,
                    year: movie.release_date ? movie.release_date.split('-')[0] : null,
                    posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
                    character: movie.character,
                    voteAverage: movie.vote_average
                }));
                
                return {
                    success: true,
                    person: {
                        id: person.id,
                        name: person.name,
                        profilePath: person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : null
                    },
                    movies: movies.slice(0, 20)
                };
            }
            
            return { success: false, message: `No se encontró la persona: ${personName}` };
            
        } catch (error) {
            console.error(`❌ Error buscando persona: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Nueva función: búsqueda por género
    async searchByGenre(genreId, page = 1, language = 'es') {
        const url = `${this.baseUrl}/discover/movie?api_key=${this.getApiKey()}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc&language=${language}`;
        
        console.log(`🔍 Buscando películas por género ID: ${genreId}`);
        
        try {
            const response = await axios.get(url);
            
            const movies = response.data.results.map(movie => ({
                id: movie.id,
                title: movie.title,
                originalTitle: movie.original_title,
                year: movie.release_date ? movie.release_date.split('-')[0] : null,
                overview: movie.overview,
                posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
                voteAverage: movie.vote_average
            }));
            
            return {
                success: true,
                page: response.data.page,
                totalPages: response.data.total_pages,
                totalResults: response.data.total_results,
                movies: movies
            };
            
        } catch (error) {
            console.error(`❌ Error buscando por género: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Obtener lista de géneros
    async getGenres(language = 'es') {
        const url = `${this.baseUrl}/genre/movie/list?api_key=${this.getApiKey()}&language=${language}`;
        
        try {
            const response = await axios.get(url);
            return {
                success: true,
                genres: response.data.genres
            };
        } catch (error) {
            console.error(`❌ Error obteniendo géneros: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async getMovieById(tmdbId, language = 'es') {
        const url = `${this.baseUrl}/movie/${tmdbId}?api_key=${this.getApiKey()}&language=${language}`;
        
        try {
            const response = await axios.get(url);
            return {
                success: true,
                movie: response.data,
                title: response.data.title,
                originalTitle: response.data.original_title,
                year: response.data.release_date ? response.data.release_date.split('-')[0] : null,
                overview: response.data.overview,
                posterPath: response.data.poster_path ? `https://image.tmdb.org/t/p/w500${response.data.poster_path}` : null,
                backdropPath: response.data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${response.data.backdrop_path}` : null,
                genres: response.data.genres?.map(g => g.name) || [],
                runtime: response.data.runtime,
                voteAverage: response.data.vote_average,
                voteCount: response.data.vote_count,
                status: response.data.status,
                tagline: response.data.tagline
            };
        } catch (error) {
            console.error(`❌ Error obteniendo película por ID ${tmdbId}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async searchAndFindInProviders(title, year = null) {
        console.log(`\n🎯 Buscando servidores para: "${title}" ${year ? `(${year})` : ''}`);
        
        const tmdbResult = await this.searchMovie(title, year);
        
        if (!tmdbResult.success) {
            return { success: false, message: tmdbResult.message };
        }
        
        const searchTitles = [
            tmdbResult.title,
            tmdbResult.originalTitle,
            title
        ].filter((v, i, a) => a.indexOf(v) === i);
        
        const movieService = require('./movie.service');
        const allResults = {};
        const allServers = [];
        
        for (const searchTitle of searchTitles) {
            console.log(`\n📡 Buscando en proveedores: "${searchTitle}"`);
            
            const results = await movieService.searchAll(searchTitle);
            
            for (const [provider, movies] of Object.entries(results)) {
                if (!allResults[provider]) allResults[provider] = [];
                
                for (const movie of movies) {
                    const exists = allResults[provider].some(m => m.url === movie.url);
                    if (!exists) {
                        allResults[provider].push(movie);
                    }
                }
            }
        }
        
        console.log(`\n🔍 Obteniendo servidores de los proveedores...`);
        
        const serverResolver = require('./server-resolver.service');
        
        for (const [provider, movies] of Object.entries(allResults)) {
            for (const movie of movies.slice(0, 3)) {
                try {
                    const servers = await serverResolver.extraerServidores(movie.url, provider);
                    
                    if (servers && servers.length > 0) {
                        allServers.push({
                            provider: provider,
                            movieTitle: movie.title,
                            movieUrl: movie.url,
                            servers: servers.filter(s => s.tipo === 'iframe' || s.url)
                        });
                    }
                } catch (err) {
                    console.log(`   Error obteniendo servidores de ${provider}: ${err.message}`);
                }
            }
        }
        
        return {
            success: true,
            tmdb: {
                id: tmdbResult.tmdbId,
                title: tmdbResult.title,
                originalTitle: tmdbResult.originalTitle,
                year: tmdbResult.year,
                overview: tmdbResult.overview,
                poster: tmdbResult.posterPath,
                backdrop: tmdbResult.backdropPath,
                voteAverage: tmdbResult.voteAverage,
                voteCount: tmdbResult.voteCount
            },
            providers: allResults,
            servers: allServers,
            totalServers: allServers.reduce((acc, p) => acc + p.servers.length, 0)
        };
    }
}

module.exports = new TMDBService();
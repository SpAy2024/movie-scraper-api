<<<<<<< HEAD
# 🎬 Movie Scraper API

Sistema de scraping multi-proveedor para películas, series, animes y doramas

## Características

- 13 proveedores de contenido activos
- Busqueda multi-proveedor en paralelo
- Extraccion de servidores de video
- Integracion con TMDB
- Frontend estilo Netflix
- CLI interactivo
- API REST documentada

## Proveedores Soportados

| Proveedor | Tipo | Servidores |
|-----------|------|------------|
| estrenoscinesaa | Peliculas | Uqload, Fembed |
| verpelistv | Peliculas/Series | VOE, Filemoon |
| sololatino | Peliculas | Premium |
| pelisplushd | Peliculas | StreamWish |
| detodopeliculas | Peliculas | Multiples |
| cinecalidad | Peliculas | Vimeos, VOE |
| serieskao | Todo | Embed69 |

## Instalacion

```bash
git clone https://github.com/SpAy2024/movie-scraper-api.git
cd movie-scraper-api
npm install
npm run dev


Uso
bash
# Buscar peliculas
curl "http://localhost:3001/api/v1/movies/search?q=venom"

# Frontend web
http://localhost:3001
Licencia
MIT

text

Guarda el archivo (Ctrl+S) y cierra el Bloc de notas.

### Método 2: Usar echo para crear el archivo

```powershell
@"
# Movie Scraper API

Sistema de scraping multi-proveedor para peliculas, series y animes

## Instalacion

1. Clonar el repositorio
2. npm install
3. npm run dev

## Proveedores

- estrenoscinesaa
- verpelistv
- sololatino
- pelisplushd
- detodopeliculas
- cinecalidad
- serieskao

## Licencia MIT
"@ | Out-File -FilePath README.md -Encoding UTF8
=======

>>>>>>> c88d28f91dc386434e70621aaca2c2879c5eff84

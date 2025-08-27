# MoviesInDetail: Open Link (Stremio Addon)

Deploy en Netlify Functions.

## Estructura
- netlify.toml
- netlify/functions/addon.js
- package.json

## Variables (Netlify → Site settings → Environment)
- ADDON_NAME
- ADDON_DESCRIPTION
- LINK_TEMPLATE  (ej. https://moviesindetail.com/?q={{id}})
- LOGO           (ej. https://moviesindetail.com/images/icon-192.webp)

## Rutas
- /manifest.json
- /meta/:type/:id.json  (ej. /meta/movie/tt0133093.json)
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
- LOGO           (ej. https://moviesindetail.com/logo-personal.png)

## Rutas
- /manifest.json
- /meta/:type/:id.json  (ej. /meta/movie/tt0133093.json)

---

## Legal Disclaimer

This addon does **not** provide or distribute any video streams or copyrighted content.  
It only supplies metadata (title, poster, description) and an external link that redirects to **moviesindetail.com**, a site that aggregates publicly available information from official databases (OMDb, Trakt, etc.).  

The addon is intended purely as an informational tool.  
If you are looking for video playback, you must use authorized and legal streaming services.

By installing or using this addon you acknowledge that it is for informational purposes only.

// netlify/functions/addon.js
const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");

const {
  ADDON_NAME = "MoviesInDetail: Open Link",
  ADDON_DESCRIPTION = "Adds an external stream that opens moviesindetail.com for any ID.",
  LINK_BASE = "https://moviesindetail.com/",
  LOGO = "https://moviesindetail.com/images/icon-192.webp",
  OMDB_KEY = "" // opcional: si se establece y el ID es IMDb, resolvemos el título
} = process.env;

// Normaliza IDs para construir el enlace
function normalizeId(rawType, rawId) {
  const t = (rawType || "").toLowerCase();
  const x = (rawId || "").trim();

  if (/^tt\d{7,}$/.test(x)) return { url: `${LINK_BASE}?imdb=${x}` };                         // IMDb
  const mTmdb = x.match(/^tmdb:(movie|tv|person):(\d+)$/i);
  if (mTmdb) { const kind = mTmdb[1].toLowerCase(); const id = mTmdb[2];
    return { url: `${LINK_BASE}?tmdb=${id}&type=${kind}` }; }
  if (/^\d+$/.test(x) && (t === "movie" || t === "series")) {                                 // solo número → TMDb por tipo
    const kind = t === "series" ? "tv" : "movie";
    return { url: `${LINK_BASE}?tmdb=${x}&type=${kind}` };
  }
  const mTvdb = x.match(/^tvdb:(\d+)$/i);  if (mTvdb)  return { url: `${LINK_BASE}?tvdb=${mTvdb[1]}&type=${t}` };
  const mTrak = x.match(/^trakt:(movie|show|episode):([A-Za-z0-9\-]+)$/i);
  if (mTrak) { const kind = mTrak[1].toLowerCase(); const id = mTrak[2];
    return { url: `${LINK_BASE}?trakt=${id}&kind=${kind}` }; }
  const mAni  = x.match(/^anidb:(\d+)$/i); if (mAni)  return { url: `${LINK_BASE}?anidb=${mAni[1]}` };
  const mMal  = x.match(/^mal:(anime|manga):(\d+)$/i);
  if (mMal) { const kind = mMal[1].toLowerCase(); const id = mMal[2];
    return { url: `${LINK_BASE}?mal=${id}&kind=${kind}` }; }
  const mKitsu= x.match(/^kitsu:(anime|manga):(\d+)$/i);
  if (mKitsu){ const kind = mKitsu[1].toLowerCase(); const id = mKitsu[2];
    return { url: `${LINK_BASE}?kitsu=${id}&kind=${kind}` }; }

  return { url: `${LINK_BASE}?id=${encodeURIComponent(x)}&type=${t}` };                       // fallback
}

// Resuelve a un título legible cuando sea posible (IMDb vía OMDb). Fallback: devuelve el propio ID.
async function resolveTitle(type, rawId) {
  const x = (rawId || "").trim();
  try {
    if (OMDB_KEY && /^tt\d{7,}$/.test(x)) {
      const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${encodeURIComponent(x)}`;
      const resp = await fetch(url);
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && data.Title) return data.Title;
      }
    }
  } catch (_) {
    // ignorar errores de red o JSON
  }
  return x; // fallback: usa el ID tal cual
}

const manifest = {
  id: "org.moviesindetail.openlink",
  version: "2.0.0",
  name: ADDON_NAME,
  description: ADDON_DESCRIPTION,
  logo: LOGO,
  resources: ["stream"],                         // ← STREAM addon
  types: ["movie", "series"],
  idPrefixes: ["tt","tmdb","tvdb","trakt","anidb","mal","kitsu"] // consulta con todos
  catalogs: []
};

const app = express();
app.use(cors());

// Manifest
app.get("/manifest.json", (_req, res) => res.json(manifest));

// STREAMS: aparece en la lista de Streams/Torrents de Stremio
// Ruta: /stream/:type/:id.json
app.get("/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;
  const title = await resolveTitle(type, id);
  const searchUrl = `${LINK_BASE}?q=${encodeURIComponent(title)}`;

  // iOS (Stremio Lite) intenta reproducir 'url' internamente.
  // Enviamos SOLO 'externalUrl' y behaviorHints para forzar navegador.
  const streams = [{
    name: "MoviesInDetail",
    title: "Open in MoviesInDetail",
    externalUrl: searchUrl,
    behaviorHints: {
      openExternal: true,
      notWebReady: true,
      uiShowAllSources: true
    }
  }];

  res.json({ streams });
});

// Página simple
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<h3>${manifest.name}</h3>
<p>${manifest.description}</p>
<p><a href="/manifest.json">/manifest.json</a></p>
<p>Test stream IMDb: <code>/stream/movie/tt0133093.json</code></p>
<p>Test stream TMDb: <code>/stream/movie/tmdb:movie:603.json</code></p>`);
});

module.exports.handler = serverless(app);

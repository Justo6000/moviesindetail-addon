// netlify/functions/addon.js
const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");

const {
  ADDON_NAME = "MoviesInDetail: Open Link",
  ADDON_DESCRIPTION = "Search any movie or series and open MoviesInDetail.com to see detailed info: cast, crew, trailers, trivia and more.",
  LINK_BASE = "https://moviesindetail.com/",
  OMDB_KEY = "" // opcional
} = process.env;

// Resolver título legible (IMDb vía OMDb). Fallback: ID tal cual.
async function resolveTitle(type, rawId) {
  const x = (rawId || "").trim();
  const base = x.split(":")[0];
  if (OMDB_KEY && /^tt\d{7,}$/.test(base)) {
    try {
      const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${encodeURIComponent(base)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.Title) return data.Title;
      }
    } catch (_) {}
  }
  return x;
}

const manifest = {
  id: "org.moviesindetail.openlink",
  version: "2.1.0",
  name: ADDON_NAME,
  description: ADDON_DESCRIPTION,
  logo: "https://moviesindetail.com/logo-personal.png",
  resources: ["stream", "meta"],          // ← añadimos meta para Omni
  types: ["movie", "series"],
  idPrefixes: ["tt", "tmdb", "tvdb", "trakt", "anidb", "mal", "kitsu"],
  catalogs: [],
  stremioAddonsConfig: {
    issuer: "https://stremio-addons.net",
    signature:
      "eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..rnh8FCco4nMRfMcE3Jd9qA.PoumAgXBLmUDGy9wJDRvoq0gZL8fiqGVR8IdJX9K_cdIV2amt8HULJ7wkk0svb14Kq2Zi8vwFc9EvDgBEv51e4f8SEncWpdGrlN_UjuDwyxLP6tFxZmqveMYM2nlz7Cb.fEAuvqvrCVEHusQaucFizg"
  }
};

const app = express();
app.disable("x-powered-by");                 // oculta cabecera
app.use(cors({ methods: ["GET"] }));         // solo GET

// Manifest (sin caché) por ambas rutas
app.get(
  ["/manifest.json", "/.netlify/functions/addon/manifest.json"],
  (_req, res) => {
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0"
    });
    res.json(manifest);
  }
);

// STREAMS: botón que abre tu web
app.get(
  ["/stream/:type/:id.json", "/.netlify/functions/addon/stream/:type/:id.json"],
  async (req, res) => {
    const { type, id } = req.params;
    const title = await resolveTitle(type, id);
    const searchUrl = `${LINK_BASE}?q=${encodeURIComponent(title)}`;
    res.set({ "Cache-Control": "no-cache, no-store, must-revalidate" });
    res.json({
      streams: [
        {
          name: "MoviesInDetail",
          title: "Open in MoviesInDetail",
          externalUrl: searchUrl,
          behaviorHints: { openExternal: true, notWebReady: true, uiShowAllSources: true }
        }
      ]
    });
  }
);

// META: enlaces clicables para Omni (abre navegador)
app.get(
  ["/meta/:type/:id.json", "/.netlify/functions/addon/meta/:type/:id.json"],
  async (req, res) => {
    const { type, id } = req.params;
    const title = await resolveTitle(type, id);
    const linkUrl = `${LINK_BASE}?q=${encodeURIComponent(title)}`;
    const safeType = (type === "movie" || type === "series") ? type : "movie";

    res.set({ "Cache-Control": "no-cache, no-store, must-revalidate" });
    res.json({
      meta: {
        id,
        type: safeType,
        name: title,
        poster: "https://moviesindetail.com/logo-personal.png",
        description: "Open detailed info in MoviesInDetail",
        links: [{ name: "Open in MoviesInDetail", url: linkUrl }]
      }
    });
  }
);

// Página HTML simple
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<h3>${manifest.name}</h3>
<p>${manifest.description}</p>
<p><a href="/manifest.json">/manifest.json</a></p>
<p>Test stream IMDb: <code>/stream/movie/tt0133093.json</code></p>
<p>Test meta IMDb: <code>/meta/movie/tt0133093.json</code></p>`);
});

app.get("/.netlify/functions/addon", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<h3>${manifest.name}</h3>
<p>${manifest.description}</p>
<p><a href="/manifest.json">/manifest.json</a></p>
<p>Test stream IMDb: <code>/stream/movie/tt0133093.json</code></p>
<p>Test meta IMDb: <code>/meta/movie/tt0133093.json</code></p>`);
});

module.exports.handler = serverless(app);

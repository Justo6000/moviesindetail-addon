// netlify/functions/addon.js
const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");

const {
  ADDON_NAME = "MoviesInDetail: Open Link",
  ADDON_DESCRIPTION = "Search any movie or series and open MoviesInDetail.com to see detailed info: cast, crew, trailers, trivia and more.",
  LINK_BASE = "https://moviesindetail.com/",
  LOGO = "https://moviesindetail.com/logo-personal.png",
  OMDB_KEY = "" // opcional
} = process.env;

// (opcional) normalizador por si lo usas en el futuro
function normalizeId(rawType, rawId) {
  const t = (rawType || "").toLowerCase();
  const x = (rawId || "").trim();
  if (/^tt\d{7,}$/.test(x)) return { url: `${LINK_BASE}?imdb=${x}` };
  const mTmdb = x.match(/^tmdb:(movie|tv|person):(\d+)$/i);
  if (mTmdb) return { url: `${LINK_BASE}?tmdb=${mTmdb[2]}&type=${mTmdb[1].toLowerCase()}` };
  if (/^\d+$/.test(x) && (t === "movie" || t === "series")) {
    const kind = t === "series" ? "tv" : "movie";
    return { url: `${LINK_BASE}?tmdb=${x}&type=${kind}` };
  }
  const mTvdb = x.match(/^tvdb:(\d+)$/i);
  if (mTvdb) return { url: `${LINK_BASE}?tvdb=${mTvdb[1]}&type=${t}` };
  const mTrak = x.match(/^trakt:(movie|show|episode):([\w-]+)$/i);
  if (mTrak) return { url: `${LINK_BASE}?trakt=${mTrak[2]}&kind=${mTrak[1].toLowerCase()}` };
  const mAni = x.match(/^anidb:(\d+)$/i);
  if (mAni) return { url: `${LINK_BASE}?anidb=${mAni[1]}` };
  const mMal = x.match(/^mal:(anime|manga):(\d+)$/i);
  if (mMal) return { url: `${LINK_BASE}?mal=${mMal[2]}&kind=${mMal[1].toLowerCase()}` };
  const mKitsu = x.match(/^kitsu:(anime|manga):(\d+)$/i);
  if (mKitsu) return { url: `${LINK_BASE}?kitsu=${mKitsu[2]}&kind=${mKitsu[1].toLowerCase()}` };
  return { url: `${LINK_BASE}?id=${encodeURIComponent(x)}&type=${t}` };
}

// Resolver título legible (fallback al ID)
async function resolveTitle(type, rawId) {
  const x = (rawId || "").trim();
  const base = x.split(":")[0];
  try {
    if (OMDB_KEY && /^tt\d{7,}$/.test(base)) {
      const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${encodeURIComponent(base)}`;
      const resp = await fetch(url);
      if (resp?.ok) {
        const data = await resp.json();
        if (data?.Title) return data.Title;
      }
    }
  } catch (_) {}
  return x;
}

const manifest = {
  id: "org.moviesindetail.openlink",
  version: "2.0.8", // <- subida para forzar refresco
  name: ADDON_NAME,
  description: ADDON_DESCRIPTION,
  logo: "https://moviesindetail.com/logo-personal.png",
  resources: ["stream"],
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
app.use(cors());

// Manifest por ambas rutas y sin caché
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

// Streams por ambas rutas
app.get(
  ["/stream/:type/:id.json", "/.netlify/functions/addon/stream/:type/:id.json"],
  async (req, res) => {
    const { type, id } = req.params;
    const title = await resolveTitle(type, id);
    const searchUrl = `${LINK_BASE}?q=${encodeURIComponent(title)}`;
    const streams = [
      {
        name: "MoviesInDetail",
        title: "Open in MoviesInDetail",
        externalUrl: searchUrl,
        behaviorHints: {
          openExternal: true,
          notWebReady: true,
          uiShowAllSources: true
        }
      }
    ];
    res.json({ streams });
  }
);

// Página HTML raíz
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<h3>${manifest.name}</h3>
<p>${manifest.description}</p>
<p><a href="/manifest.json">/manifest.json</a></p>
<p>Test stream IMDb: <code>/stream/movie/tt0133093.json</code></p>`);
});

// Página HTML en la base de la función
app.get("/.netlify/functions/addon", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<h3>${manifest.name}</h3>
<p>${manifest.description}</p>
<p><a href="/manifest.json">/manifest.json</a></p>
<p>Test stream IMDb: <code>/stream/movie/tt0133093.json</code></p>`);
});

module.exports.handler = serverless(app);

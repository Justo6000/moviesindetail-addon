// netlify/functions/addon.js
const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");

const {
  ADDON_NAME = "MoviesInDetail: Open Link",
  ADDON_DESCRIPTION = "Adds a direct link to moviesindetail.com for any Stremio ID.",
  LINK_BASE = "https://moviesindetail.com/",
  LOGO = "https://moviesindetail.com/images/icon-192.webp"
} = process.env;

/* ----------- ID PARSER: admite múltiples esquemas ----------- */
/* Devuelve { scheme, type, id, url }  */
function normalizeId(rawType, rawId) {
  const t = (rawType || "").toLowerCase();
  const x = (rawId || "").trim();

  // IMDb tt1234567
  if (/^tt\d{7,}$/.test(x)) {
    return { scheme: "imdb", type: t, id: x, url: `${LINK_BASE}?imdb=${x}` };
  }

  // TMDb formatos: "tmdb:movie:123", "tmdb:tv:456", o solo números con hint por tipo
  const mTmdb = x.match(/^tmdb:(movie|tv|person):(\d+)$/i);
  if (mTmdb) {
    const kind = mTmdb[1].toLowerCase();
    const id = mTmdb[2];
    return { scheme: "tmdb", type: kind === "tv" ? "series" : "movie", id, url: `${LINK_BASE}?tmdb=${id}&type=${kind}` };
  }
  if (/^\d+$/.test(x) && (t === "movie" || t === "series")) {
    // si Stremio nos manda solo números, asúmelo como TMDb por tipo
    const kind = t === "series" ? "tv" : "movie";
    return { scheme: "tmdb", type: t, id: x, url: `${LINK_BASE}?tmdb=${x}&type=${kind}` };
  }

  // TVDB: tvdb:12345
  const mTvdb = x.match(/^tvdb:(\d+)$/i);
  if (mTvdb) {
    const id = mTvdb[1];
    return { scheme: "tvdb", type: t, id, url: `${LINK_BASE}?tvdb=${id}&type=${t}` };
  }

  // Trakt: trakt:movie:123 o trakt:show:slug
  const mTrakt = x.match(/^trakt:(movie|show|episode):([A-Za-z0-9\-]+)$/i);
  if (mTrakt) {
    const kind = mTrakt[1].toLowerCase();
    const id = mTrakt[2];
    return { scheme: "trakt", type: kind === "show" ? "series" : "movie", id, url: `${LINK_BASE}?trakt=${id}&kind=${kind}` };
  }

  // AniDB: anidb:12345
  const mAni = x.match(/^anidb:(\d+)$/i);
  if (mAni) {
    const id = mAni[1];
    return { scheme: "anidb", type: t, id, url: `${LINK_BASE}?anidb=${id}` };
  }

  // MyAnimeList: mal:anime:123, mal:manga:456
  const mMal = x.match(/^mal:(anime|manga):(\d+)$/i);
  if (mMal) {
    const kind = mMal[1].toLowerCase();
    const id = mMal[2];
    return { scheme: "mal", type: kind === "anime" ? "series" : t, id, url: `${LINK_BASE}?mal=${id}&kind=${kind}` };
  }

  // Kitsu: kitsu:anime:123
  const mKitsu = x.match(/^kitsu:(anime|manga):(\d+)$/i);
  if (mKitsu) {
    const kind = mKitsu[1].toLowerCase();
    const id = mKitsu[2];
    return { scheme: "kitsu", type: kind === "anime" ? "series" : t, id, url: `${LINK_BASE}?kitsu=${id}&kind=${kind}` };
  }

  // Desconocido → link genérico con eco del ID
  return { scheme: "unknown", type: t, id: x, url: `${LINK_BASE}?id=${encodeURIComponent(x)}&type=${t}` };
}

/* ---------------- Manifest ---------------- */
const manifest = {
  id: "org.moviesindetail.openlink",
  version: "1.1.0",
  name: ADDON_NAME,
  description: ADDON_DESCRIPTION,
  logo: LOGO,
  resources: ["catalog", "meta"],
  types: ["movie", "series"],
  // sin idPrefixes para que Stremio nos consulte siempre
  catalogs: [
    { type: "movie",  id: "mid-mini", name: "MID • Quick Test" },
    { type: "series", id: "mid-mini", name: "MID • Quick Test" }
  ]
};

// Catálogo mínimo para que Stremio nos descubra
const MINI = {
  movie:  [{ id: "tt0133093", type: "movie",  name: "The Matrix",     poster: LOGO }],
  series: [{ id: "tt0944947", type: "series", name: "Game of Thrones", poster: LOGO }]
};

const app = express();
app.use(cors());

app.get("/manifest.json", (_req, res) => res.json(manifest));

app.get("/catalog/:type/:id.json", (req, res) => {
  const { type } = req.params;
  res.json({ metas: MINI[type] || [] });
});

app.get("/meta/:type/:id.json", (req, res) => {
  const { type, id } = req.params;
  const n = normalizeId(type, id);
  const meta = {
    id: n.id,
    type: n.type || type,
    name: `Open in MoviesInDetail (${n.scheme}:${n.id})`,
    poster: LOGO,
    description: "Open full details on moviesindetail.com",
    links: [{ name: "Open in MoviesInDetail", url: n.url }]
  };
  res.json({ meta });
});

app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<h3>${manifest.name}</h3>
<p>${manifest.description}</p>
<p><a href="/manifest.json">/manifest.json</a></p>
<p>Catalog movie: <code>/catalog/movie/mid-mini.json</code></p>
<p>Meta IMDb: <code>/meta/movie/tt0133093.json</code></p>
<p>Meta TMDb (movie): <code>/meta/movie/tmdb:movie:603</code></p>`);
});

module.exports.handler = serverless(app);

import express from "express";
import cors from "cors";
import { addonBuilder, getInterface, getManifest } from "stremio-addon-sdk";
import serverless from "serverless-http";

// Variables de entorno (configúralas en Netlify UI: Site > Settings > Environment)
const {
  ADDON_NAME = "MoviesInDetail: Open Link",
  ADDON_DESCRIPTION = "Añade un enlace directo a moviesindetail.com para títulos con ID IMDb.",
  LINK_TEMPLATE = "https://moviesindetail.com/?q={{id}}",
  LOGO = "https://moviesindetail.com/images/icon-192.webp"
} = process.env;

// Manifest
const manifest = {
  id: "org.moviesindetail.openlink",
  version: "1.0.0",
  name: ADDON_NAME,
  description: ADDON_DESCRIPTION,
  logo: LOGO,
  resources: ["meta"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  catalogs: []
};

const builder = new addonBuilder(manifest);

function buildLinkFromId(imdbId) {
  return LINK_TEMPLATE.replaceAll("{{id}}", imdbId);
}

builder.defineMetaHandler(async ({ type, id }) => {
  if (!/^tt\d{7,}$/.test(id || "")) return { meta: null };

  const meta = {
    id,
    type,
    name: `Open in MoviesInDetail (${id})`,
    poster: LOGO,
    description: "Abrir ficha ampliada en moviesindetail.com",
    links: [{ name: "Open in MoviesInDetail", url: buildLinkFromId(id) }]
  };
  return { meta };
});

const app = express();
app.use(cors());

const iface = getInterface(builder);

// Rutas compatibles con los redirects del netlify.toml
app.get("/manifest.json", (_req, res) => res.json(getManifest(builder)));
app.get("/:resource/:type/:id.json", (req, res) => iface(req, res));

// Página informativa opcional
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<h3>${manifest.name}</h3>
<p>${manifest.description}</p>
<p><a href="/manifest.json">/manifest.json</a></p>
<p>Ejemplo: <code>/meta/movie/tt0133093.json</code></p>`);
});

export const handler = serverless(app, { binary: [] });
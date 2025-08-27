const express = require("express");
const cors = require("cors");
const { addonBuilder, getInterface } = require("stremio-addon-sdk");
const serverless = require("serverless-http");

const {
  ADDON_NAME = "MoviesInDetail: Open Link",
  ADDON_DESCRIPTION = "Adds a direct link to moviesindetail.com for IMDb titles.",
  LINK_TEMPLATE = "https://moviesindetail.com/?q={{id}}",
  LOGO = "https://moviesindetail.com/images/icon-192.webp"
} = process.env;

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

// META
builder.defineMetaHandler(async ({ type, id }) => {
  if (!/^tt\d{7,}$/.test(id || "")) return { meta: null };
  return {
    meta: {
      id,
      type,
      name: `Open in MoviesInDetail (${id})`,
      poster: LOGO,
      description: "Open full details on moviesindetail.com",
      links: [{ name: "Open in MoviesInDetail", url: LINK_TEMPLATE.replace(/{{id}}/g, id) }]
    }
  };
});

const app = express();
app.use(cors());

// Aquí: getInterface(builder) devuelve la función manejadora
const iface = getInterface(builder);

app.get("/manifest.json", (_req, res) => res.json(manifest));
app.get("/:resource/:type/:id.json", (req, res) => iface(req, res));
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<h3>${manifest.name}</h3>
<p>${manifest.description}</p>
<p><a href="/manifest.json">/manifest.json</a></p>
<p>Ejemplo: <code>/meta/movie/tt0133093.json</code></p>`);
});

module.exports.handler = serverless(app, { binary: [] });

const express = require("express");
const cors = require("cors");
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

const app = express();
app.use(cors());

// Manifest
app.get("/manifest.json", (_req, res) => res.json(manifest));

// META: /meta/:type/:id.json
app.get("/:resource/:type/:id.json", (req, res) => {
  const { resource, type, id } = req.params;
  if (resource !== "meta") return res.status(404).json({});
  if (!["movie", "series"].includes(type) || !/^tt\d{7,}$/.test(id || "")) {
    return res.json({ meta: null });
  }
  const meta = {
    id,
    type,
    name: `Open in MoviesInDetail (${id})`,
    poster: LOGO,
    description: "Open full details on moviesindetail.com",
    links: [{ name: "Open in MoviesInDetail", url: LINK_TEMPLATE.replace(/{{id}}/g, id) }]
  };
  res.json({ meta });
});

// Página simple
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<h3>${manifest.name}</h3>
<p>${manifest.description}</p>
<p><a href="/manifest.json">/manifest.json</a></p>
<p>Ejemplo: <code>/meta/movie/tt0133093.json</code></p>`);
});

module.exports.handler = serverless(app, { binary: [] });

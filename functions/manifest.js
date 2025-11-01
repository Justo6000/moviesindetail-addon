const ADDON_NAME = "MoviesInDetail: Open Link";
const ADDON_DESCRIPTION = "Search any movie or series and open MoviesInDetail.com to see detailed info: cast, crew, trailers, trivia and more.";
const LINK_BASE = "https://www.moviesindetail.com/"; 
const OMDB_KEY = "f9f2bcf"; // Placeholder - DEBES USAR LA VARIABLE DE ENTORNO

// --- Lógica para resolver el título (Adaptada de Netlify ) ---
async function resolveTitle(context, type, rawId) {
  const x = (rawId || "").trim();
  const base = x.split(":")[0];
  
  // Obtener la clave de OMDB de las variables de entorno de Cloudflare Pages
  const OMDB_API_KEY = context.env.OMDB_KEY;

  // Solo intentamos la llamada a OMDb si tenemos la clave y el ID es de IMDb (ttXXXXX)
  if (OMDB_API_KEY && /^tt\d{7,}$/.test(base)) {
    try {
      const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${encodeURIComponent(base )}`;
      
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000); 
      
      const resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.Title) return data.Title;
      }
    } catch (e) {
      console.error("OMDb fetch error:", e.message);
    }
  }
  // Fallback: devolver el ID original
  return x;
}

// --- Manifiesto Estático ---
const manifest = {
  id: "org.moviesindetail.openlink",
  version: "2.2.8", 
  name: ADDON_NAME,
  description: ADDON_DESCRIPTION,
  logo: "https://www.moviesindetail.com/icon-192.webp", 
  resources: ["stream"], 
  types: ["movie", "series"],
  idPrefixes: ["tt", "tmdb", "tvdb", "trakt", "anidb", "mal", "kitsu"],
  catalogs: [],
  behaviorHints: { notWebReady: true }
};

// --- Función Principal de Cloudflare Pages ---
export async function onRequest(context ) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const parts = path.split("/").filter(p => p.length > 0);

  // --------------------------------------------------
  // 1. MANIFEST
  // Manejamos /manifest.json y la ruta de la función (/manifest)
  // --------------------------------------------------
  if (path === "/manifest.json" || path === "/manifest") {
    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  }

  // --------------------------------------------------
  // 2. STREAMS
  // Formato: /stream/type/id.json
  // --------------------------------------------------
  if (parts.length === 3 && parts[0] === "stream" && parts[2].endsWith(".json")) {
    const type = parts[1];
    const id = parts[2].replace(".json", ""); 

    if (type !== "movie" && type !== "series") {
      return new Response(JSON.stringify({ streams: [] }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 1. Obtener el título usando la lógica de OMDb
    const title = await resolveTitle(context, type, id);
    
    // 2. Crear la URL de redirección (usando ?q= como en tu código Netlify)
    const searchUrl = `${LINK_BASE}?q=${encodeURIComponent(title)}`;

    // 3. Crear el objeto Stream falso con externalUrl
    const streams = {
      streams: [
        {
          name: "MoviesInDetail",
          title: "Open in MoviesInDetail",
          externalUrl: searchUrl, 
          behaviorHints: { openExternal: true, notWebReady: true, uiShowAllSources: true }
        }
      ]
    };

    return new Response(JSON.stringify(streams, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0"
      }
    });
  }


  // --------------------------------------------------
  // 3. FALLBACK
  // --------------------------------------------------
  return new Response("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

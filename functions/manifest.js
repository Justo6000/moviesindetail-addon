const ADDON_NAME = "MoviesInDetail: Open Link";
const ADDON_DESCRIPTION = "Search any movie or series and open MoviesInDetail.com to see detailed info: cast, crew, trailers, trivia and more.";
const LINK_BASE = "https://www.moviesindetail.com/";

function decodeStremioId(rawId) {
  const value = String(rawId || "").trim();
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

async function resolveTitle(context, rawId) {
  const decodedId = decodeStremioId(rawId);
  const baseId = decodedId.split(":")[0];
  const omdbKey = context.env?.OMDB_KEY;

  if (omdbKey && /^tt\d{7,}$/.test(baseId)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(
        `https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&i=${encodeURIComponent(baseId)}`,
        { signal: controller.signal }
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.Title && data?.Response !== "False") {
          return data.Title;
        }
      }
    } catch (error) {
      console.warn("MoviesInDetail OMDb lookup failed:", error?.message || error);
    } finally {
      clearTimeout(timer);
    }
  }

  // Para episodios nunca enviamos :temporada:episodio al buscador.
  // Si OMDb no estuviera disponible, el fallback es el ID IMDb base.
  return baseId || decodedId;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // --- MANIFEST ---
  if (path === "/manifest.json" || path === "/manifest") {
    const manifest = {
      id: "org.moviesindetail.openlink",
      version: "2.2.9",
      name: ADDON_NAME,
      description: ADDON_DESCRIPTION,
      logo: "https://www.moviesindetail.com/icon-192.webp",
      resources: ["stream"],
      types: ["movie", "series"],
      idPrefixes: ["tt", "tmdb", "tvdb", "trakt", "anidb", "mal", "kitsu"],
      catalogs: [],
      behaviorHints: { notWebReady: true }
    };

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  }

  // --- STREAM ---
  const streamMatch = path.match(/^\/stream\/(movie|series)\/([^\/]+)\.json$/);
  if (streamMatch) {
    const rawId = streamMatch[2];
    const title = await resolveTitle(context, rawId);
    const searchUrl = `${LINK_BASE}?q=${encodeURIComponent(title)}`;

    const result = {
      streams: [
        {
          name: "MoviesInDetail",
          title: `Open ${title} in MoviesInDetail`,
          externalUrl: searchUrl,
          behaviorHints: {
            openExternal: true,
            notWebReady: true,
            uiShowAllSources: true
          }
        }
      ]
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  }

  // --- FALLBACK ---
  return new Response("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

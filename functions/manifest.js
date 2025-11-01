const ADDON_NAME = "MoviesInDetail: Open Link";
const ADDON_DESCRIPTION = "Search any movie or series and open MoviesInDetail.com to see detailed info: cast, crew, trailers, trivia and more.";
const LINK_BASE = "https://www.moviesindetail.com/";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // --- MANIFEST ---
  if (path === "/manifest.json" || path === "/manifest") {
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
    const type = streamMatch[1];
    const id = streamMatch[2];

    // Generar URL de MoviesInDetail
    const searchUrl = `${LINK_BASE}?q=${encodeURIComponent(id)}`;
    const result = {
      streams: [
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

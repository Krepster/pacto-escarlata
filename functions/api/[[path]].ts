const WORKER_API = "https://pacto-escarlata.comosimepones27.workers.dev";
const TALENTS_DATA_URL = "https://talentsforever.com/data.json";

export const onRequest = async (context: { request: Request }): Promise<Response> => {
  const incomingUrl = new URL(context.request.url);

  // Proxy same-origin del JSON público para evitar bloqueos CORS en el navegador.
  if (incomingUrl.pathname === "/api/talents-data") {
    const upstream = await fetch(TALENTS_DATA_URL, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "No se pudieron obtener los datos de talentos." }), {
        status: 502,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-Content-Source": "TalentsForever",
      },
    });
  }

  // Mantiene el proxy existente para el resto de rutas /api hacia el Worker.
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, WORKER_API);
  return fetch(new Request(targetUrl, context.request));
};

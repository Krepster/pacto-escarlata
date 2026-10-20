
const WORKER_API = "https://pacto-escarlata.comosimepones27.workers.dev";

export const onRequest = async (context: { request: Request }): Promise<Response> => {
  const incomingUrl = new URL(context.request.url);

  // Conserva /api en la ruta y también los parámetros de consulta.
  const targetUrl = new URL(
    incomingUrl.pathname + incomingUrl.search,
    WORKER_API
  );

  return fetch(new Request(targetUrl, context.request));
};

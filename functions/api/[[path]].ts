
const WORKER_API = "https://pacto-escarlata.comosimepones27.workers.dev";

interface Env {
  ASSETS: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const incomingUrl = new URL(context.request.url);
  const path = incomingUrl.pathname.replace(/^\/api/, "");

  const targetUrl = new URL(path + incomingUrl.search, WORKER_API);

  const request = new Request(targetUrl, context.request);

  return fetch(request);
};

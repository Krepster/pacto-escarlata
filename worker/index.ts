export interface Env {
  DB: D1Database;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "Content-Type",
      "cache-control": "no-store",
    },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      try {
        await env.DB.prepare("SELECT 1").first();
        return json({ status: "ok", database: "connected", project: "Pacto Escarlata" });
      } catch {
        return json({ status: "error", database: "unavailable" }, 503);
      }
    }

    if (url.pathname === "/api/guild" && request.method === "GET") {
      return json({
        name: "Pacto Escarlata",
        game: "World of Warcraft",
        server: "WoW Forever",
        mode: "PvE Normal",
        faction: "Alianza",
        focus: ["PvE", "PvP", "Comunidad"],
      });
    }

    if (url.pathname === "/api/events" && request.method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT id, title, event_type AS type, starts_at, description FROM events ORDER BY starts_at LIMIT 20"
        ).all();
        return json(result.results);
      } catch {
        return json({ error: "No se pudieron consultar los eventos." }, 500);
      }
    }

    return json({ error: "Not found" }, 404);
  },
};

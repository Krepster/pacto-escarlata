
export interface Env {
  DB: D1Database;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
}

const SESSION_COOKIE = "__Host-pacto_admin";
const SESSION_DURATION = 8 * 60 * 60;
const ALLOWED_ORIGINS = new Set([
  "https://pacto-escarlata.pages.dev",
  "http://localhost:5173",
  "http://localhost:5174",
]);

const json = (data: unknown, status = 200, extraHeaders?: HeadersInit) => {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });

  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) =>
      headers.set(key, value)
    );
  }

  return new Response(JSON.stringify(data), { status, headers });
};

const encodeBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const decodeBase64Url = (value: string): Uint8Array | null => {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
};

const constantTimeEqual = (a: string, b: string): boolean => {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }

  return difference === 0;
};

const getSigningKey = async (secret: string): Promise<CryptoKey> => {
  const keyBytes = Uint8Array.from(atob(secret), (char) =>
    char.charCodeAt(0)
  );

  if (keyBytes.length < 32) {
    throw new Error("SESSION_SECRET debe contener al menos 32 bytes.");
  }

  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
};

const signSession = async (
  payload: string,
  secret: string
): Promise<string> => {
  const key = await getSigningKey(secret);
  const data = new TextEncoder().encode(payload);
  const signature = await crypto.subtle.sign("HMAC", key, data);

  return encodeBase64Url(new Uint8Array(signature));
};

const createSession = async (env: Env): Promise<string> => {
  const payload = JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
    nonce: encodeBase64Url(crypto.getRandomValues(new Uint8Array(16))),
  });

  const encodedPayload = encodeBase64Url(
    new TextEncoder().encode(payload)
  );
  const signature = await signSession(encodedPayload, env.SESSION_SECRET);

  return `${encodedPayload}.${signature}`;
};

const isAuthenticated = async (
  request: Request,
  env: Env
): Promise<boolean> => {
  try {
    const cookieHeader = request.headers.get("Cookie") ?? "";
    const cookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

    if (!cookie) return false;

    const token = cookie.slice(SESSION_COOKIE.length + 1);
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [payload, signature] = parts;
    const key = await getSigningKey(env.SESSION_SECRET);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature) as BufferSource,
      new TextEncoder().encode(payload)
    );

    if (!valid) return false;

    const decodedPayload = decodeBase64Url(payload);
    if (!decodedPayload) return false;

    const session = JSON.parse(
      new TextDecoder().decode(decodedPayload)
    ) as { exp?: number; nonce?: string };

    return (
      typeof session.exp === "number" &&
      session.exp > Math.floor(Date.now() / 1000) &&
      typeof session.nonce === "string"
    );
  } catch {
    return false;
  }
};

const cookieHeaders = (token: string, maxAge: number): Headers => {
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
  );
  return headers;
};

const isAllowedOrigin = (request: Request): boolean => {
  const origin = request.headers.get("Origin");
  return origin !== null && ALLOWED_ORIGINS.has(origin);
};

const readJson = async (
  request: Request
): Promise<Record<string, unknown> | null> => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return null;
  }

  const text = await request.text();
  if (text.length > 20_000) return null;

  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
};

const validEvent = (
  body: Record<string, unknown>
): body is Record<string, string> & {
  title: string;
  type: "PvE" | "PvP" | "Social";
  starts_at: string;
  description?: string;
} => {
  if (
    typeof body.title !== "string" ||
    body.title.trim().length < 1 ||
    body.title.trim().length > 120 ||
    !["PvE", "PvP", "Social"].includes(String(body.type)) ||
    typeof body.starts_at !== "string" ||
    body.starts_at.length > 40 ||
    !Number.isFinite(Date.parse(body.starts_at))
  ) {
    return false;
  }

  return (
    body.description === undefined ||
    (typeof body.description === "string" &&
      body.description.length <= 2000)
  );
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    if (pathname === "/health" && method === "GET") {
      try {
        await env.DB.prepare("SELECT 1").first();
        return json({
          status: "ok",
          database: "connected",
          project: "Pacto Escarlata",
        });
      } catch {
        return json({ status: "error", database: "unavailable" }, 503);
      }
    }

    if (pathname === "/api/guild" && method === "GET") {
      return json({
        name: "Pacto Escarlata",
        game: "World of Warcraft",
        server: "WoW Forever",
        mode: "PvE Normal",
        faction: "Alianza",
        focus: ["PvE", "PvP", "Comunidad"],
      });
    }

    if (pathname === "/api/events" && method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT id, title, event_type AS type, starts_at, description FROM events ORDER BY starts_at LIMIT 20"
        ).all();

        return json(result.results);
      } catch {
        return json({ error: "No se pudieron consultar los eventos." }, 500);
      }
    }

    if (pathname === "/api/admin/login" && method === "POST") {
      if (!isAllowedOrigin(request)) {
        return json({ error: "Origen no permitido." }, 403);
      }

      const body = await readJson(request);
      if (
        !body ||
        typeof body.username !== "string" ||
        typeof body.password !== "string"
      ) {
        return json({ error: "Datos de acceso no válidos." }, 400);
      }

      const usernameOK = constantTimeEqual(
        body.username,
        env.ADMIN_USERNAME
      );
      const passwordOK = constantTimeEqual(
        body.password,
        env.ADMIN_PASSWORD
      );

      if (!usernameOK || !passwordOK) {
        return json({ error: "Usuario o contraseña incorrectos." }, 401);
      }

      try {
        const token = await createSession(env);
        return json(
          { authenticated: true },
          200,
          cookieHeaders(token, SESSION_DURATION)
        );
      } catch {
        return json({ error: "No se pudo crear la sesión." }, 500);
      }
    }

    if (pathname === "/api/admin/session" && method === "GET") {
      const authenticated = await isAuthenticated(request, env);
      return json({ authenticated }, authenticated ? 200 : 401);
    }

    if (pathname === "/api/admin/logout" && method === "POST") {
      if (!isAllowedOrigin(request)) {
        return json({ error: "Origen no permitido." }, 403);
      }

      return json(
        { authenticated: false },
        200,
        cookieHeaders("", 0)
      );
    }

    if (
      pathname === "/api/events" ||
      /^\/api\/events\/[^/]+$/.test(pathname)
    ) {
      if (!["POST", "PUT", "DELETE"].includes(method)) {
        return json({ error: "Método no permitido." }, 405);
      }

      if (!isAllowedOrigin(request)) {
        return json({ error: "Origen no permitido." }, 403);
      }

      if (!(await isAuthenticated(request, env))) {
        return json({ error: "Debes iniciar sesión." }, 401);
      }

      if (method === "POST" && pathname === "/api/events") {
        const body = await readJson(request);
        if (!body || !validEvent(body)) {
          return json({ error: "Los datos del evento no son válidos." }, 400);
        }

        try {
          const result = await env.DB.prepare(
            "INSERT INTO events (title, event_type, starts_at, description) VALUES (?, ?, ?, ?)"
          )
            .bind(
              body.title.trim(),
              body.type,
              body.starts_at,
              body.description ?? null
            )
            .run();

          return json({ success: true, id: result.meta.last_row_id }, 201);
        } catch {
          return json({ error: "No se pudo crear el evento." }, 500);
        }
      }

      const idText = pathname.split("/").pop() ?? "";
      const id = Number(idText);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return json({ error: "Identificador no válido." }, 400);
      }

      if (method === "PUT") {
        const body = await readJson(request);
        if (!body || !validEvent(body)) {
          return json({ error: "Los datos del evento no son válidos." }, 400);
        }

        try {
          const result = await env.DB.prepare(
            "UPDATE events SET title = ?, event_type = ?, starts_at = ?, description = ? WHERE id = ?"
          )
            .bind(
              body.title.trim(),
              body.type,
              body.starts_at,
              body.description ?? null,
              id
            )
            .run();

          if (!result.meta.changes) {
            return json({ error: "Evento no encontrado." }, 404);
          }

          return json({ success: true });
        } catch {
          return json({ error: "No se pudo actualizar el evento." }, 500);
        }
      }

      if (method === "DELETE") {
        try {
          const result = await env.DB.prepare(
            "DELETE FROM events WHERE id = ?"
          )
            .bind(id)
            .run();

          if (!result.meta.changes) {
            return json({ error: "Evento no encontrado." }, 404);
          }

          return json({ success: true });
        } catch {
          return json({ error: "No se pudo eliminar el evento." }, 500);
        }
      }
    }

    return json({ error: "Not found" }, 404);
  },
};

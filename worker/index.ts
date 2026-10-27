import { handleDiscordInteractions } from "./discord-interactions";


export interface Env {
  DB: D1Database;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_GUILD_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_REVIEW_CHANNEL_ID: string;
  DISCORD_ADMIN_ROLE_ID: string;
  RAID_HELPER_API_KEY: string;
  RAID_HELPER_SERVER_ID: string;
}

const SESSION_COOKIE = "__Host-pacto_admin";
const SESSION_DURATION = 8 * 60 * 60;
const MEMBER_COOKIE = "__Host-pacto_member";
const OAUTH_STATE_COOKIE = "pacto_discord_state";
const DISCORD_CALLBACK_PATH = "/api/roster/discord/callback";
const PUBLIC_SITE_ORIGIN = "https://pacto-escarlata.pages.dev";
const ALLOWED_ORIGINS = new Set([
  "https://pacto-escarlata.pages.dev",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://192.168.1.27:5173",
  
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
    const signatureBytes = decodeBase64Url(signature);
    if (!signatureBytes) return false;

    const key = await getSigningKey(env.SESSION_SECRET);
    const signatureBuffer = new Uint8Array(signatureBytes).buffer;
    const payloadBuffer = new TextEncoder().encode(payload).buffer;
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      payloadBuffer
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



const cookieValue = (request: Request, name: string): string | null => {
  const header = request.headers.get("Cookie") ?? "";
  const part = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : null;
};

const makeCookie = (name: string, value: string, maxAge: number, secure = true): string =>
  `${name}=${value}; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax; Path=/; Max-Age=${maxAge}`;

const createMemberSession = async (discordId: string, username: string, env: Env): Promise<string> => {
  const payload = JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_DURATION, discordId, username, nonce: encodeBase64Url(crypto.getRandomValues(new Uint8Array(16))) });
  const encoded = encodeBase64Url(new TextEncoder().encode(payload));
  return `${encoded}.${await signSession(encoded, env.SESSION_SECRET)}`;
};

const readMemberSession = async (request: Request, env: Env): Promise<{ discordId: string; username: string } | null> => {
  try {
    const token = cookieValue(request, MEMBER_COOKIE);
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const decodedSignature = decodeBase64Url(signature);
    if (!decodedSignature) return null;
    const key = await getSigningKey(env.SESSION_SECRET);
    const signatureBytes = new Uint8Array(decodedSignature).buffer;
    if (!(await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(payload)))) return null;
    const decodedPayload = decodeBase64Url(payload);
    if (!decodedPayload) return null;
    const session = JSON.parse(new TextDecoder().decode(decodedPayload)) as { exp?: number; discordId?: string; username?: string };
    if (typeof session.exp !== "number" || session.exp <= Math.floor(Date.now() / 1000) || !session.discordId || !session.username) return null;
    return { discordId: session.discordId, username: session.username };
  } catch { return null; }
};

const redirectToSite = (request: Request, params: Record<string, string>): Response => {
  const origin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");
  let base = PUBLIC_SITE_ORIGIN;
  if (referer) {
    try { const parsed = new URL(referer); if (ALLOWED_ORIGINS.has(parsed.origin)) base = parsed.origin; } catch { /* ignore invalid referer */ }
  } else if (origin && ALLOWED_ORIGINS.has(origin)) base = origin;
  const target = new URL("/", base);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  return Response.redirect(target.toString(), 302);
};

const validRosterFields = (body: Record<string, unknown>): body is Record<string, string> & { character_name: string; class_name: string; specialization: string; role: string } => {
  const allowedRoles = ["Tank", "Healer", "DPS", "Tanking", "Healing", "Damage"];
  return typeof body.character_name === "string" && body.character_name.trim().length >= 2 && body.character_name.trim().length <= 32 &&
    typeof body.class_name === "string" && body.class_name.trim().length >= 2 && body.class_name.trim().length <= 40 &&
    typeof body.specialization === "string" && body.specialization.trim().length >= 2 && body.specialization.trim().length <= 60 &&
    typeof body.role === "string" && allowedRoles.includes(body.role);
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


type RaidHelperEvent = {
  id: string;
  title: string;
  description?: string;
  startTime: number | string;
};

type RaidHelperPage = {
  pages: number;
  eventsOverall: number;
  currentPage: number;
  postedEvents: RaidHelperEvent[];
};

const fetchRaidHelperEvents = async (env: Env): Promise<RaidHelperEvent[]> => {
  if (!env.RAID_HELPER_API_KEY || !env.RAID_HELPER_SERVER_ID) {
    throw new Error("Falta la configuración de Raid-Helper.");
  }

  const baseUrl = `https://raid-helper.xyz/api/v4/servers/${encodeURIComponent(env.RAID_HELPER_SERVER_ID)}/events`;
  const headers = { Authorization: env.RAID_HELPER_API_KEY };
  const maxPages = 100;
  const collected = new Map<string, RaidHelperEvent>();
  let expectedPages: number | null = null;
  let expectedTotal: number | null = null;

  for (let page = 1; page <= (expectedPages ?? 1); page++) {
    const response = await fetch(`${baseUrl}?Page=${page}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Raid-Helper devolvió HTTP ${response.status}.`);
    }

    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      throw new Error("Respuesta de Raid-Helper no válida.");
    }

    const data = payload as Partial<RaidHelperPage>;
    if (
      !Number.isInteger(data.pages) ||
      (data.pages as number) < 1 ||
      (data.pages as number) > maxPages ||
      !Number.isInteger(data.eventsOverall) ||
      (data.eventsOverall as number) < 0 ||
      data.currentPage !== page ||
      !Array.isArray(data.postedEvents)
    ) {
      throw new Error("Respuesta de Raid-Helper incompleta o mal formada.");
    }

    if (expectedPages === null) {
      expectedPages = data.pages as number;
      expectedTotal = data.eventsOverall as number;
    } else if (
      data.pages !== expectedPages ||
      data.eventsOverall !== expectedTotal
    ) {
      throw new Error("La paginación de Raid-Helper cambió durante la consulta.");
    }

    for (const item of data.postedEvents) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.id !== "string" ||
        !item.id.trim() ||
        typeof item.title !== "string" ||
        !item.title.trim() ||
        !(typeof item.startTime === "number" || typeof item.startTime === "string") ||
        !Number.isFinite(Number(item.startTime)) ||
        Number(item.startTime) <= 0 ||
        (item.description !== undefined && typeof item.description !== "string")
      ) {
        throw new Error("Raid-Helper devolvió un evento con campos no válidos.");
      }

      const id = item.id.trim();
      if (collected.has(id)) {
        throw new Error(`Raid-Helper devolvió el ID duplicado ${id}.`);
      }

      collected.set(id, {
        id,
        title: item.title.trim().slice(0, 120),
        description: typeof item.description === "string"
          ? item.description.slice(0, 2000)
          : undefined,
        startTime: Number(item.startTime),
      });
    }
  }

  if (
    expectedPages === null ||
    expectedTotal === null ||
    collected.size !== expectedTotal
  ) {
    throw new Error(
      `Respuesta incompleta de Raid-Helper: se recibieron ${collected.size} eventos de ${expectedTotal ?? "un total desconocido"}.`
    );
  }

  return [...collected.values()];
};

const syncRaidHelperEvents = async (env: Env): Promise<{ received: number }> => {
  const events = await fetchRaidHelperEvents(env);

  // D1 batch es transaccional: si falla cualquier sentencia, no se oculta
  // ningún evento por una sincronización incompleta.
  const statements = [
    env.DB.prepare(
      "UPDATE events SET is_visible = 0 WHERE raid_helper_id IS NOT NULL"
    ),
    ...events.map((event) =>
      env.DB.prepare(
        `INSERT INTO events
          (title, event_type, starts_at, description, raid_helper_id, is_visible)
         VALUES (?, 'PvE', ?, ?, ?, 1)
         ON CONFLICT DO UPDATE SET
           title = excluded.title,
           event_type = excluded.event_type,
           starts_at = excluded.starts_at,
           description = excluded.description,
           is_visible = 1`
      ).bind(
        event.title,
        new Date(Number(event.startTime) * 1000).toISOString(),
        event.description ?? null,
        event.id
      )
    ),
  ];

  await env.DB.batch(statements);
  return { received: events.length };
};


const randomToken = (bytes = 32): string =>
  encodeBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const cleanText = (value: unknown, min: number, max: number): string | null =>
  typeof value === "string" && value.trim().length >= min && value.trim().length <= max
    ? value.trim()
    : null;

const validDungeonGroup = (body: Record<string, unknown>) => {
  const title = cleanText(body.title, 3, 100);
  const dungeonName = cleanText(body.dungeon_name, 2, 100);
  const creatorName = cleanText(body.creator_name, 2, 40);
  const startsAt = typeof body.starts_at === "string" && Number.isFinite(Date.parse(body.starts_at))
    ? new Date(body.starts_at).toISOString() : null;
  const minLevel = Number(body.min_level);
  const maxLevel = Number(body.max_level);
  const tankSlots = Number(body.tank_slots ?? 1);
  const healerSlots = Number(body.healer_slots ?? 1);
  const dpsSlots = Number(body.dps_slots ?? 3);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!title || !dungeonName || !creatorName || !startsAt ||
      !Number.isInteger(minLevel) || minLevel < 1 || minLevel > 60 ||
      !Number.isInteger(maxLevel) || maxLevel < minLevel || maxLevel > 60 ||
      ![tankSlots, healerSlots, dpsSlots].every((n) => Number.isInteger(n) && n >= 0 && n <= 5) ||
      tankSlots + healerSlots + dpsSlots < 1 || description.length > 1500) return null;
  return { title, dungeonName, creatorName, startsAt, minLevel, maxLevel, tankSlots, healerSlots, dpsSlots, description };
};

const groupManagementAuthorized = async (
  request: Request, env: Env, groupId: string
): Promise<boolean> => {
  const token = request.headers.get("X-Group-Management-Token") ?? "";
  if (token.length < 32 || token.length > 200) return false;
  const row = await env.DB.prepare("SELECT management_token_hash FROM dungeon_groups WHERE id = ?")
    .bind(groupId).first<{ management_token_hash: string }>();
  if (!row) return false;
  return constantTimeEqual(await sha256Hex(token), row.management_token_hash);
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }


    if (pathname === "/debug/discord-config" && method === "GET") {
      return Response.json({
        hasBotToken: Boolean(env.DISCORD_BOT_TOKEN),
        reviewChannelLength: env.DISCORD_REVIEW_CHANNEL_ID?.length ?? 0,
        reviewChannelId: env.DISCORD_REVIEW_CHANNEL_ID || "(vacío)",
      });
    }

    // Discord slash-command interactions. Discord validates this endpoint with Ed25519 signatures.
    if (pathname === "/api/discord/interactions") {
      console.log("Diagnóstico de variables Discord", {
      hasBotToken: Boolean(env.DISCORD_BOT_TOKEN),
      reviewChannelLength: env.DISCORD_REVIEW_CHANNEL_ID?.length ?? 0,
      reviewChannelId: env.DISCORD_REVIEW_CHANNEL_ID || "(vacío)",
      });
      return handleDiscordInteractions(request, env, ctx);
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


    // Buscador público de grupos PvE. La lectura es pública; las acciones de gestión
    // requieren el token privado entregado al creador al publicar la actividad.
    if (pathname === "/api/dungeon-groups" && method === "GET") {
      try {
        const dungeon = url.searchParams.get("dungeon");
        const status = url.searchParams.get("status") || "recruiting";
        const allowedStatuses = ["recruiting", "full", "in_progress", "completed", "cancelled"];
        if (!allowedStatuses.includes(status)) return json({ error: "Estado no válido." }, 400);
        const result = await env.DB.prepare(
          `SELECT g.id, g.title, g.dungeon_name, g.creator_name, g.description,
                  g.min_level, g.max_level, g.starts_at, g.timezone,
                  g.tank_slots, g.healer_slots, g.dps_slots, g.status, g.created_at,
                  (SELECT COUNT(*) FROM dungeon_group_applications a
                   WHERE a.group_id = g.id AND a.status = 'accepted' AND a.role = 'tank') AS tanks_filled,
                  (SELECT COUNT(*) FROM dungeon_group_applications a
                   WHERE a.group_id = g.id AND a.status = 'accepted' AND a.role = 'healer') AS healers_filled,
                  (SELECT COUNT(*) FROM dungeon_group_applications a
                   WHERE a.group_id = g.id AND a.status = 'accepted' AND a.role = 'dps') AS dps_filled
           FROM dungeon_groups g
           WHERE g.status = ? AND g.expires_at > ?
             AND (? IS NULL OR g.dungeon_name = ?)
           ORDER BY g.starts_at ASC LIMIT 100`
        ).bind(status, new Date().toISOString(), dungeon, dungeon).all();
        return json(result.results);
      } catch {
        return json({ error: "No se pudieron consultar los grupos. Comprueba que se ha aplicado la migración 0004." }, 500);
      }
    }

    if (pathname === "/api/dungeon-groups" && method === "POST") {
      if (!isAllowedOrigin(request)) return json({ error: "Origen no permitido." }, 403);
      const body = await readJson(request);
      const data = body && validDungeonGroup(body);
      if (!data) return json({ error: "Los datos del grupo no son válidos." }, 400);
      const id = randomToken(12);
      const managementToken = randomToken(32);
      const tokenHash = await sha256Hex(managementToken);
      const expiresAt = new Date(Math.max(Date.parse(data.startsAt) + 24 * 60 * 60 * 1000, Date.now() + 2 * 60 * 60 * 1000)).toISOString();
      try {
        await env.DB.prepare(
          `INSERT INTO dungeon_groups
           (id, title, dungeon_name, creator_name, description, min_level, max_level,
            starts_at, timezone, tank_slots, healer_slots, dps_slots, status,
            management_token_hash, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Europe/Madrid', ?, ?, ?, 'recruiting', ?, ?)`
        ).bind(id, data.title, data.dungeonName, data.creatorName, data.description,
          data.minLevel, data.maxLevel, data.startsAt, data.tankSlots, data.healerSlots,
          data.dpsSlots, tokenHash, expiresAt).run();
        // El token se devuelve una sola vez; el cliente debe guardarlo de forma privada.
        return json({ success: true, group_id: id, management_token: managementToken,
          management_header: "X-Group-Management-Token" }, 201);
      } catch {
        return json({ error: "No se pudo crear el grupo. Comprueba que se ha aplicado la migración 0004." }, 500);
      }
    }

    const applicationCreateMatch = pathname.match(/^\/api\/dungeon-groups\/([A-Za-z0-9_-]+)\/applications$/);
    if (applicationCreateMatch && method === "POST") {
      if (!isAllowedOrigin(request)) return json({ error: "Origen no permitido." }, 403);
      const groupId = applicationCreateMatch[1];
      const body = await readJson(request);
      const characterName = body && cleanText(body.character_name, 2, 40);
      const className = body && cleanText(body.class_name, 2, 30);
      const note = body && (typeof body.note === "string" ? body.note.trim() : "");
      const contact = body && (typeof body.contact === "string" ? body.contact.trim() : "");
      const level = Number(body?.level);
      const role = body?.role;
      if (!characterName || !className || !Number.isInteger(level) || level < 1 || level > 60 ||
          !["tank", "healer", "dps"].includes(String(role)) ||
          typeof note !== "string" || note.length > 500 ||
          typeof contact !== "string" || contact.length > 120) {
        return json({ error: "Los datos de la solicitud no son válidos." }, 400);
      }
      try {
        const group = await env.DB.prepare(
          "SELECT min_level, max_level, status FROM dungeon_groups WHERE id = ? AND expires_at > ?"
        ).bind(groupId, new Date().toISOString()).first<{ min_level: number; max_level: number; status: string }>();
        if (!group) return json({ error: "Grupo no encontrado o caducado." }, 404);
        if (group.status !== "recruiting") return json({ error: "Este grupo ya no acepta solicitudes." }, 409);
        if (level < group.min_level || level > group.max_level) return json({ error: "El nivel no está dentro del rango del grupo." }, 400);
        const id = randomToken(12);
        await env.DB.prepare(
          `INSERT INTO dungeon_group_applications
           (id, group_id, character_name, class_name, level, role, note, contact)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, groupId, characterName, className, level, role, note, contact).run();
        return json({ success: true, application_id: id, status: "pending" }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("UNIQUE")) return json({ error: "Ese personaje ya ha solicitado plaza para este grupo." }, 409);
        return json({ error: "No se pudo enviar la solicitud." }, 500);
      }
    }

    const manageGroupMatch = pathname.match(/^\/api\/dungeon-groups\/([A-Za-z0-9_-]+)\/manage$/);
    if (manageGroupMatch && method === "GET") {
      const groupId = manageGroupMatch[1];
      if (!(await groupManagementAuthorized(request, env, groupId))) return json({ error: "Token de gestión no válido." }, 403);
      try {
        const [group, applications] = await Promise.all([
          env.DB.prepare("SELECT * FROM dungeon_groups WHERE id = ?").bind(groupId).first(),
          env.DB.prepare("SELECT id, character_name, class_name, level, role, note, contact, status, created_at FROM dungeon_group_applications WHERE group_id = ? ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END, created_at").bind(groupId).all()
        ]);
        if (!group) return json({ error: "Grupo no encontrado." }, 404);
        return json({ group, applications: applications.results });
      } catch {
        return json({ error: "No se pudo cargar la gestión del grupo." }, 500);
      }
    }

    const applicationDecisionMatch = pathname.match(/^\/api\/dungeon-groups\/([A-Za-z0-9_-]+)\/applications\/([A-Za-z0-9_-]+)\/(accept|reject)$/);
    if (applicationDecisionMatch && method === "POST") {
      if (!isAllowedOrigin(request)) return json({ error: "Origen no permitido." }, 403);
      const [, groupId, applicationId, action] = applicationDecisionMatch;
      if (!(await groupManagementAuthorized(request, env, groupId))) return json({ error: "Token de gestión no válido." }, 403);
      try {
        const targetStatus = action === "accept" ? "accepted" : "rejected";
        let result;
        if (action === "reject") {
          result = await env.DB.prepare(
            "UPDATE dungeon_group_applications SET status = 'rejected', updated_at = ? WHERE id = ? AND group_id = ? AND status = 'pending'"
          ).bind(new Date().toISOString(), applicationId, groupId).run();
        } else {
          // La condición de plazas disponibles se comprueba dentro del UPDATE para reducir
          // el riesgo de aceptar dos solicitudes concurrentes para la última plaza.
          result = await env.DB.prepare(
            `UPDATE dungeon_group_applications
             SET status = 'accepted', updated_at = ?
             WHERE id = ? AND group_id = ? AND status = 'pending'
               AND EXISTS (
                 SELECT 1 FROM dungeon_groups g
                 WHERE g.id = dungeon_group_applications.group_id
                   AND g.status = 'recruiting'
                   AND (SELECT COUNT(*) FROM dungeon_group_applications a
                        WHERE a.group_id = g.id AND a.status = 'accepted'
                          AND a.role = dungeon_group_applications.role)
                       < CASE dungeon_group_applications.role
                           WHEN 'tank' THEN g.tank_slots
                           WHEN 'healer' THEN g.healer_slots
                           ELSE g.dps_slots END
               )`
          ).bind(new Date().toISOString(), applicationId, groupId).run();
          if (!result.meta.changes) return json({ error: "No quedan plazas para ese rol, el grupo está cerrado o la solicitud ya se ha revisado." }, 409);
        }
        if (!result.meta.changes) return json({ error: "Solicitud no encontrada o ya revisada." }, 409);
        // Actualiza el estado a completo cuando todos los huecos configurados están ocupados.
        await env.DB.prepare(
          `UPDATE dungeon_groups AS g SET status = 'full', updated_at = ?
           WHERE g.id = ? AND g.status = 'recruiting'
             AND (SELECT COUNT(*) FROM dungeon_group_applications a WHERE a.group_id = g.id AND a.status = 'accepted')
                 >= g.tank_slots + g.healer_slots + g.dps_slots`
        ).bind(new Date().toISOString(), groupId).run();
        return json({ success: true, status: targetStatus });
      } catch {
        return json({ error: "No se pudo revisar la solicitud." }, 500);
      }
    }

    const groupStatusMatch = pathname.match(/^\/api\/dungeon-groups\/([A-Za-z0-9_-]+)\/status$/);
    if (groupStatusMatch && method === "POST") {
      if (!isAllowedOrigin(request)) return json({ error: "Origen no permitido." }, 403);
      const groupId = groupStatusMatch[1];
      if (!(await groupManagementAuthorized(request, env, groupId))) return json({ error: "Token de gestión no válido." }, 403);
      const body = await readJson(request);
      const status = body?.status;
      if (!["in_progress", "completed", "cancelled"].includes(String(status))) return json({ error: "Estado no válido." }, 400);
      const result = await env.DB.prepare(
        "UPDATE dungeon_groups SET status = ?, updated_at = ? WHERE id = ? AND status IN ('recruiting', 'full', 'in_progress')"
      ).bind(status, new Date().toISOString(), groupId).run();
      return result.meta.changes ? json({ success: true, status }) : json({ error: "No se pudo cambiar el estado del grupo." }, 409);
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

    // Discord OAuth start: redirect URI must match the Discord Developer Portal exactly.
    if (pathname === "/api/roster/discord/login" && method === "GET") {
      if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_GUILD_ID) return json({ error: "Discord no está configurado." }, 503);
      const state = encodeBase64Url(crypto.getRandomValues(new Uint8Array(24)));
      const callback = `${PUBLIC_SITE_ORIGIN}${DISCORD_CALLBACK_PATH}`;
      const authorize = new URL("https://discord.com/oauth2/authorize");
      authorize.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
      authorize.searchParams.set("redirect_uri", callback);
      authorize.searchParams.set("response_type", "code");
      authorize.searchParams.set("scope", "identify guilds");
      authorize.searchParams.set("state", state);
      const headers = new Headers({ "cache-control": "no-store", "location": authorize.toString() });
      headers.append("Set-Cookie", makeCookie(OAUTH_STATE_COOKIE, state, 600));
      return new Response(null, { status: 302, headers });
    }

    if (pathname === DISCORD_CALLBACK_PATH && method === "GET") {
      const state = url.searchParams.get("state");
      const savedState = cookieValue(request, OAUTH_STATE_COOKIE);
      const code = url.searchParams.get("code");
      const headers = new Headers({ "cache-control": "no-store" });
      headers.append("Set-Cookie", makeCookie(OAUTH_STATE_COOKIE, "", 0));
      if (!state || !savedState || !constantTimeEqual(state, savedState)) return redirectToSite(request, { discord: "state_error" });
      if (!code || !env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_GUILD_ID) return redirectToSite(request, { discord: "oauth_error" });
      try {
        const callback = `${PUBLIC_SITE_ORIGIN}${DISCORD_CALLBACK_PATH}`;
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: "authorization_code", code, redirect_uri: callback }),
        });
        if (!tokenResponse.ok) return redirectToSite(request, { discord: "oauth_error" });
        const tokenData = await tokenResponse.json() as { access_token?: string; token_type?: string };
        if (!tokenData.access_token) return redirectToSite(request, { discord: "oauth_error" });
        const headersAuth = { Authorization: `${tokenData.token_type ?? "Bearer"} ${tokenData.access_token}` };
        const [userResponse, guildsResponse] = await Promise.all([
          fetch("https://discord.com/api/users/@me", { headers: headersAuth }),
          fetch("https://discord.com/api/users/@me/guilds", { headers: headersAuth }),
        ]);
        if (!userResponse.ok || !guildsResponse.ok) return redirectToSite(request, { discord: "verify_error" });
        const user = await userResponse.json() as { id?: string; username?: string; global_name?: string };
        const guilds = await guildsResponse.json() as Array<{ id?: string }>;
        if (!user.id || !user.username) return redirectToSite(request, { discord: "verify_error" });
        if (!guilds.some((guild) => guild.id === env.DISCORD_GUILD_ID)) return redirectToSite(request, { discord: "not_member" });
        const session = await createMemberSession(user.id, user.global_name || user.username, env);
        headers.append("Set-Cookie", makeCookie(MEMBER_COOKIE, session, SESSION_DURATION));
        const target = new URL("/", PUBLIC_SITE_ORIGIN);
        target.searchParams.set("discord", "connected");
        headers.set("location", target.toString());
        return new Response(null, { status: 302, headers });
      } catch {
        return redirectToSite(request, { discord: "verify_error" });
      }
    }

    if (pathname === "/api/roster/me" && method === "GET") {
      const member = await readMemberSession(request, env);
      return member ? json({ authenticated: true, discord_username: member.username }) : json({ authenticated: false }, 401);
    }

    if (pathname === "/api/roster" && method === "GET") {
      try {
        const result = await env.DB.prepare("SELECT id, character_name, class_name, specialization, role, created_at, updated_at FROM roster_members ORDER BY class_name, character_name").all();
        return json(result.results);
      } catch { return json({ error: "No se pudo consultar la plantilla." }, 500); }
    }

    if (pathname === "/api/roster/requests" && method === "POST") {
      if (!isAllowedOrigin(request)) return json({ error: "Origen no permitido." }, 403);
      const member = await readMemberSession(request, env);
      if (!member) return json({ error: "Inicia sesión con Discord y verifica que perteneces al servidor." }, 401);
      const body = await readJson(request);
      if (!body || !validRosterFields(body)) return json({ error: "Los datos del personaje no son válidos." }, 400);
      try {
        const existing = await env.DB.prepare("SELECT id FROM roster_requests WHERE discord_id = ? AND status = 'pending' LIMIT 1").bind(member.discordId).first();
        if (existing) return json({ error: "Ya tienes una solicitud pendiente." }, 409);
        const result = await env.DB.prepare("INSERT INTO roster_requests (discord_id, discord_username, character_name, class_name, specialization, role, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')")
          .bind(member.discordId, member.username, body.character_name.trim(), body.class_name.trim(), body.specialization.trim(), body.role).run();
        return json({ success: true, id: result.meta.last_row_id, status: "pending" }, 201);
      } catch { return json({ error: "No se pudo guardar la solicitud." }, 500); }
    }

    if (pathname === "/api/admin/roster-requests" && method === "GET") {
      if (!(await isAuthenticated(request, env))) return json({ error: "Debes iniciar sesión." }, 401);
      try {
        const result = await env.DB.prepare("SELECT id, discord_id, discord_username, character_name, class_name, specialization, role, status, created_at, reviewed_at, reviewed_by FROM roster_requests ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 200").all();
        return json(result.results);
      } catch { return json({ error: "No se pudieron consultar las solicitudes." }, 500); }
    }

    const reviewMatch = pathname.match(/^\/api\/admin\/roster-requests\/(\d+)\/(approve|reject)$/);
    if (reviewMatch && method === "POST") {
      if (!isAllowedOrigin(request)) return json({ error: "Origen no permitido." }, 403);
      if (!(await isAuthenticated(request, env))) return json({ error: "Debes iniciar sesión." }, 401);
      const id = Number(reviewMatch[1]);
      const action = reviewMatch[2];
      if (!Number.isSafeInteger(id) || id <= 0) return json({ error: "Identificador no válido." }, 400);
      const body = await readJson(request);
      const reviewer = body && typeof body.reviewer === "string" && body.reviewer.trim() ? body.reviewer.trim().slice(0, 80) : "admin";
      try {
        const requestRow = await env.DB.prepare("SELECT id, discord_id, discord_username, character_name, class_name, specialization, role, status FROM roster_requests WHERE id = ?").bind(id).first<{
          id: number; discord_id: string; discord_username: string; character_name: string; class_name: string; specialization: string; role: string; status: string;
        }>();
        if (!requestRow) return json({ error: "Solicitud no encontrada." }, 404);
        if (requestRow.status !== "pending") return json({ error: "La solicitud ya ha sido revisada." }, 409);
        if (action === "approve") {
          // El INSERT solo puede ejecutarse mientras la solicitud siga pendiente.
          // D1 ejecuta batch de forma transaccional: solicitudes concurrentes no
          // pueden insertar dos miembros a partir de la misma solicitud.
          const results = await env.DB.batch([
            env.DB.prepare(
              "INSERT INTO roster_members (character_name, class_name, specialization, role) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM roster_requests WHERE id = ? AND status = 'pending')"
            ).bind(requestRow.character_name, requestRow.class_name, requestRow.specialization, requestRow.role, id),
            env.DB.prepare(
              "UPDATE roster_requests SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ? AND status = 'pending'"
            ).bind(reviewer, id),
          ]);

          if (!results[0]?.meta.changes) {
            return json({ error: "La solicitud ya ha sido revisada." }, 409);
          }

          return json({ success: true, status: "approved" });
        }

        const result = await env.DB.prepare(
          "UPDATE roster_requests SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ? AND status = 'pending'"
        ).bind(reviewer, id).run();

        if (!result.meta.changes) {
          return json({ error: "La solicitud ya ha sido revisada." }, 409);
        }

        return json({ success: true, status: "rejected" });
      } catch { return json({ error: "No se pudo revisar la solicitud." }, 500); }
    }

    if (pathname === "/api/events" && method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT id, title, event_type AS type, starts_at, description FROM events WHERE is_visible = 1 ORDER BY starts_at LIMIT 20"
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

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      syncRaidHelperEvents(env).catch((error: unknown) => {
        console.error(
          "Falló la sincronización de Raid-Helper:",
          error instanceof Error ? error.message : String(error)
        );
      })
    );
  },
};

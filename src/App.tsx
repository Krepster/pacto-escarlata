
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  Crown,
  ExternalLink,
  Menu,
  Shield,
  Swords,
  Users,
  X,
} from "lucide-react";

const API_BASE = "/api";

type EventItem = {
  id: number;
  title: string;
  type: string;
  starts_at: string;
  description: string | null;
};

function PublicSite() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const apiRoot = API_BASE.replace(/\/api$/, "");

      try {
        const response = await fetch(`${apiRoot}/health`);

        if (!response.ok) {
          throw new Error("La API no está disponible");
        }

        const healthData: {
          status?: string;
          database?: string;
        } = await response.json();

        if (!cancelled) {
          setApiOnline(
            healthData.status === "ok" &&
            healthData.database === "connected"
          );
        }
      } catch {
        if (!cancelled) {
          setApiOnline(false);
        }
      }

      try {
        const response = await fetch(`${API_BASE}/events`);

        if (!response.ok) {
          throw new Error("No se pudieron cargar los eventos");
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Formato de eventos no válido");
        }

        if (!cancelled) {
          setEvents(data as EventItem[]);
          setEventsError(false);
        }
      } catch {
        if (!cancelled) {
          setEventsError(true);
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const dateLabel = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date
      .toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      .toUpperCase();
  };

  return (
    <div className="site-shell">
      <div className="topline">
        <span className="topline-dot" /> HERMANDAD DE LA ALIANZA
        <span className="topline-divider">/</span> WOW FOREVER · PVE NORMAL
      </div>

      <header className="header">
        <a
          className="brand"
          href="#inicio"
          onClick={closeMenu}
          aria-label="Pacto Escarlata, inicio"
        >
          <span className="brand-mark">
            <Shield size={28} strokeWidth={1.6} />
            <span>✠</span>
          </span>

          <span className="brand-copy">
            <strong>
              PACTO <em>ESCARLATA</em>
            </strong>
            <small>UNIDOS POR AZEROTH</small>
          </span>
        </a>

        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? "nav nav-open" : "nav"}>
          <a href="#hermandad" onClick={closeMenu}>
            La hermandad
          </a>
          <a href="#actividades" onClick={closeMenu}>
            Actividades
          </a>
          <a href="#reclutamiento" onClick={closeMenu}>
            Reclutamiento
          </a>
          <a
            className="nav-cta"
            href="#reclutamiento"
            onClick={closeMenu}
          >
            Únete al pacto <ArrowRight size={15} />
          </a>
        </nav>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-backdrop" />

          <div className="hero-content">
            <div className="eyebrow">
              <span /> ALIANZA · WOW FOREVER <span />
            </div>

            <h1>
              La fuerza nace
              <br />
              de <em>nuestro pacto.</em>
            </h1>

            <p className="hero-lede">
              Una hermandad. Muchas leyendas. Un mismo estandarte.
            </p>

            <p className="hero-text">
              Aventuras PvE, desafíos PvP y una comunidad que siempre
              tiene un lugar para los suyos. Forjamos nuestra historia
              juntos, dentro y fuera de Azeroth.
            </p>

            <div className="hero-actions">
              <a className="button button-gold" href="#reclutamiento">
                Solicitar ingreso <ArrowRight size={17} />
              </a>
              <a className="button button-outline" href="#hermandad">
                Descubrir la hermandad
              </a>
            </div>

            <div className="hero-note">
              <Shield size={16} /> HONOR · LEALTAD · HERMANDAD
            </div>
          </div>

          <div className="hero-side-mark">
            <span>FOR THE ALLIANCE</span>
            <div className="side-line" />
            <Shield size={33} />
          </div>

          <div className="hero-bottom">
            <span>EST. IN AZEROTH</span>
            <span>01 — 03</span>
          </div>
        </section>

        <section className="intro section-wrap" id="hermandad">
          <div className="section-kicker">01 / QUIÉNES SOMOS</div>

          <div className="intro-grid">
            <div>
              <h2>
                Unidos por algo
                <br />
                <em>más grande.</em>
              </h2>
            </div>

            <div className="intro-copy">
              <p>
                Pacto Escarlata es una hermandad de la Alianza en WoW
                Forever, construida alrededor del compañerismo, el
                progreso y las ganas de disfrutar del juego en equipo.
              </p>
              <p>
                Ya vengas a conquistar mazmorras, organizarte para PvP
                o encontrar compañeros para tus aventuras, aquí tu
                historia también cuenta.
              </p>
            </div>
          </div>

          <div className="values-grid">
            <article className="value-card">
              <Swords />
              <span>01</span>
              <h3>Progresión</h3>
              <p>
                Avanzamos juntos, aprendiendo y mejorando en cada
                encuentro.
              </p>
            </article>

            <article className="value-card">
              <Shield />
              <span>02</span>
              <h3>Lealtad</h3>
              <p>
                Respeto, cooperación y apoyo entre todos los miembros.
              </p>
            </article>

            <article className="value-card">
              <Users />
              <span>03</span>
              <h3>Comunidad</h3>
              <p>
                Un lugar para compartir aventuras y crear nuevas
                amistades.
              </p>
            </article>
          </div>
        </section>

        <section className="events-section" id="actividades">
          <div className="section-wrap">
            <div className="section-kicker">02 / EN EL HORIZONTE</div>

            <div className="section-heading">
              <div>
                <h2>
                  Nuestras <em>actividades</em>
                </h2>
                <p>Siempre hay una nueva aventura por comenzar.</p>
              </div>

              <span className="heading-sigil">
                <CalendarDays size={28} />
              </span>
            </div>

            {eventsLoading ? (
              <p className="demo-note">
                Consultando las actividades de la hermandad...
              </p>
            ) : eventsError ? (
              <p className="demo-note">
                No se han podido cargar las actividades. Inténtalo de
                nuevo más tarde.
              </p>
            ) : events.length === 0 ? (
              <p className="demo-note">
                Todavía no hay actividades programadas. ¡Vuelve pronto!
              </p>
            ) : (
              <div className="events-grid">
                {events.map((event) => (
                  <article className="event-card" key={event.id}>
                    <div className="event-top">
                      <span>{event.type}</span>
                      <span>{dateLabel(event.starts_at)}</span>
                    </div>

                    <h3>{event.title}</h3>

                    <p>
                      {event.description || "Actividad de hermandad."}
                    </p>

                    <div className="event-foot">
                      <span>ACTIVIDAD DE HERMANDAD</span>
                      <CalendarDays size={16} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          className="join-section section-wrap"
          id="reclutamiento"
        >
          <div className="join-panel">
            <div className="join-ornament">
              <Crown size={35} />
            </div>

            <div className="section-kicker">
              03 / TU HISTORIA CONTINÚA AQUÍ
            </div>

            <h2>
              El pacto está abierto.
              <br />
              <em>¿Te unes?</em>
            </h2>

            <p>
              Buscamos aventureros con ganas de colaborar, compartir y
              construir una gran hermandad. Tu clase y tu experiencia
              no definen tu valor: lo hace tu actitud.
            </p>

            <a
              className="button button-gold"
              href="https://discord.com/"
              target="_blank"
              rel="noreferrer"
            >
              Contactar por Discord <ExternalLink size={16} />
            </a>

            <small>
              Enlace provisional: sustituir por la invitación oficial
              de la hermandad.
            </small>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#inicio">
          <span className="brand-mark">
            <Shield size={23} />
            <span>✠</span>
          </span>

          <span className="brand-copy">
            <strong>
              PACTO <em>ESCARLATA</em>
            </strong>
            <small>UNIDOS POR AZEROTH</small>
          </span>
        </a>

        <p>Por la Alianza. Por la hermandad. Por el pacto.</p>

        <div className="api-status">
          <span
            className={apiOnline ? "status-dot online" : "status-dot"}
          />
          API {apiOnline ? "conectada" : "en preparación"}
        </div>

        <small className="legal">
          Proyecto comunitario no oficial. World of Warcraft y sus
          marcas pertenecen a sus respectivos propietarios.
        </small>
      </footer>
    </div>
  );
}


type RosterRequest = {
  id: number;
  discord_username: string;
  character_name: string;
  class_name: string;
  specialization: string;
  role: string;
  status: string;
  created_at: string;
};

function AdminApp() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [requests, setRequests] = useState<RosterRequest[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("PvE");
  const [startsAt, setStartsAt] = useState("");
  const [description, setDescription] = useState("");

  const apiFetch = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "same-origin",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        data !== null && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : `Error HTTP ${response.status}`
      );
    }
    return data;
  };

  const loadAdminData = async () => {
    const [eventData, requestData] = await Promise.all([
      apiFetch("/events"),
      apiFetch("/admin/roster-requests"),
    ]);
    setEvents(Array.isArray(eventData) ? eventData : []);
    setRequests(Array.isArray(requestData) ? requestData : []);
  };

  useEffect(() => {
    let cancelled = false;
    apiFetch("/admin/session")
      .then((data) => {
        if (
          !cancelled &&
          data !== null &&
          typeof data === "object" &&
          "authenticated" in data &&
          data.authenticated === true
        ) {
          setAuthenticated(true);
          return loadAdminData();
        }
      })
      .catch(() => {
        // No hay una sesión activa; se muestra el formulario de acceso.
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar los datos del panel.");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setAuthenticated(true);
      setPassword("");
      await loadAdminData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await apiFetch("/admin/logout", { method: "POST", body: JSON.stringify({}) });
    } finally {
      setAuthenticated(false);
      setEvents([]);
      setRequests([]);
      setBusy(false);
    }
  };

  const createEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiFetch("/events", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          type,
          starts_at: new Date(startsAt).toISOString(),
          description: description.trim(),
        }),
      });
      setTitle("");
      setStartsAt("");
      setDescription("");
      await loadAdminData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el evento.");
    } finally {
      setBusy(false);
    }
  };

  const deleteEvent = async (id: number) => {
    if (!window.confirm("¿Seguro que quieres eliminar este evento?")) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/events/${id}`, { method: "DELETE" });
      await loadAdminData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el evento.");
    } finally {
      setBusy(false);
    }
  };

  const reviewRequest = async (id: number, action: "approve" | "reject") => {
    const promptName = window.prompt("Nombre que aparecerá como revisor:", username || "admin");
    if (promptName === null) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/admin/roster-requests/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reviewer: promptName }),
      });
      await loadAdminData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo revisar la solicitud.");
    } finally {
      setBusy(false);
    }
  };

  const panelStyle: CSSProperties = {
    minHeight: "100vh", background: "#11110f", color: "#f4efe5",
    padding: "clamp(20px, 4vw, 48px)", fontFamily: "inherit",
  };
  const cardStyle: CSSProperties = {
    background: "#1b1a17", border: "1px solid #49402d", borderRadius: 12,
    padding: 22, marginBottom: 20,
  };
  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "12px 13px",
    color: "#f4efe5", background: "#11110f", border: "1px solid #5b513b",
    borderRadius: 7, marginTop: 6,
  };
  const buttonStyle: CSSProperties = {
    padding: "10px 14px", borderRadius: 7, border: "1px solid #b59a5a",
    background: "#b59a5a", color: "#171510", cursor: "pointer", fontWeight: 700,
  };

  if (checking) {
    return <main style={panelStyle}><p>Comprobando la sesión de administrador…</p></main>;
  }

  if (!authenticated) {
    return (
      <main style={{ ...panelStyle, display: "grid", placeItems: "center" }}>
        <form onSubmit={login} style={{ ...cardStyle, width: "min(100%, 420px)", boxSizing: "border-box" }}>
          <p style={{ color: "#c5a968", letterSpacing: 2, fontSize: 12 }}>PACTO ESCARLATA / PRIVADO</p>
          <h1 style={{ marginTop: 8 }}>Administración</h1>
          <p style={{ color: "#b9b2a4" }}>Inicia sesión para gestionar actividades y solicitudes de ingreso.</p>
          <label>Usuario<input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} /></label>
          <label style={{ display: "block", marginTop: 16 }}>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} /></label>
          {error && <p role="alert" style={{ color: "#ff9a8c" }}>{error}</p>}
          <button disabled={busy} type="submit" style={{ ...buttonStyle, width: "100%", marginTop: 20 }}>{busy ? "Accediendo…" : "Entrar al panel"}</button>
          <a href="/" style={{ display: "inline-block", marginTop: 20, color: "#c5a968" }}>← Volver a la web</a>
        </form>
      </main>
    );
  }

  return (
    <main style={panelStyle}>
      <header style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: 28 }}>
        <div><p style={{ color: "#c5a968", letterSpacing: 2, fontSize: 12 }}>PACTO ESCARLATA</p><h1 style={{ margin: "6px 0" }}>Panel de administración</h1><p style={{ color: "#b9b2a4", margin: 0 }}>Eventos y solicitudes de la hermandad</p></div>
        <button onClick={logout} disabled={busy} style={buttonStyle}>Cerrar sesión</button>
      </header>
      {error && <p role="alert" style={{ ...cardStyle, color: "#ff9a8c" }}>{error}</p>}
      <section style={cardStyle}>
        <h2>Crear actividad</h2>
        <form onSubmit={createEvent} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          <label>Título<input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} /></label>
          <label>Tipo<select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}><option value="PvE">PvE</option><option value="PvP">PvP</option><option value="Social">Social</option></select></label>
          <label>Fecha y hora<input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={inputStyle} /></label>
          <label style={{ gridColumn: "1 / -1" }}>Descripción<textarea maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={inputStyle} /></label>
          <div><button disabled={busy} type="submit" style={buttonStyle}>+ Crear actividad</button></div>
        </form>
      </section>
      <section style={cardStyle}>
        <h2>Actividades existentes</h2>
        {events.length === 0 ? <p style={{ color: "#b9b2a4" }}>No hay actividades registradas.</p> : events.map((item) => (
          <article key={item.id} style={{ padding: "14px 0", borderBottom: "1px solid #39352c", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div><strong>{item.title}</strong><p style={{ color: "#b9b2a4", margin: "5px 0" }}>{item.type} · {new Date(item.starts_at).toLocaleString("es-ES")}</p>{item.description && <p>{item.description}</p>}</div>
            <button disabled={busy} onClick={() => void deleteEvent(item.id)} style={{ ...buttonStyle, background: "transparent", color: "#ff9a8c", borderColor: "#8d554e" }}>Eliminar</button>
          </article>
        ))}
      </section>
      <section style={cardStyle}>
        <h2>Solicitudes de ingreso</h2>
        {requests.length === 0 ? <p style={{ color: "#b9b2a4" }}>No hay solicitudes.</p> : requests.map((request) => (
          <article key={request.id} style={{ padding: "14px 0", borderBottom: "1px solid #39352c" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div><strong>{request.character_name}</strong> <span style={{ color: "#c5a968" }}>· {request.status}</span><p style={{ margin: "5px 0", color: "#b9b2a4" }}>{request.discord_username} · {request.class_name} · {request.specialization} · {request.role}</p></div>
              {request.status === "pending" && <div style={{ display: "flex", gap: 8, alignItems: "start" }}><button disabled={busy} onClick={() => void reviewRequest(request.id, "approve")} style={buttonStyle}>Aprobar</button><button disabled={busy} onClick={() => void reviewRequest(request.id, "reject")} style={{ ...buttonStyle, background: "transparent", color: "#ff9a8c", borderColor: "#8d554e" }}>Rechazar</button></div>}
            </div>
          </article>
        ))}
      </section>
      <a href="/" style={{ color: "#c5a968" }}>← Volver a la web pública</a>
    </main>
  );
}


export default function App() {
  return window.location.pathname.replace(/\/+$/, "") === "/admin" ? <AdminApp /> : <PublicSite />;
}

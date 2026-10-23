
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  Crown,
  ExternalLink,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  Menu,
  LayoutDashboard,
  BookOpen,
  Plug,
  Settings,
  LogOut,
  Shield,
  Swords,
  Users,
  X,
} from "lucide-react";

const API_BASE = "/api";
const DISCORD_INVITE_URL = "https://discord.gg/Q2HFsZgcYQ";

// Texturas originales de clase de la interfaz de WoW (no los iconos custom de SwagDog).
// Solo las nueve clases disponibles en Classic / Forever.
const CLASS_ICON_URLS: Record<string, string> = {
  druid: "https://warcraft.wiki.gg/wiki/Special:FilePath/Ui-charactercreate-classes_druid.png",
  hunter: "https://warcraft.wiki.gg/wiki/Special:FilePath/Ui-charactercreate-classes_hunter.png",
  mage: "https://warcraft.wiki.gg/wiki/Special:FilePath/Ui-charactercreate-classes_mage.png",
  paladin: "https://warcraft.wiki.gg/wiki/Special:FilePath/Ui-charactercreate-classes_paladin.png",
  priest: "https://warcraft.wiki.gg/wiki/Special:FilePath/Ui-charactercreate-classes_priest.png",
  rogue: "https://warcraft.wiki.gg/wiki/Special:FilePath/Ui-charactercreate-classes_rogue.png",
  shaman: "https://warcraft.wiki.gg/wiki/Special:FilePath/Ui-charactercreate-classes_shaman.png",
  warlock: "https://warcraft.wiki.gg/wiki/Special:FilePath/Ui-charactercreate-classes_warlock.png",
  warrior: "https://warcraft.wiki.gg/wiki/Special:FilePath/Ui-charactercreate-classes_warrior.png",
};

type GuildVideo =
  | {
      type: "local";
      title: string;
      subtitle: string;
      src: string;
      label: string;
    }
  | {
      type: "youtube";
      title: string;
      subtitle: string;
      videoId: string;
      label: string;
    };

const guildVideos: GuildVideo[] = [
  {
    type: "local",
    title: "Pacto Escarlata — Nuestra aventura",
    subtitle: "Nuestra historia en Azeroth comienza aquí.",
    src: "/media/pacto-escarlata-intro.mp4",
    label: "PACTO ESCARLATA · VÍDEO DESTACADO",
  },
  {
    type: "youtube",
    title: "World of Warcraft: Forever — Gameplay Trailer",
    subtitle: "El tráiler oficial de jugabilidad publicado por Blizzard.",
    videoId: "uQuKE0KDgiM",
    label: "TRÁILER OFICIAL · GAMEPLAY",
  },
  {
    type: "youtube",
    title: "World of Warcraft: Forever — Deep Dive",
    subtitle: "El equipo de desarrollo explica el mundo y los sistemas de Forever.",
    videoId: "nQPS_QSOYCU",
    label: "BLIZZCON 2026 · DEEP DIVE",
  },
];

type EventItem = {
  id: number;
  title: string;
  type: string;
  starts_at: string;
  description: string | null;
};

function normalizeRole(role: string): "dps" | "tank" | "heal" {
  const value = role.trim().toLowerCase();
  if (["tank", "tanque", "tanking"].includes(value)) return "tank";
  if (["heal", "healer", "sanador", "sanadora", "curas", "healing"].includes(value)) return "heal";
  return "dps";
}

function roleLabel(role: "dps" | "tank" | "heal"): string {
  return role === "tank" ? "TANK" : role === "heal" ? "HEAL" : "DPS";
}

function normalizeClass(className: string): string {
  const value = className.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const aliases: Record<string, string> = {
    "guerrero": "warrior", "warrior": "warrior",
    "paladin": "paladin", "paladín": "paladin",
    "cazador": "hunter", "hunter": "hunter",
    "picaro": "rogue", "rogue": "rogue",
    "sacerdote": "priest", "priest": "priest",
    "chaman": "shaman", "shaman": "shaman",
    "mago": "mage", "mage": "mage",
    "brujo": "warlock", "warlock": "warlock",
    "druida": "druid", "druid": "druid",
  };
  return aliases[value] ?? value.replace(/[^a-z]/g, "");
}

function PublicSite() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [roster, setRoster] = useState<Array<{ id: number; character_name: string; class_name: string; specialization?: string; role: string }>>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState(false);

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

    fetch(`${API_BASE}/roster`)
      .then((response) => {
        if (!response.ok) throw new Error("Roster no disponible");
        return response.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error("Formato de roster no válido");
        if (!cancelled) {
          setRoster(data as Array<{ id: number; character_name: string; class_name: string; specialization?: string; role: string }>);
          setRosterError(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setRoster([]); setRosterError(true); }
      })
      .finally(() => { if (!cancelled) setRosterLoading(false); });

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
          <a href="#inicio" onClick={closeMenu}>
            Inicio
          </a>
          <a href="#actividades" onClick={closeMenu}>
            Eventos
          </a>
          <a href="#plantilla" onClick={closeMenu}>
            Miembros
          </a>
          <a
            className="nav-cta"
            href={DISCORD_INVITE_URL}
            target={DISCORD_INVITE_URL.startsWith("https://") ? "_blank" : undefined}
            rel="noreferrer"
            onClick={closeMenu}
          >
            Únete al pacto <ArrowRight size={15} />
          </a>
        </nav>
      </header>

      <main>
        <section className="hero hero-video" id="inicio">
          <div className="hero-backdrop" />
          <div className="hero-video-inner">
            <div className="section-kicker">PACTO ESCARLATA PRESENTA</div>
            <div className="section-heading guild-gallery-heading">
              <div>
                <h1>World of Warcraft: <em>Forever</em></h1>
                <p>Vídeos oficiales de Blizzard. La aventura comienza aquí.</p>
              </div>
              <div className="gallery-controls">
                <button type="button" aria-label="Vídeo anterior" onClick={() => setVideoIndex((videoIndex + guildVideos.length - 1) % guildVideos.length)}><ChevronLeft size={20} /></button>
                <span>{String(videoIndex + 1).padStart(2, "0")} / {String(guildVideos.length).padStart(2, "0")}</span>
                <button type="button" aria-label="Vídeo siguiente" onClick={() => setVideoIndex((videoIndex + 1) % guildVideos.length)}><ChevronRight size={20} /></button>
              </div>
            </div>
            <div className="guild-video-carousel" aria-live="polite">
              <div className="guild-video-frame">
                {guildVideos[videoIndex].type === "local" ? (
                  <video
                    key={guildVideos[videoIndex].src}
                    src={guildVideos[videoIndex].src}
                    title={guildVideos[videoIndex].title}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <iframe
                    key={guildVideos[videoIndex].videoId}
                    src={`https://www.youtube-nocookie.com/embed/${guildVideos[videoIndex].videoId}`}
                    title={guildVideos[videoIndex].title}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>
              <div className="guild-video-caption">
                <span>{guildVideos[videoIndex].label}</span>
                <h3>{guildVideos[videoIndex].title}</h3>
                <p>{guildVideos[videoIndex].subtitle}</p>
                {guildVideos[videoIndex].type === "youtube" && (
                  <a href={`https://www.youtube.com/watch?v=${guildVideos[videoIndex].videoId}`} target="_blank" rel="noreferrer">
                    Ver en YouTube <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <div className="gallery-dots">
                {guildVideos.map((video, index) => (
                  <button
                    key={video.type === "local" ? video.src : video.videoId}
                    type="button"
                    aria-label={`Mostrar vídeo ${index + 1}: ${video.title}`}
                    aria-current={index === videoIndex ? "true" : undefined}
                    onClick={() => setVideoIndex(index)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="hero-bottom"><span>EST. IN AZEROTH</span><span>01 — {String(guildVideos.length).padStart(2, "0")}</span></div>
        </section>

        <section className="events-section" id="actividades">
          <div className="section-wrap">
            <div className="section-kicker">01 / PRÓXIMOS EVENTOS</div>

            <div className="section-heading">
              <div>
                <h2>
                  Próximos <em>eventos</em>
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

        <section className="roster-section section-wrap" id="plantilla">
          <div className="section-kicker">02 / MIEMBROS DEL PACTO</div>
          <div className="section-heading">
            <div>
              <h2>Nuestros <em>miembros</em></h2>
              <p>Personajes que forman parte de la hermandad.</p>
            </div>
            <span className="heading-sigil"><Users size={28} /></span>
          </div>
          {rosterLoading ? (
            <p className="demo-note">Cargando la plantilla...</p>
          ) : rosterError ? (
            <p className="demo-note">La plantilla se mostrará aquí cuando esté configurada la conexión con el roster.</p>
          ) : roster.length === 0 ? (
            <p className="demo-note">Todavía no hay personajes en la plantilla. El registro se conectará al bot de Discord.</p>
          ) : (
            <div className="roster-table-wrap">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th scope="col">Personaje</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Clase</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((character) => {
                    const roleKey = normalizeRole(character.role);
                    const classKey = normalizeClass(character.class_name);
                    const RoleIcon = roleKey === "tank" ? Shield : roleKey === "heal" ? HeartPulse : Swords;
                    return (
                      <tr key={character.id}>
                        <td className="roster-character-name">{character.character_name}</td>
                        <td>
                          <span className={`roster-role roster-role-${roleKey}`}>
                            <RoleIcon size={16} aria-hidden="true" />
                            <span>{roleLabel(roleKey)}</span>
                          </span>
                        </td>
                        <td>
                          <span className="roster-class-cell">
                            <img
                              className="roster-class-icon"
                              src={CLASS_ICON_URLS[classKey] ?? ""}
                              alt=""
                              loading="lazy"
                              onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
                            />
                            <span>{character.class_name}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="join-section section-wrap" id="unete">
          <div className="join-panel">
            <div className="join-ornament"><Crown size={35} /></div>
            <div className="section-kicker">03 / TU HISTORIA CONTINÚA AQUÍ</div>
            <h2>El pacto está abierto.<br /><em>¿Te unes?</em></h2>
            <p>Entra en nuestro Discord para conocer a la hermandad, hablar con nosotros y dar el primer paso hacia nuevas aventuras.</p>
            <a className="button button-gold" href={DISCORD_INVITE_URL} target={DISCORD_INVITE_URL.startsWith("https://") ? "_blank" : undefined} rel="noreferrer">
              Únete al pacto <ExternalLink size={16} />
            </a>

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


type AdminMember = {
  id: number;
  character_name: string;
  class_name: string;
  specialization?: string;
  role: string;
};

type AdminSection = "dashboard" | "events" | "members" | "content" | "integrations" | "settings";

function AdminApp() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  // El roster público contiene los personajes admitidos. Las decisiones de admisión
  // siguen gestionándose en Discord; el panel no aprueba ni rechaza solicitudes.
  const loadAdminData = async () => {
    const [eventData, rosterData] = await Promise.all([
      apiFetch("/events"),
      apiFetch("/roster"),
    ]);
    setEvents(Array.isArray(eventData) ? eventData : []);
    setMembers(Array.isArray(rosterData) ? rosterData : []);
  };

  useEffect(() => {
    let cancelled = false;
    apiFetch("/admin/session")
      .then((data) => {
        if (
          !cancelled && data !== null && typeof data === "object" &&
          "authenticated" in data && data.authenticated === true
        ) {
          setAuthenticated(true);
          return loadAdminData();
        }
      })
      .catch(() => {
        // Sin sesión activa, se muestra el formulario de acceso.
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar la sesión.");
    } finally {
      setAuthenticated(false);
      setEvents([]);
      setMembers([]);
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

  const panelStyle: CSSProperties = {
    minHeight: "100vh", background: "#11110f", color: "#f4efe5", fontFamily: "inherit",
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
  const mutedText: CSSProperties = { color: "#b9b2a4" };

  const navItems: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "events", label: "Eventos", icon: CalendarDays },
    { id: "members", label: "Miembros", icon: Users },
    { id: "content", label: "Contenido", icon: BookOpen },
    { id: "integrations", label: "Integraciones", icon: Plug },
    { id: "settings", label: "Configuración", icon: Settings },
  ];
  const sectionTitles: Record<AdminSection, { title: string; subtitle: string }> = {
    dashboard: { title: "Dashboard", subtitle: "Resumen general de la hermandad." },
    events: { title: "Eventos", subtitle: "Gestiona las actividades de Pacto Escarlata." },
    members: { title: "Miembros", subtitle: "Personajes admitidos que aparecen en el roster." },
    content: { title: "Contenido", subtitle: "Espacio reservado para futuras guías y noticias." },
    integrations: { title: "Integraciones", subtitle: "Servicios conectados al proyecto." },
    settings: { title: "Configuración", subtitle: "Ajustes generales del panel de administración." },
  };

  if (checking) {
    return <main style={{ ...panelStyle, padding: 32 }}><p>Comprobando la sesión de administrador…</p></main>;
  }

  if (!authenticated) {
    return (
      <main style={{ ...panelStyle, display: "grid", placeItems: "center", padding: 20 }}>
        <form onSubmit={login} style={{ ...cardStyle, width: "min(100%, 420px)", boxSizing: "border-box" }}>
          <p style={{ color: "#c5a968", letterSpacing: 2, fontSize: 12 }}>PACTO ESCARLATA / PRIVADO</p>
          <h1 style={{ marginTop: 8 }}>Administración</h1>
          <p style={mutedText}>Inicia sesión para gestionar las actividades y consultar la plantilla.</p>
          <label>Usuario<input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} /></label>
          <label style={{ display: "block", marginTop: 16 }}>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} /></label>
          {error && <p role="alert" style={{ color: "#ff9a8c" }}>{error}</p>}
          <button disabled={busy} type="submit" style={{ ...buttonStyle, width: "100%", marginTop: 20 }}>{busy ? "Accediendo…" : "Entrar al panel"}</button>
          <a href="/" style={{ display: "inline-block", marginTop: 20, color: "#c5a968" }}>← Volver a la web</a>
        </form>
      </main>
    );
  }

  const renderEvents = () => (
    <>
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Crear actividad</h2>
        <form onSubmit={createEvent} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 14 }}>
          <label>Título<input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} /></label>
          <label>Tipo<select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}><option value="PvE">PvE</option><option value="PvP">PvP</option><option value="Social">Social</option></select></label>
          <label>Fecha y hora<input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={inputStyle} /></label>
          <label style={{ gridColumn: "1 / -1" }}>Descripción<textarea maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={inputStyle} /></label>
          <div><button disabled={busy} type="submit" style={buttonStyle}>+ Crear actividad</button></div>
        </form>
      </section>
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Actividades existentes <span style={{ color: "#c5a968", fontSize: 14 }}>({events.length})</span></h2>
        {events.length === 0 ? <p style={mutedText}>No hay actividades registradas.</p> : events.map((item) => (
          <article key={item.id} style={{ padding: "14px 0", borderBottom: "1px solid #39352c", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: 1 }}><strong>{item.title}</strong><p style={{ ...mutedText, margin: "5px 0" }}>{item.type} · {new Date(item.starts_at).toLocaleString("es-ES")}</p>{item.description && <p>{item.description}</p>}</div>
            <button disabled={busy} onClick={() => void deleteEvent(item.id)} style={{ ...buttonStyle, alignSelf: "center", background: "transparent", color: "#ff9a8c", borderColor: "#8d554e" }}>Eliminar</button>
          </article>
        ))}
      </section>
    </>
  );

  const renderMembers = () => (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ marginTop: 0 }}>Plantilla admitida</h2>
        <span style={{ color: "#c5a968" }}>{members.length} personajes</span>
      </div>
      <p style={mutedText}>La aprobación y el rechazo de solicitudes se gestionan exclusivamente desde Discord. Aquí solo se muestran los personajes que devuelve el roster aprobado.</p>
      {members.length === 0 ? <p style={mutedText}>Todavía no hay personajes aprobados en la plantilla.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
            <thead><tr>{["Personaje", "Clase", "Especialización", "Rol"].map((label) => <th key={label} style={{ textAlign: "left", padding: "12px 10px", color: "#c5a968", borderBottom: "1px solid #49402d" }}>{label}</th>)}</tr></thead>
            <tbody>{members.map((member) => <tr key={member.id}>
              <td style={{ padding: 10, borderBottom: "1px solid #39352c", fontWeight: 700 }}>{member.character_name}</td>
              <td style={{ padding: 10, borderBottom: "1px solid #39352c" }}>{member.class_name}</td>
              <td style={{ padding: 10, borderBottom: "1px solid #39352c", ...mutedText }}>{member.specialization || "—"}</td>
              <td style={{ padding: 10, borderBottom: "1px solid #39352c" }}>{member.role}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderPlaceholder = (section: "content" | "integrations" | "settings") => {
    const details = {
      content: { icon: BookOpen, title: "Gestión de contenido", body: "Aquí prepararemos la gestión de guías, noticias y recursos de la hermandad en una siguiente fase." },
      integrations: { icon: Plug, title: "Servicios conectados", body: "La sincronización de eventos con Raid-Helper continúa funcionando en el Worker. En esta sección añadiremos una vista de estado cuando dispongamos de un endpoint de diagnóstico fiable." },
      settings: { icon: Settings, title: "Ajustes del panel", body: "Esta sección queda preparada para futuras opciones de administración. No hay ajustes adicionales configurados todavía." },
    }[section];
    const PlaceholderIcon = details.icon;
    return <section style={{ ...cardStyle, minHeight: 180 }}>
      <PlaceholderIcon size={30} color="#c5a968" />
      <h2>{details.title}</h2>
      <p style={mutedText}>{details.body}</p>
      <span style={{ display: "inline-flex", padding: "6px 10px", border: "1px solid #5b513b", borderRadius: 20, color: "#c5a968", fontSize: 12 }}>Preparado para una próxima fase</span>
    </section>;
  };

  const renderDashboard = () => (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Eventos registrados", value: events.length, icon: CalendarDays, target: "events" as AdminSection },
          { label: "Personajes admitidos", value: members.length, icon: Users, target: "members" as AdminSection },
        ].map((metric) => {
          const MetricIcon = metric.icon;
          return <button key={metric.label} type="button" onClick={() => setActiveSection(metric.target)} style={{ ...cardStyle, marginBottom: 0, textAlign: "left", cursor: "pointer", color: "inherit" }}>
            <MetricIcon size={24} color="#c5a968" />
            <p style={{ ...mutedText, marginBottom: 6 }}>{metric.label}</p>
            <strong style={{ fontSize: 30 }}>{metric.value}</strong>
            <p style={{ color: "#c5a968", marginBottom: 0, fontSize: 13 }}>Ver sección →</p>
          </button>;
        })}
      </div>
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Accesos rápidos</h2>
        <p style={mutedText}>Selecciona una sección desde el menú lateral o utiliza estos accesos.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button type="button" onClick={() => setActiveSection("events")} style={buttonStyle}> <CalendarDays size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Gestionar eventos</button>
          <button type="button" onClick={() => setActiveSection("members")} style={{ ...buttonStyle, background: "transparent", color: "#f4efe5" }}><Users size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Ver miembros</button>
        </div>
      </section>
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Próximos eventos</h2>
        {events.length === 0 ? <p style={mutedText}>No hay actividades registradas.</p> : [...events].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).slice(0, 4).map((item) => (
          <article key={item.id} style={{ padding: "12px 0", borderBottom: "1px solid #39352c" }}>
            <strong>{item.title}</strong><p style={{ ...mutedText, margin: "5px 0 0" }}>{item.type} · {new Date(item.starts_at).toLocaleString("es-ES")}</p>
          </article>
        ))}
      </section>
    </>
  );

  const section = sectionTitles[activeSection];

  return (
    <main style={panelStyle}>
      <style>{`
        .admin-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); min-height: 100vh; }
        .admin-sidebar { background: #171512; border-right: 1px solid #39352c; padding: 24px 16px; display: flex; flex-direction: column; gap: 24px; }
        .admin-nav-button { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; border: 1px solid transparent; border-radius: 8px; padding: 12px; background: transparent; color: #c8c0b2; cursor: pointer; font: inherit; }
        .admin-nav-button:hover { background: #252119; color: #f4efe5; }
        .admin-nav-button[aria-current="page"] { background: #3a2529; border-color: #67414a; color: #f4efe5; }
        .admin-content { min-width: 0; padding: clamp(18px, 3vw, 40px); }
        @media (max-width: 760px) {
          .admin-layout { grid-template-columns: minmax(0, 1fr); }
          .admin-sidebar { border-right: 0; border-bottom: 1px solid #39352c; padding: 16px; gap: 14px; }
          .admin-mobile-toggle { display: inline-flex !important; align-items: center; justify-content: center; }
          .admin-sidebar-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
          .admin-nav-list { display: none; flex-direction: row !important; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
          .admin-nav-button { width: auto; flex: 0 0 auto; white-space: nowrap; padding: 10px; }
          .admin-sidebar-footer { display: flex !important; flex-direction: row !important; align-items: center; justify-content: space-between; }
          .admin-content { padding: 18px 14px; }
        }
      `}</style>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-top">
            <a href="/" style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "grid", placeItems: "center", width: 42, height: 42, border: "1px solid #8d7545", borderRadius: 10, color: "#c5a968" }}><Shield size={25} /></span>
              <span><strong style={{ display: "block", letterSpacing: 1 }}>PACTO</strong><strong style={{ display: "block", color: "#c5a968", letterSpacing: 1 }}>ESCARLATA</strong><small style={{ color: "#918879" }}>Administración</small></span>
            </a>
            <button type="button" className="admin-mobile-toggle" aria-label={mobileNavOpen ? "Ocultar navegación" : "Mostrar navegación"} onClick={() => setMobileNavOpen(!mobileNavOpen)} style={{ display: "none", ...buttonStyle, padding: 9, background: "transparent", color: "#f4efe5" }}><Menu size={19} /></button>
          </div>
          <nav className="admin-nav-list" aria-label="Navegación de administración" style={{ display: mobileNavOpen ? "flex" : undefined, flexDirection: "column", gap: 5 }}>
            {navItems.map((item) => {
              const ItemIcon = item.icon;
              return <button key={item.id} type="button" className="admin-nav-button" aria-current={activeSection === item.id ? "page" : undefined} onClick={() => { setActiveSection(item.id); setMobileNavOpen(false); setError(""); }}>
                <ItemIcon size={19} /><span>{item.label}</span>{activeSection === item.id && <span style={{ marginLeft: "auto", color: "#c5a968" }}>•</span>}
              </button>;
            })}
          </nav>
          <div className="admin-sidebar-footer" style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid #39352c", paddingTop: 18 }}>
            <span style={{ color: "#918879", fontSize: 12 }}>Sesión: {username || "Administrador"}</span>
            <button type="button" onClick={() => void logout()} disabled={busy} className="admin-nav-button"><LogOut size={18} />Cerrar sesión</button>
            <a href="/" style={{ color: "#c5a968", fontSize: 13, textDecoration: "none" }}>← Volver a la web pública</a>
          </div>
        </aside>

        <div className="admin-content">
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 26 }}>
            <div><p style={{ color: "#c5a968", letterSpacing: 2, fontSize: 11, margin: "0 0 8px" }}>PACTO ESCARLATA / ADMINISTRACIÓN</p><h1 style={{ margin: "0 0 8px", fontSize: "clamp(26px, 3vw, 36px)" }}>{section.title}</h1><p style={{ ...mutedText, margin: 0 }}>{section.subtitle}</p></div>
            <span style={{ border: "1px solid #49402d", borderRadius: 30, padding: "8px 12px", color: "#c5a968", fontSize: 12 }}>PANEL PRIVADO</span>
          </header>
          {error && <div role="alert" style={{ ...cardStyle, color: "#ff9a8c", borderColor: "#8d554e" }}>{error}</div>}
          {activeSection === "dashboard" && renderDashboard()}
          {activeSection === "events" && renderEvents()}
          {activeSection === "members" && renderMembers()}
          {(activeSection === "content" || activeSection === "integrations" || activeSection === "settings") && renderPlaceholder(activeSection)}
          <footer style={{ color: "#81796d", fontSize: 12, borderTop: "1px solid #39352c", paddingTop: 16, marginTop: 28 }}>
            Pacto Escarlata · Panel de administración · La gestión de admisiones se realiza desde Discord.
          </footer>
        </div>
      </div>
    </main>
  );
}


export default function App() {
  return window.location.pathname.replace(/\/+$/, "") === "/admin" ? <AdminApp /> : <PublicSite />;
}

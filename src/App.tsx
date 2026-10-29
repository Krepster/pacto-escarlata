
import { useEffect, useState } from "react";
import TalentCalculator from "./TalentCalculator";
import DungeonGroupsPage from "./DungeonGroupsPage";
import type { CSSProperties, FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  Crown,
  ExternalLink,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FlaskConical,
  Menu,
  LayoutDashboard,
  BookOpen,
  BrainCircuit,
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
  const [rosterRoleFilter, setRosterRoleFilter] = useState("all");
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterSortBy, setRosterSortBy] = useState<"character_name" | "class_name" | "specialization" | "role">("character_name");
  const [rosterSortDirection, setRosterSortDirection] = useState<"asc" | "desc">("asc");

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

  const visibleRoster = roster
    .filter((character) => rosterRoleFilter === "all" || normalizeRole(character.role) === rosterRoleFilter)
    .filter((character) => {
      const query = rosterSearch.trim().toLocaleLowerCase("es");
      if (!query) return true;
      return [character.character_name, character.class_name, character.specialization ?? "", roleLabel(normalizeRole(character.role))]
        .some((value) => value.toLocaleLowerCase("es").includes(query));
    })
    .sort((a, b) => {
      const left = String(a[rosterSortBy] ?? "").toLocaleLowerCase("es");
      const right = String(b[rosterSortBy] ?? "").toLocaleLowerCase("es");
      const comparison = left.localeCompare(right, "es", { sensitivity: "base", numeric: true });
      return rosterSortDirection === "asc" ? comparison : -comparison;
    });

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
            <img src="/media/pacto_fav.png" alt="Pacto Escarlata" className="brand-logo" />
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
          <a href="/grupos" onClick={closeMenu}>
            Buscar grupo
          </a>
          <a href="#plantilla" onClick={closeMenu}>
            Miembros
          </a>
          <div className="nav-dropdown">
            <a
              className="nav-dropdown-trigger"
              href="/profesiones"
              aria-haspopup="true"
              onClick={closeMenu}
            >
              Profesiones <ChevronDown size={13} />
            </a>
            <div className="nav-dropdown-menu">
              <a href="/profesiones">Todas las profesiones</a>
              {professionList.map((profession) => <a href={`/profesiones/${profession.slug}`} key={profession.slug}>{profession.name}</a>)}
            </div>
          </div>
          <a href="/talentos" onClick={closeMenu}>Talentos</a>
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
            <>
              <div className="roster-toolbar" aria-label="Filtros de miembros">
                <label className="roster-control roster-search-control">
                  <span>Buscar</span>
                  <input
                    type="search"
                    value={rosterSearch}
                    onChange={(event) => setRosterSearch(event.target.value)}
                    placeholder="Personaje, clase o especialización…"
                    aria-label="Buscar por personaje, clase o especialización"
                  />
                </label>
                <label className="roster-control">
                  <span>Filtrar por rol</span>
                  <select value={rosterRoleFilter} onChange={(event) => setRosterRoleFilter(event.target.value)}>
                    <option value="all">Todos los roles</option>
                    <option value="tank">Tanque</option>
                    <option value="heal">Sanador</option>
                    <option value="dps">DPS</option>
                  </select>
                </label>
                <label className="roster-control">
                  <span>Ordenar por</span>
                  <select value={rosterSortBy} onChange={(event) => setRosterSortBy(event.target.value as typeof rosterSortBy)}>
                    <option value="character_name">Personaje</option>
                    <option value="role">Rol</option>
                    <option value="class_name">Clase</option>
                    <option value="specialization">Especialización</option>
                  </select>
                </label>
                <button
                  className="roster-sort-direction"
                  type="button"
                  onClick={() => setRosterSortDirection((direction) => direction === "asc" ? "desc" : "asc")}
                  aria-label={rosterSortDirection === "asc" ? "Orden ascendente; cambiar a descendente" : "Orden descendente; cambiar a ascendente"}
                >
                  {rosterSortDirection === "asc" ? "A–Z ↑" : "Z–A ↓"}
                </button>
              </div>
              <p className="roster-results-count" aria-live="polite">
                {visibleRoster.length} {visibleRoster.length === 1 ? "personaje" : "personajes"}
                {rosterRoleFilter !== "all" ? ` · ${rosterRoleFilter === "tank" ? "Tanques" : rosterRoleFilter === "heal" ? "Sanadores" : "DPS"}` : " en la plantilla"}
              </p>
              {visibleRoster.length === 0 ? (
                <p className="demo-note">No hay miembros que coincidan con esos filtros.</p>
              ) : (
                <div className="roster-table-wrap">
                  <table className="roster-table">
                    <thead>
                      <tr>
                        <th scope="col">Personaje</th>
                        <th scope="col">Rol</th>
                        <th scope="col">Clase</th>
                        <th scope="col">Especialización</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRoster.map((character) => {
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
                            <td className="roster-specialization">{character.specialization?.trim() || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
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
        <p
            style={{
              gridColumn: "1 / -1",
              width: "100%",
              margin: 0,
              textAlign: "center",
              color: "#b9afb2",
              fontSize: "11px",
              lineHeight: 1.6,
            }}
          >
            Por la Alianza. Por la hermandad. Por el pacto.
        </p>
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


type ProfessionInfo = {
  name: string; slug: string; description: string; kind: string; icon: typeof FlaskConical;
  sourceSlug: string; hasCraftingRoute: boolean; summary: string; newExamples: string[];
};

const professionList: ProfessionInfo[] = [
  { name: "Alquimia", slug: "alquimia", description: "Pociones, elixires y frascos.", kind: "Fabricación", icon: FlaskConical, sourceSlug: "alchemy", hasCraftingRoute: true, summary: "Convierte hierbas y otros componentes en pociones, elixires y frascos. La guía de subida de Forever calcula recetas y materiales según los precios disponibles.", newExamples: ["Flask of Natural Accuracy", "Flask of Natural Aggression", "Flask of Natural Precision"] },
  { name: "Herrería", slug: "herreria", description: "Armas, armaduras y piezas de metal.", kind: "Fabricación", icon: Settings, sourceSlug: "blacksmithing", hasCraftingRoute: true, summary: "Trabaja menas y barras para fabricar armas, armaduras y componentes. Comprueba las recetas de Forever antes de comprar grandes cantidades de mineral.", newExamples: ["Breastplate of Salvation", "Champion's Legplates", "Gauntlets of Glory"] },
  { name: "Encantamiento", slug: "encantamiento", description: "Mejoras mágicas para el equipo.", kind: "Fabricación", icon: Crown, sourceSlug: "enchanting", hasCraftingRoute: true, summary: "Desencanta equipo para obtener polvos, esencias y fragmentos; después utilízalos para mejorar objetos. El coste depende mucho de los materiales disponibles.", newExamples: ["Idol of Swiftness", "Idol of the Ursine Twins", "Libram of Infusion"] },
  { name: "Ingeniería", slug: "ingenieria", description: "Dispositivos, explosivos y armas de fuego.", kind: "Fabricación", icon: Plug, sourceSlug: "engineering", hasCraftingRoute: true, summary: "Combina metales, piedras y componentes para fabricar artilugios. Revisa los requisitos de cada receta y conserva los componentes reutilizables.", newExamples: ["Swiftfeather Arrow", "Swiftstrike Shot", "Hyper Deluxe Sniper Rifle Mk XVII"] },
  { name: "Herboristería", slug: "herboristeria", description: "Recolecta hierbas por las zonas de Azeroth.", kind: "Recolección", icon: HeartPulse, sourceSlug: "herbalism", hasCraftingRoute: false, summary: "Sube la habilidad recolectando plantas de nivel progresivo. La ruta depende de las zonas, la disponibilidad de nodos y el nivel de habilidad requerido.", newExamples: ["Incense Candle", "Greenhouse", "Seed Hybridizer"] },
  { name: "Peletería", slug: "peleteria", description: "Cuero, escamas y armaduras.", kind: "Fabricación", icon: Shield, sourceSlug: "leatherworking", hasCraftingRoute: true, summary: "Transforma cuero y escamas obtenidos mediante desuello en armaduras y otros objetos. La lista de compra depende de la ruta de recetas elegida.", newExamples: ["Black Dragonscale Helm", "Blue Dragonscale Helm", "Dawn Armor"] },
  { name: "Minería", slug: "mineria", description: "Extrae menas, piedras y minerales.", kind: "Recolección", icon: Swords, sourceSlug: "mining", hasCraftingRoute: false, summary: "Busca filones adecuados a tu habilidad y funde las menas cuando resulte útil. La guía debe consultarse por niveles de nodo y zonas, no como una lista de fabricación.", newExamples: ["Heavy Thorium Bar", "Azerothium Bar", "Lodestone"] },
  { name: "Desuello", slug: "desuello", description: "Obtén cuero y pieles de las bestias.", kind: "Recolección", icon: Users, sourceSlug: "skinning", hasCraftingRoute: false, summary: "Desuella bestias cuyo nivel sea compatible con tu habilidad. La progresión se basa en los animales y las zonas disponibles, no en recetas de fabricación.", newExamples: ["Trapper's Workbench", "Camp Chair", "Field Guide"] },
  { name: "Sastrería", slug: "sastreria", description: "Prendas de tela, bolsas y equipo.", kind: "Fabricación", icon: BookOpen, sourceSlug: "tailoring", hasCraftingRoute: true, summary: "Utiliza telas obtenidas de enemigos humanoides para confeccionar equipo y bolsas. Planifica la tela y los componentes secundarios antes de empezar cada tramo.", newExamples: ["Boots of Conviction", "Demonheart Boots", "Demonheart Gloves"] },
  { name: "Cocina", slug: "cocina", description: "Comida y recetas para tus aventuras.", kind: "Secundaria", icon: HeartPulse, sourceSlug: "cooking", hasCraftingRoute: true, summary: "Sube cocinando recetas para las que puedas reunir ingredientes de vendedores, pesca y botín. Los materiales exactos dependen de la ruta y la disponibilidad.", newExamples: ["Recetas de comida nuevas de Forever", "Comidas con bonificación de experiencia", "Recetas vinculadas a Acampada"] },
  { name: "Primeros auxilios", slug: "primeros-auxilios", description: "Vendas y consumibles de recuperación.", kind: "Secundaria", icon: HeartPulse, sourceSlug: "first-aid", hasCraftingRoute: true, summary: "Convierte telas en vendas y otros consumibles. Reserva la tela necesaria para la progresión y comprueba las recetas añadidas a Forever.", newExamples: ["Pociones de sanación de Primeros auxilios", "Nuevas vendas", "Recetas de recuperación de Forever"] },
  { name: "Pesca", slug: "pesca", description: "Captura peces para cocinar y comerciar.", kind: "Secundaria", icon: Plug, sourceSlug: "fishing", hasCraftingRoute: false, summary: "Progresa pescando en zonas adecuadas y utiliza cebos cuando sea necesario. La habilidad de pesca depende del tiempo de práctica, el lugar y los consumibles usados.", newExamples: ["Fish Bowl", "Nuevas recetas de pesca de Forever", "Recursos para Cocina"] },
];

function ProfessionHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <div className="topline"><span className="topline-dot" /> HERMANDAD DE LA ALIANZA <span className="topline-divider">/</span> WOW FOREVER · PVE NORMAL</div>
      <header className="header">
        <a className="brand" href="/" aria-label="Pacto Escarlata, inicio">
          <span className="brand-mark"><Shield size={28} strokeWidth={1.6} /><span>✠</span></span>
          <span className="brand-copy"><strong>PACTO <em>ESCARLATA</em></strong><small>UNIDOS POR AZEROTH</small></span>
        </a>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={menuOpen ? "nav nav-open" : "nav"}>
          <a href="/">Inicio</a><a href="/#actividades">Eventos</a><a href="/#plantilla">Miembros</a>
          <div className="nav-dropdown nav-dropdown-active"><a className="nav-dropdown-trigger" href="/profesiones" aria-haspopup="true">Profesiones <ChevronDown size={13} /></a><div className="nav-dropdown-menu"><a href="/profesiones">Todas las profesiones</a>{professionList.map((profession) => <a href={`/profesiones/${profession.slug}`} key={profession.slug}>{profession.name}</a>)}</div></div>
          <a href="/talentos">Talentos</a>
          <a className="nav-cta" href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">Únete al pacto <ArrowRight size={15} /></a>
        </nav>
      </header>
    </>
  );
}

function ProfessionFooter() {
  return <footer className="footer"><a className="brand footer-brand" href="/"><span className="brand-mark"><Shield size={24} /><span>✠</span></span><span className="brand-copy"><strong>PACTO <em>ESCARLATA</em></strong><small>UNIDOS POR AZEROTH</small></span></a><p>Por la Alianza. Por la hermandad. Por el pacto.</p><div className="api-status"><span className="status-dot online" /> Warcraft Forever · Guías comunitarias</div><small className="legal">Proyecto comunitario no oficial. World of Warcraft y sus marcas pertenecen a sus respectivos propietarios.</small></footer>;
}

function ProfessionsPage() {
  const groups = ["Fabricación", "Recolección", "Secundaria"];
  return <div className="site-shell"><ProfessionHeader /><main className="profession-page"><section className="profession-hero"><div className="profession-backdrop"/><div className="profession-hero-content"><div className="section-kicker">CONOCIMIENTO DE AZEROTH</div><h1>Profesiones de <em>Azeroth</em></h1><p>Guías, rutas de habilidad, materiales y novedades para Warcraft Forever.</p><div className="profession-rule"/></div></section><section className="profession-content"><div className="section-kicker">TU PRÓXIMO OFICIO</div><div className="profession-heading"><div><h2>Las 12 profesiones</h2><p>Selecciona una profesión para consultar su enfoque, progresión y fuentes de referencia.</p></div><span className="profession-count">12 / 12</span></div>{groups.map(group => <section className="profession-group" key={group}><h3>{group}</h3><div className="profession-grid">{professionList.filter(p => p.kind === group).map((profession) => { const Icon = profession.icon; return <a className="profession-card profession-card-ready" href={`/profesiones/${profession.slug}`} key={profession.slug}><span className="profession-icon"><Icon size={23}/></span><span className="profession-card-copy"><strong>{profession.name}</strong><small>{profession.description}</small></span><span className="profession-status ready">VER GUÍA</span><ArrowRight className="profession-arrow" size={17}/></a>; })}</div></section>)}<p className="profession-disclaimer">Las rutas y materiales se contrastan con las referencias disponibles de Warcraft Forever. Los costes de la casa de subastas cambian; consulta la fuente antes de comprar componentes.</p></section></main><ProfessionFooter /></div>;
}

type ProfessionGuideData = {
  objective: string;
  preparation: string[];
  progression: { range: string; title: string; detail: string }[];
  forever: string[];
  tips: string[];
  routeType: string;
};

const professionGuides: Record<string, ProfessionGuideData> = {
  alquimia: {
    objective: "Fabricar pociones, elixires y frascos usando hierbas y reactivos. Es una profesión de consumo: el valor real depende de qué necesita tu personaje y qué se vende en la hermandad o en la subasta.",
    preparation: ["Hierbas de distintos tramos de habilidad (recolectadas o compradas).", "Viales y recipientes de vendedor; comprueba el tipo exigido por cada receta.", "Espacio de bolsas para separar hierbas, viales y productos terminados."],
    progression: [{range:"1–75",title:"Aprendiz",detail:"Aprende las recetas iniciales al instructor y fabrica mientras la receta siga dando puntos de habilidad. No acumules una receta gris."},{range:"75–150",title:"Oficial",detail:"Entrena el siguiente rango y cambia a recetas que consuman hierbas de nivel superior. Revisa los componentes secundarios antes de comprar."},{range:"150–225",title:"Experto",detail:"Compara varias recetas amarillas/naranjas disponibles y elige por coste de reactivos, no solo por el número de pociones."},{range:"225–300",title:"Artesano",detail:"Confirma el acceso al rango final y planifica las recetas restantes con la lista de materiales actualizada. La ruta económica puede variar con la subasta."}],
    forever: ["Forever incorpora nuevas recetas de elixires y frascos.", "Las referencias de la beta señalan que las pociones de sanación también aparecen en Primeros auxilios; comprueba en el cliente dónde se aprende cada receta.", "Los precios de la casa de subastas cambian la ruta más barata; las cantidades no deben tratarse como una lista fija."],
    tips: ["Combina Alquimia con Herboristería si quieres reducir compras de hierbas.", "Compra viales al vendedor en lugar de pagar de más en subasta.", "Revisa los materiales de la siguiente receta antes de terminar una tanda grande."], routeType:"Fabricación · ruta por recetas"
  },
  herreria: {
    objective: "Convertir menas en barras y componentes para fabricar armas, armaduras y objetos metálicos. Es una profesión intensiva en mineral, piedra y materiales secundarios.",
    preparation: ["Mena y piedra de los tramos que cubra tu habilidad.", "Acceso a una forja y herramientas de herrero.", "Barras y componentes adicionales que exija cada receta; no presupongas que fundir siempre sube la habilidad."],
    progression: [{range:"1–75",title:"Aprendiz",detail:"Empieza con recetas sencillas de metal y comprueba si la fundición disponible aporta habilidad. Guarda las barras que necesitarás para fabricar."},{range:"75–150",title:"Oficial",detail:"Aprende recetas del nuevo rango y compara el coste de las barras con el de fabricar directamente con componentes comprados."},{range:"150–225",title:"Experto",detail:"Las recetas pueden dejar de dar puntos antes de lo esperado en Forever. Sustituye cualquier receta que se vuelva gris."},{range:"225–300",title:"Artesano",detail:"Reserva mineral de alto nivel y revisa los requisitos de entrenamiento y recetas antes de invertir en grandes cantidades."}],
    forever: ["Forever incluye nuevas recetas de armas y armaduras; las especializaciones clásicas no deben darse por confirmadas sin comprobar el cliente actual.", "Los datos comparativos de la beta indican que algunas recetas dejan de dar habilidad antes que en Classic; no sigas una lista clásica sin verificar colores y umbrales."],
    tips: ["Minería es la pareja natural para obtener mineral propio.", "No fundas todo el mineral automáticamente: compara si lo necesitas para recetas posteriores.", "Prioriza recetas que consuman materiales que ya tienes y que sigan dando habilidad."], routeType:"Fabricación · ruta por recetas"
  },
  encantamiento: {
    objective: "Desencantar equipo para obtener polvos, esencias y fragmentos, y utilizar esos componentes para aplicar mejoras mágicas. El coste depende del equipo disponible y del valor de los materiales.",
    preparation: ["Objetos verdes o mejores que puedas desencantar y que no necesites vender o equipar.", "Polvos, esencias, fragmentos y varas de encantamiento requeridos por las fórmulas.", "Objetos de bajo coste para encantar repetidamente; calcula el coste neto teniendo en cuenta el desencantado."],
    progression: [{range:"1–75",title:"Aprendiz",detail:"Aprende encantamientos básicos y desencanta objetos prescindibles para crear una reserva inicial de componentes."},{range:"75–150",title:"Oficial",detail:"Amplía fórmulas con el instructor y compara los materiales consumidos por cada encantamiento disponible."},{range:"150–225",title:"Experto",detail:"Alterna desencantado y fabricación de encantamientos según los componentes que consigas; no asumas que todos los encantamientos cuestan lo mismo."},{range:"225–300",title:"Artesano",detail:"Revisa varas y componentes de rango alto con antelación. Confirma las fórmulas y los requisitos en el cliente actual."}],
    forever: ["Las referencias de Forever describen encantamientos de anillos y la fabricación de bastones por encantadores.", "Desencantar sigue siendo una fuente de polvos, esencias y fragmentos.", "La disponibilidad de objetos para desencantar suele ser el principal límite práctico de esta profesión."],
    tips: ["Sastrería puede ayudar a producir objetos para desencantar, aunque el coste debe compararse con comprarlos.", "No desencantes equipo que pueda venderse por más de lo que valen sus componentes.", "Guarda varas y componentes de rangos anteriores si otra fórmula los requiere."], routeType:"Fabricación · ruta por recetas"
  },
  ingenieria: {
    objective: "Fabricar dispositivos, explosivos, herramientas, munición y otros artilugios con metales, piedras y componentes. Requiere organizar materiales intermedios, no solo el material final.",
    preparation: ["Barras, piedra y componentes metálicos de distintos rangos.", "Materiales secundarios de recetas (por ejemplo, telas, cuero o reactivos cuando se indiquen).", "Bolsas con espacio para piezas intermedias; evita vender componentes que vayas a reutilizar."],
    progression: [{range:"1–75",title:"Aprendiz",detail:"Empieza con piezas sencillas y fabrica componentes intermedios solo cuando la ruta los necesite."},{range:"75–150",title:"Oficial",detail:"Revisa recetas del siguiente rango y calcula los componentes de segundo nivel antes de ir al instructor."},{range:"150–225",title:"Experto",detail:"Compara recetas según los materiales que ya tienes. No produzcas grandes cantidades de objetos cuyo valor de venta sea bajo."},{range:"225–300",title:"Artesano",detail:"Verifica los requisitos de recetas avanzadas y conserva materiales raros hasta saber qué fórmula utilizarás para terminar."}],
    forever: ["La profesión tiene recetas nuevas en la beta de Forever.", "Las rutas basadas en Classic pueden quedarse cortas si cambian las recetas o los umbrales de habilidad; verifica cada receta en el cliente."],
    tips: ["Minería reduce la dependencia de comprar metal y piedra.", "Mantén una lista de componentes intermedios que aún necesitas fabricar.", "Compara el coste de materiales con el precio de comprar un componente ya hecho."], routeType:"Fabricación · ruta por recetas"
  },
  herboristeria: {
    objective: "Recolectar hierbas en el mundo. La habilidad progresa al encontrar nodos apropiados; la mejor ruta depende del nivel de las plantas, la zona, la competencia y el tiempo de desplazamiento.",
    preparation: ["Activa Seguimiento de hierbas en el minimapa.", "Lleva bolsas libres y una montura si está disponible.", "Consulta los requisitos de habilidad de las hierbas de la zona antes de recorrerla."],
    progression: [{range:"Habilidad baja",title:"Zonas iniciales",detail:"Recoge todas las hierbas que puedas extraer con tu habilidad y completa circuitos cortos en lugar de cruzar el mapa por un solo nodo."},{range:"Habilidad media",title:"Zonas intermedias",detail:"Cambia de zona cuando la mayoría de los nodos ya no concedan puntos. Usa el minimapa para seguir circuitos repetibles."},{range:"Habilidad alta",title:"Zonas avanzadas",detail:"Busca zonas con densidad de nodos apropiados y menos competencia. Comprueba el requisito real de cada hierba en Forever."},{range:"Habilidad máxima",title:"Optimización",detail:"Sigue recolectando las hierbas con demanda y utiliza los materiales para Alquimia o para venderlos."}],
    forever: ["Herboristería es una profesión de recolección: no existe una lista de fabricación 1–300 equivalente a las profesiones de recetas.", "Forever incluye objetos de acampada relacionados con recursos naturales; comprueba la receta y el uso concreto en el catálogo actual."],
    tips: ["Alquimia aprovecha directamente las hierbas recolectadas.", "El circuito más corto y constante suele ser mejor que perseguir un nodo aislado.", "Si no recibes puntos, revisa si los nodos de la zona son demasiado fáciles para tu habilidad."], routeType:"Recolección · ruta por nodos"
  },
  peleteria: {
    objective: "Transformar cuero y escamas en armaduras, refuerzos y otros objetos. La progresión depende de los materiales obtenidos mediante Desuello y de las recetas que sigan dando habilidad.",
    preparation: ["Cuero ligero, medio, pesado y de niveles superiores según la receta.", "Hilos, tintes, sal y otros componentes de vendedor cuando los requiera la fórmula.", "Escamas y pieles especiales solo después de comprobar que la ruta las necesita."],
    progression: [{range:"1–75",title:"Aprendiz",detail:"Utiliza patrones iniciales y transforma cuero básico sin fabricar más unidades de las necesarias."},{range:"75–150",title:"Oficial",detail:"Sube al siguiente rango y revisa qué recetas consumen menos cuero por punto de habilidad."},{range:"150–225",title:"Experto",detail:"Comprueba con frecuencia el color de las recetas: en Forever algunas pueden dejar de dar puntos antes que en Classic."},{range:"225–300",title:"Artesano",detail:"Reserva pieles y escamas poco comunes para patrones confirmados y completa la subida con recetas disponibles en tu servidor."}],
    forever: ["Forever añade patrones y objetos nuevos; la disponibilidad de recetas puede variar respecto a Classic.", "Las rutas de beta señalan cambios en los umbrales de habilidad de varias recetas de fabricación: confirma el color de la receta antes de hacer una tanda grande."],
    tips: ["Combina Peletería con Desuello para obtener cuero propio.", "Compra hilo y otros suministros de vendedor cuando sea más eficiente que la subasta.", "No gastes escamas raras en una receta si aún no sabes si necesitarás ese material para otro patrón."], routeType:"Fabricación · ruta por recetas"
  },
  mineria: {
    objective: "Extraer menas y piedras de los filones, y fundir minerales cuando convenga. La progresión es por nodos y requisitos de habilidad, así que las rutas geográficas importan más que una lista fija de recetas.",
    preparation: ["Pico de minería.", "Seguimiento de minerales activado en el minimapa.", "Espacio para mena, piedra y gemas; lleva solo los consumibles necesarios para el recorrido."],
    progression: [{range:"Habilidad baja",title:"Filones iniciales",detail:"Busca filones que puedas extraer de forma fiable. Aprovecha circuitos de zona compactos para acumular intentos."},{range:"Habilidad media",title:"Filones intermedios",detail:"Avanza cuando los filones actuales dejen de conceder puntos o sean demasiado fáciles. Funde solo si necesitas barras o la acción aporta progreso."},{range:"Habilidad alta",title:"Filones avanzados",detail:"Planifica rutas con varios puntos de aparición y evita depender de un único filón competido."},{range:"Habilidad máxima",title:"Minería eficiente",detail:"Elige rutas según la mena que necesites para Herrería o Ingeniería, no solo por la experiencia de profesión."}],
    forever: ["Las referencias de Forever señalan una bonificación pasiva de aguante para Minería y opciones de especialización relacionadas con la extracción.", "Los nodos y sus requisitos deben confirmarse con los datos actuales de la beta; las rutas clásicas no garantizan ubicaciones o umbrales idénticos."],
    tips: ["Herrería e Ingeniería consumen muchos materiales de minería.", "Activa siempre el seguimiento de minerales antes de empezar la ruta.", "Vende o almacena las menas según la demanda de tu hermandad y tus recetas previstas."], routeType:"Recolección · ruta por filones"
  },
  desuello: {
    objective: "Obtener cuero y pieles de bestias válidas. La forma más constante de subir es desollar criaturas adecuadas mientras completas misiones o recorres zonas con abundancia de animales.",
    preparation: ["Cuchillo de desuello si el cliente o el servidor lo requiere.", "Bolsas libres para cuero y pieles.", "Una ruta con criaturas que puedas derrotar rápido y que permitan desuello."],
    progression: [{range:"Habilidad baja",title:"Criaturas iniciales",detail:"Desuella las bestias de las zonas iniciales que correspondan a tu habilidad. No dejes cadáveres válidos sin aprovechar."},{range:"Habilidad media",title:"Zonas intermedias",detail:"Avanza hacia criaturas de nivel adecuado y combina la recolección con misiones para reducir viajes vacíos."},{range:"Habilidad alta",title:"Zonas avanzadas",detail:"Elige zonas con una alta densidad de bestias y competencia moderada; la rapidez para matar y desollar afecta al ritmo real."},{range:"Habilidad máxima",title:"Materiales de demanda",detail:"Prioriza criaturas que suelten el tipo de cuero o piel que necesites para Peletería o para vender."}],
    forever: ["No se han identificado cambios propios de Forever suficientemente confirmados para describir una ruta exclusiva; usa los requisitos del cliente actual.", "La profesión aprovecha las ventajas de Legado de recolección que estén activas en tu versión."],
    tips: ["Peletería consume directamente el cuero obtenido.", "Desuella mientras subes de nivel para no tener que volver a farmear criaturas antiguas.", "Si no aparece la interacción de desuello, comprueba el tipo de criatura, el cadáver y tu habilidad."], routeType:"Recolección · ruta por criaturas"
  },
  sastreria: {
    objective: "Convertir telas obtenidas principalmente de humanoides en prendas, bolsas y equipo de tela. Planificar el uso de tela es importante porque Primeros auxilios también la consume.",
    preparation: ["Telas de los tramos de habilidad que vayas a subir.", "Hilos, tintes y otros componentes de vendedor que indiquen las recetas.", "Un margen de tela reservado para Primeros auxilios si también quieres subir esa profesión."],
    progression: [{range:"1–75",title:"Aprendiz",detail:"Empieza con patrones sencillos y calcula los rollos de tela que debes convertir en componentes antes de fabricar."},{range:"75–150",title:"Oficial",detail:"Aprende patrones del siguiente rango y evita fabricar componentes en exceso si no los vas a usar."},{range:"150–225",title:"Experto",detail:"Revisa las recetas que sigan dando puntos en Forever y compara el consumo total de tela por habilidad ganada."},{range:"225–300",title:"Artesano",detail:"Reserva telas de alto nivel y confirma los patrones avanzados antes de gastar materiales poco comunes."}],
    forever: ["Las referencias de Forever describen una mayor obtención de tela por parte de sastres y patrones nuevos.", "Los umbrales de habilidad de algunas recetas pueden diferir de Classic; verifica el color y la disponibilidad del patrón."],
    tips: ["Primeros auxilios comparte el consumo de tela: separa un lote para vendas.", "Farmea humanoides mientras haces misiones para reunir tela y experiencia de personaje.", "Guarda patrones poco comunes hasta comprobar su requisito y coste de materiales."], routeType:"Fabricación · ruta por recetas"
  },
  cocina: {
    objective: "Preparar comida con beneficios para el personaje. Los ingredientes pueden proceder de pesca, botín de criaturas, vendedores y otras profesiones; aprende recetas nuevas conforme aumente la habilidad.",
    preparation: ["Carne, pescado, especias y otros ingredientes indicados por las recetas.", "Leña o fuego de cocina disponible para preparar los platos.", "Recetas aprendidas de instructor, vendedores, botín o sistemas propios de Forever."],
    progression: [{range:"1–75",title:"Cocina básica",detail:"Aprende recetas iniciales y usa ingredientes que consigas durante las misiones. Cambia cuando la receta deje de dar puntos."},{range:"75–150",title:"Recetas intermedias",detail:"Amplía el recetario y reúne ingredientes de zonas apropiadas; combina la cocina con la pesca si te resulta práctico."},{range:"150–225",title:"Cocina avanzada",detail:"Revisa requisitos de recetas y prioriza platos cuyos ingredientes puedas obtener de forma estable."},{range:"225–300",title:"Cocina de artesano",detail:"Planifica recetas de habilidad alta y confirma dónde se aprenden: instructor, vendedor o botín."}],
    forever: ["La referencia de Forever describe una ventaja de Chef maestro que puede producir un resultado adicional.", "La comida de Forever puede dar una bonificación de experiencia por muertes además de sus efectos habituales.", "Algunos platos y recetas se vinculan con el sistema de Acampada."],
    tips: ["Pesca aporta ingredientes para Cocina, pero no es obligatorio depender solo del pescado.", "Comprueba los ingredientes antes de comprar: algunas recetas requieren carne de una criatura concreta.", "Cocina en lotes pequeños cuando la receta esté cerca de volverse gris."], routeType:"Habilidad secundaria · ruta por recetas"
  },
  'primeros-auxilios': {
    objective: "Crear vendas y consumibles de recuperación con tela y otros componentes. Es una habilidad secundaria útil para reducir descansos, aunque compite por telas con Sastrería.",
    preparation: ["Tela de los tipos requeridos por las vendas o curativos.", "Recetas aprendidas por los medios disponibles en Forever; revisa requisitos de habilidad.", "Un lote de tela reservado para Primeros auxilios antes de gastar materiales en Sastrería."],
    progression: [{range:"1–75",title:"Vendas básicas",detail:"Fabrica vendas iniciales con tela de bajo nivel y deja de producir cuando la receta ya no conceda habilidad."},{range:"75–150",title:"Vendas intermedias",detail:"Aprende el siguiente patrón y calcula la tela disponible antes de fabricar grandes cantidades."},{range:"150–225",title:"Tratamiento avanzado",detail:"Actualiza recetas cuando sea posible y revisa qué materiales alternativos añade Forever."},{range:"225–300",title:"Maestría",detail:"Confirma los requisitos de las recetas finales y reserva materiales para curativos que realmente vayas a utilizar."}],
    forever: ["Forever introduce curativos nuevos, como opciones para sangrado, enfermedad y veneno, según la referencia de la beta.", "En la demo se han documentado pociones de sanación vinculadas a Primeros auxilios; confirma el catálogo actual porque el reparto con Alquimia puede cambiar.", "Un botiquín de campamento puede servir como aportación al sistema de Acampada."],
    tips: ["Sastrería comparte el consumo de tela; decide de antemano qué habilidad tiene prioridad.", "Lleva vendas de varios rangos si tu personaje aún no puede utilizar las más avanzadas.", "No compres una gran cantidad de tela sin revisar la siguiente receta aprendible."], routeType:"Habilidad secundaria · ruta por recetas"
  },
  pesca: {
    objective: "Capturar peces en masas de agua. La progresión depende de la habilidad, el lugar de pesca y los intentos; la zona adecuada y el uso de cebos influyen en la eficiencia.",
    preparation: ["Caña de pescar y habilidad aprendida con el instructor.", "Cebos o mejoras de habilidad si están disponibles y resultan rentables.", "Bolsas libres para peces y objetos obtenidos al pescar."],
    progression: [{range:"Habilidad baja",title:"Aguas iniciales",detail:"Practica en zonas de bajo nivel y aprende a lanzar y recoger de forma constante. Cambia de lugar si fallas demasiado."},{range:"Habilidad media",title:"Nuevas zonas",detail:"Sube la habilidad de pesca con práctica y consulta qué peces o bancos aparecen en la zona elegida."},{range:"Habilidad alta",title:"Pesca especializada",detail:"Utiliza cebos cuando mejoren de forma relevante la probabilidad de captura y el coste lo justifique."},{range:"Habilidad máxima",title:"Pesca por objetivo",detail:"Escoge el lugar por el pescado que necesitas para Cocina, misiones o comercio, no solo por la habilidad."}],
    forever: ["Pesca es una habilidad de recolección; una ruta útil debe organizarse por lugares y objetivos, no por recetas de fabricación.", "Las ubicaciones concretas y la disponibilidad de peces deben verificarse en la versión actual del mundo."],
    tips: ["Cocina aprovecha muchos peces capturados.", "Pescar cerca de un vendedor o banco de almacenamiento reduce viajes cuando llenes las bolsas.", "Si buscas un pez concreto, confirma primero que aparece en esa masa de agua."], routeType:"Habilidad secundaria · ruta por zonas"
  }
};

type StagePlan = { focus: string; checklist: string[]; materials: string[]; exit: string };

// Contenido local de trabajo por profesión y tramo. Las cantidades exactas se muestran
// solo cuando pueden derivarse de una receta concreta verificada; no se inventan totales.
const stagePlans: Record<string, StagePlan[]> = {
  alquimia: [
    { focus: "Aprende las recetas básicas disponibles en el instructor y fabrica pociones de bajo coste mientras sigan dando habilidad.", checklist: ["Aprende todas las recetas iniciales útiles del instructor.", "Fabrica en tandas pequeñas y revisa el color de la receta.", "Anota qué pociones conviene guardar para tu personaje o vender."], materials: ["Hierbas iniciales que exijan las recetas elegidas", "Viales vacíos del tipo indicado", "Hueco de bolsa para pociones terminadas"], exit: "Entrena el siguiente rango cuando alcances su requisito y confirma qué recetas nuevas están disponibles." },
    { focus: "Amplía el recetario y cambia a recetas que consuman hierbas de rango intermedio; compara el coste de los reactivos.", checklist: ["Consulta recetas nuevas en el instructor y vendedores.", "Compara el coste por intento entre dos recetas que den habilidad.", "No sigas fabricando cuando la receta sea gris."], materials: ["Hierbas de rango intermedio", "Viales o recipientes requeridos por cada receta", "Reactivos secundarios especificados por la receta"], exit: "Pasa al siguiente tramo al cumplir el requisito de habilidad y tener localizado el instructor correspondiente." },
    { focus: "Prioriza recetas amarillas o naranjas disponibles y evita acumular productos caros sin uso.", checklist: ["Comprueba el color y los umbrales de cada receta.", "Reserva las hierbas raras para recetas que realmente necesites.", "Revisa la subasta antes de comprar reactivos en grandes cantidades."], materials: ["Hierbas de nivel medio-alto", "Viales y reactivos secundarios", "Componentes para las recetas que hayas elegido"], exit: "Antes de continuar, confirma que el rango experto está aprendido y que la receta siguiente no exige un patrón adicional." },
    { focus: "Planifica el tramo final con recetas de habilidad alta. Las nuevas recetas de Forever incluyen frascos; comprueba sus requisitos antes de comprarlas.", checklist: ["Verifica la habilidad requerida por cada receta avanzada.", "Calcula los componentes por fabricación antes de reunir materiales.", "Separa las recetas de subida de las recetas que quieras fabricar para incursiones."], materials: ["Hierbas de alto nivel según las recetas seleccionadas", "Viales de alto nivel cuando proceda", "Reactivos poco comunes solo tras verificar la receta"], exit: "Da por terminada la subida al alcanzar 300; verifica en el cliente las recetas de Forever y sus requisitos." }
  ],
  herreria: [
    { focus: "Empieza con piezas sencillas de cobre y piedras de afilar. Comprueba qué recetas iniciales enseña el instructor.", checklist: ["Aprende las recetas iniciales del instructor.", "Funde mena cuando necesites barras, pero no cuentes la fundición como progreso automático.", "Fabrica piedras u objetos simples mientras den habilidad."], materials: ["Mena de cobre y barras necesarias", "Rough Stone para componentes de piedra", "Flujo y otros componentes indicados por receta"], exit: "Entrena el siguiente rango y conserva las barras y piedras necesarias para recetas posteriores." },
    { focus: "Introduce bronce y otros metales de nivel medio. Varias recetas requieren componentes adicionales además de las barras.", checklist: ["Comprueba la receta completa antes de fabricar.", "Fabrica primero piedras de amolar si la receta las requiere.", "Evita patrones caros si existe una receta de instructor que siga dando puntos."], materials: ["Barras de cobre, estaño/bronce y metales requeridos", "Piedras de amolar del rango adecuado", "Flujo, cuero o gemas solo si la receta los pide"], exit: "Cambia de metal o receta cuando el color deje de ser eficaz y confirma el acceso al rango siguiente." },
    { focus: "Compara recetas de hierro, acero y mithril por coste total de barras y componentes secundarios.", checklist: ["Revisa los requisitos de patrones y recetas de instructor.", "Calcula barras y piedras por objeto, no solo el material principal.", "Guarda componentes intermedios que reutilicen otras recetas."], materials: ["Barras de hierro, acero o mithril según receta", "Piedras de amolar de rango medio-alto", "Cuero, gemas y flujo si se especifican"], exit: "Confirma el requisito del rango avanzado y prepara con antelación los metales de alto nivel." },
    { focus: "El tramo final puede consumir mucho torio y componentes especiales. No compres materiales raros hasta verificar el patrón.", checklist: ["Prioriza recetas disponibles que aún otorguen habilidad.", "Comprueba patrones, requisitos y componentes poco comunes.", "Separa materiales de subida de los reservados para equipo final."], materials: ["Barras de torio y barras especiales según receta", "Piedras densas y componentes de alto nivel", "Gemas, esencias u otros reactivos solo si la receta lo indica"], exit: "Al alcanzar 300, revisa las recetas añadidas por Forever; no des por confirmadas especializaciones clásicas sin comprobarlas." }
  ],
  encantamiento: [
    { focus: "Aprende encantamientos básicos y empieza a crear una reserva de polvos y esencias mediante el desencantado de equipo prescindible.", checklist: ["Aprende fórmulas del instructor.", "Desencanta solo objetos que no necesites equipar ni vender por más.", "Comprueba que tienes la vara requerida antes de encantar."], materials: ["Polvos y esencias obtenidos por desencantado", "Vara de encantamiento adecuada", "Objetos baratos para practicar encantamientos"], exit: "Aprende el siguiente rango y comprueba si requiere una vara nueva." },
    { focus: "Amplía fórmulas y ajusta la subida a los componentes que puedas conseguir de forma económica.", checklist: ["Compara el coste de cada fórmula disponible.", "Desencanta equipo que sea rentable convertir en materiales.", "No consumas fragmentos valiosos en fórmulas poco eficientes."], materials: ["Polvos de rango intermedio", "Esencias menores o mayores según fórmula", "Vara y componentes adicionales exigidos"], exit: "Continúa cuando cumplas el rango y dispongas de las fórmulas y vara necesarias." },
    { focus: "Alterna desencantado y encantamientos según el stock de materiales; evita depender de un único tipo de componente.", checklist: ["Revisa las fórmulas amarillas/naranjas disponibles.", "Compara desencantar objetos con comprar materiales directamente.", "Guarda materiales que se reutilicen en fórmulas posteriores."], materials: ["Esencias y polvos de rango medio-alto", "Fragmentos según las fórmulas elegidas", "Vara de rango correspondiente"], exit: "Antes del tramo final, confirma la vara, los materiales y las fórmulas que puedes aprender." },
    { focus: "Planifica las fórmulas avanzadas según el coste de fragmentos y esencias. No todos los materiales son fáciles de reponer.", checklist: ["Aprende las fórmulas avanzadas disponibles.", "Comprueba requisitos de habilidad y componentes antes de comprar.", "Calcula el coste por punto y guarda el sobrante útil."], materials: ["Polvos, esencias y fragmentos de alto nivel", "Vara avanzada cuando corresponda", "Objetos prescindibles para desencantar"], exit: "Al llegar a 300, confirma en el cliente las fórmulas especiales y los cambios propios de Forever." }
  ],
  ingenieria: [
    { focus: "Comienza con componentes simples y aprende qué piezas intermedias puedes fabricar a partir de menas y piedras.", checklist: ["Aprende esquemas iniciales del instructor.", "Fabrica componentes intermedios solo cuando sean necesarios.", "Guarda materiales que se reutilicen en varios esquemas."], materials: ["Barras de metal iniciales", "Piedra basta y componentes derivados", "Telas, cuero o flujo si la receta lo requiere"], exit: "Antes de entrenar el siguiente rango, revisa qué componentes de tus recetas actuales conviene guardar." },
    { focus: "Sube con dispositivos y componentes de metal de rango medio. Comprueba cada esquema y sus materiales secundarios.", checklist: ["Revisa esquemas nuevos del instructor.", "Agrupa la fabricación de tubos, pólvora u otras piezas necesarias.", "No fabriques grandes lotes de objetos que ya no den habilidad."], materials: ["Barras de metal de rango medio", "Piedras y componentes mecánicos", "Materiales secundarios indicados por los esquemas"], exit: "Aprende el rango siguiente y prepara componentes de forma escalonada para no llenar las bolsas." },
    { focus: "Compara esquemas de nivel medio-alto por coste y cantidad de componentes intermedios.", checklist: ["Comprueba si el esquema exige un patrón comprado o encontrado.", "Calcula la cadena completa de componentes.", "Reserva materiales raros para objetos útiles cuando sea posible."], materials: ["Barras de metal y piedras de rango alto", "Componentes mecánicos fabricados previamente", "Reactivos especiales solo cuando estén confirmados"], exit: "Confirma los requisitos del rango avanzado y el acceso a los esquemas que usarás." },
    { focus: "El tramo final puede requerir materiales poco comunes. Verifica esquemas y componentes antes de gastar oro.", checklist: ["Prioriza esquemas disponibles que otorguen habilidad.", "Comprueba si el objeto requiere una estación o componente específico.", "Separa materiales de subida de los destinados a dispositivos finales."], materials: ["Metales de alto nivel", "Piezas mecánicas y piedras densas según esquema", "Componentes raros verificados en el cliente"], exit: "Al alcanzar 300, revisa los esquemas de Forever y confirma los requisitos de los objetos avanzados." }
  ],
  herboristeria: [
    { focus: "Recolecta hierbas de zonas iniciales y observa el requisito de habilidad de cada nodo.", checklist: ["Activa Buscar hierbas.", "Recolecta cada nodo compatible con tu habilidad.", "Evita recorrer zonas donde casi todas las plantas sean demasiado difíciles."], materials: ["Hierbas iniciales que encuentres en la ruta", "Bolsas libres para apilar materiales", "Mapa o registro de zonas recorridas"], exit: "Cambia a una zona con nodos adecuados cuando los actuales dejen de otorgar progreso de forma fiable." },
    { focus: "Amplía la ruta a zonas de nivel medio y recoge hierbas que también se usen en Alquimia.", checklist: ["Consulta el requisito de habilidad de los nuevos nodos.", "Haz circuitos repetibles y evita cruzar la zona sin necesidad.", "Guarda hierbas demandadas por las recetas de tu hermandad."], materials: ["Hierbas de rango medio", "Espacio para plantas de distintos tipos", "Montura o rutas de desplazamiento si están disponibles"], exit: "Sube de zona al alcanzar habilidad suficiente y cuando el circuito actual deje de ser eficiente." },
    { focus: "Recolecta plantas de zonas avanzadas y registra cuáles aparecen con regularidad.", checklist: ["Elige una ruta segura con varios nodos cercanos.", "Separa hierbas comunes de las raras.", "Compara la utilidad de recolectar con el precio de subasta."], materials: ["Hierbas de nivel medio-alto", "Bolsas suficientes para rutas largas", "Lista de hierbas necesarias para tus recetas"], exit: "Avanza cuando puedas recolectar de forma consistente en la siguiente zona." },
    { focus: "Busca hierbas de alto nivel y lotos raros, según los requisitos de habilidad y las zonas disponibles.", checklist: ["Verifica el requisito real de cada planta en el cliente.", "Prioriza rutas con varios nodos y desplazamiento corto.", "Comprueba las especializaciones de herboristería disponibles en Forever."], materials: ["Hierbas de alto nivel y plantas raras", "Espacio de bolsas y ruta de retorno", "Lista de ingredientes de Alquimia que quieras reunir"], exit: "La habilidad está completada al llegar al máximo de tu versión; consulta el catálogo para cambios de Forever." }
  ],
  peleteria: [
    { focus: "Empieza con cuero ligero y recetas sencillas. Convierte pieles en cuero solo en la cantidad necesaria para los patrones elegidos.", checklist: ["Aprende recetas iniciales del instructor.", "Comprueba si el patrón necesita hilo o tinte de vendedor.", "Reserva parte del cuero para recetas siguientes."], materials: ["Cuero ligero y restos necesarios", "Hilo de vendedor", "Tinte u otros componentes solo si la receta lo pide"], exit: "Aprende el siguiente rango y comprueba si las recetas nuevas requieren más cuero por unidad." },
    { focus: "Utiliza cuero medio y pesado según las recetas disponibles; desuella criaturas para reducir compras.", checklist: ["Compara patrones de coste parecido.", "Fabrica previamente cuero curtido o componentes que se reutilicen.", "No consumas todo el cuero en una sola receta."], materials: ["Cuero de rango medio", "Hilo y tintes de vendedor", "Componentes adicionales de cada patrón"], exit: "Cambia de tipo de cuero cuando la receta y el rango de habilidad lo exijan." },
    { focus: "Trabaja con cuero grueso y patrones avanzados. Verifica los requisitos de los patrones antes de reunir materiales.", checklist: ["Revisa recetas de instructor y patrones comprados.", "Calcula el coste de escamas o pieles especiales por objeto.", "Guarda materiales raros para patrones útiles."], materials: ["Cuero grueso o equivalente del rango", "Escamas y pieles si el patrón las pide", "Hilo, tintes y componentes secundarios"], exit: "Prepara el cuero de alto nivel y los patrones necesarios antes de entrar al tramo final." },
    { focus: "Planifica la subida con cuero resistente y patrones de alto nivel. Las recetas nuevas de Forever deben comprobarse individualmente.", checklist: ["Verifica el patrón y su requisito de habilidad.", "No compres escamas o pieles raras sin confirmar la receta.", "Compara los componentes de varias recetas que sigan dando habilidad."], materials: ["Cuero de alto nivel", "Escamas, pieles o reactivos de patrón confirmado", "Hilo y otros componentes secundarios"], exit: "Al llegar al máximo, comprueba las recetas nuevas y cualquier especialización activa en Forever." }
  ],
  mineria: [
    { focus: "Extrae filones de cobre y otros nodos iniciales que tu habilidad permita. Funde cuando necesites barras para otra profesión.", checklist: ["Aprende minería y compra un pico si la versión lo requiere.", "Activa Buscar minerales.", "Recoge piedra y mena sin llenar la bolsa con objetos innecesarios."], materials: ["Pico de minería si corresponde", "Mena y piedra iniciales", "Espacio de bolsa para minerales"], exit: "Pasa a una zona con nodos de rango superior cuando puedas extraerlos de forma fiable." },
    { focus: "Busca filones de rango medio y compara si conviene fundir o vender la mena según tus necesidades.", checklist: ["Sigue circuitos que pasen por varios filones.", "Funde solo las menas que necesites para Herrería o Ingeniería.", "Guarda gemas y materiales poco comunes."], materials: ["Mena de rango medio", "Piedra asociada a los filones", "Combustibles o requisitos de fundición si proceden"], exit: "Cambia de zona cuando tu habilidad permita extraer los filones siguientes." },
    { focus: "Recorre zonas con menas avanzadas y prepara barras para recetas de Herrería e Ingeniería.", checklist: ["Revisa el requisito de cada tipo de filón.", "Prioriza circuitos compactos y repetibles.", "Separa menas, barras y gemas para conocer el valor de cada material."], materials: ["Mena de rango medio-alto", "Piedras y gemas de los filones", "Barras necesarias para profesiones complementarias"], exit: "Antes de la etapa final, identifica las zonas donde aparecen los minerales de mayor nivel." },
    { focus: "Recolecta torio y minerales especiales en zonas de alto nivel. Comprueba los nodos y requisitos reales de Forever.", checklist: ["Confirma el requisito de habilidad de cada filón.", "Compara la extracción propia con comprar barras ya fundidas.", "Comprueba las ventajas de Legado o especializaciones disponibles."], materials: ["Mena de alto nivel", "Piedras y gemas asociadas", "Espacio para materiales raros"], exit: "Al alcanzar el máximo, revisa las novedades de minería y las bonificaciones de Forever." }
  ],
  desuello: [
    { focus: "Desuella bestias de nivel bajo después de derrotarlas y comprueba que tu habilidad permite obtener cuero.", checklist: ["Aprende desuello y equipa el cuchillo si la versión lo requiere.", "Desuella cadáveres aptos antes de abandonar la zona.", "Recoge cuero sin desviarte demasiado de las misiones."], materials: ["Cuchillo de desuello si procede", "Cuero y restos iniciales", "Bolsas libres"], exit: "Avanza hacia criaturas de mayor nivel cuando los cadáveres actuales dejen de dar progreso." },
    { focus: "Combina misiones y farmeo de bestias de nivel medio; el tipo de criatura determina el cuero obtenido.", checklist: ["Elige una zona con alta densidad de bestias.", "Comprueba si las criaturas dejan desollar después del combate.", "Guarda el cuero para Peletería o véndelo según necesidad."], materials: ["Cuero de rango medio", "Pieles que suelten las criaturas disponibles", "Espacio de inventario para botín"], exit: "Sube a criaturas de mayor nivel cuando tu habilidad lo permita." },
    { focus: "Busca bestias de nivel medio-alto y rutas con respawn constante para reunir cuero y pieles especiales.", checklist: ["Evita zonas donde compitas por los mismos recursos.", "Comprueba el tipo de cuero obtenido por criatura.", "Reserva pieles poco comunes si las necesita un patrón."], materials: ["Cuero de rango medio-alto", "Pieles especiales si aparecen", "Ruta de farmeo con varios grupos de criaturas"], exit: "Prepara una ruta de alto nivel y comprueba qué criaturas puedes desollar de forma fiable." },
    { focus: "Desuella bestias de alto nivel y reúne cuero resistente para Peletería. Comprueba los cambios de Legado en Forever.", checklist: ["Selecciona criaturas que puedas derrotar rápidamente.", "Revisa si las ventajas de recolección afectan los materiales escasos.", "Alterna zonas si el respawn o la competencia reducen la eficiencia."], materials: ["Cuero de alto nivel", "Pieles raras de criaturas adecuadas", "Espacio para materiales y botín"], exit: "Completa la habilidad al llegar al máximo y confirma las ventajas activas en el cliente." }
  ],
  sastreria: [
    { focus: "Empieza con tela de lino y patrones básicos. Fabrica madejas cuando sean requisito de los objetos que vas a crear.", checklist: ["Aprende patrones iniciales del instructor.", "Compra hilo al vendedor cuando lo pida la receta.", "Reserva tela para Primeros auxilios si también vas a subirla."], materials: ["Tela de lino y madejas necesarias", "Hilo de vendedor", "Otros componentes especificados por patrón"], exit: "Aprende el siguiente rango y calcula cuánta tela necesitarás para sus patrones." },
    { focus: "Pasa a telas de rango medio y fabrica prendas o componentes que sigan dando habilidad.", checklist: ["Convierte tela en madejas solo según la ruta elegida.", "Comprueba patrones de instructor y vendedor.", "No gastes toda la tela en bolsas si necesitas subir Primeros auxilios."], materials: ["Tela de rango medio", "Hilo y tintes cuando proceda", "Componentes intermedios del patrón"], exit: "Cambia de tipo de tela cuando el rango y el patrón lo requieran." },
    { focus: "Utiliza telas de nivel superior y patrones que mantengan una buena relación entre materiales y habilidad.", checklist: ["Compara el consumo de tela de varias recetas.", "Comprueba si los patrones requieren componentes raros.", "Guarda piezas intermedias que vayas a reutilizar."], materials: ["Tela de rango medio-alto", "Hilo, tintes y componentes secundarios", "Patrones aprendidos o comprados"], exit: "Reserva telas de alto nivel y confirma los requisitos de los patrones avanzados." },
    { focus: "Planifica el tramo final con telas de alto nivel y patrones verificados. Forever documenta más tela para sastres y recetas nuevas.", checklist: ["Verifica la habilidad requerida de cada patrón.", "Calcula la tela necesaria antes de empezar un lote grande.", "Comprueba bordados y bonificaciones de Forever en el cliente."], materials: ["Tela de alto nivel", "Hilo y componentes avanzados", "Componentes especiales solo si el patrón lo exige"], exit: "Al alcanzar el máximo, revisa patrones y bonificaciones propios de Forever." }
  ],
  cocina: [
    { focus: "Aprende recetas sencillas y cocina ingredientes que consigas durante misiones. Comprueba si necesitas fuego o utensilios.", checklist: ["Aprende recetas básicas del instructor.", "Compra especias y componentes de vendedor que indique cada receta.", "Cocina en tandas pequeñas para no acumular comida inútil."], materials: ["Carne o pescado inicial según receta", "Especias de vendedor cuando proceda", "Fuego de cocina o acceso a una fuente de calor"], exit: "Aprende recetas nuevas cuando cumplas el requisito y reúne sus ingredientes antes de fabricar." },
    { focus: "Amplía el recetario y combina pesca, botín y vendedores para obtener ingredientes de rango medio.", checklist: ["Revisa vendedores y recetas de instructor.", "Usa pescado si lo consigues con facilidad, pero no dependas de él exclusivamente.", "Guarda ingredientes raros para recetas que necesites."], materials: ["Carne y pescado de nivel medio", "Especias y componentes de vendedor", "Ingredientes específicos de cada receta"], exit: "Cambia a recetas de mayor nivel cuando las actuales dejen de otorgar habilidad." },
    { focus: "Prioriza recetas cuyos ingredientes puedas reunir de forma estable y revisa las recetas especiales de Forever.", checklist: ["Comprueba dónde se aprende cada receta.", "Compara el coste de pescado, carne y especias.", "Revisa si la comida ofrece beneficios útiles para tu personaje."], materials: ["Ingredientes de rango medio-alto", "Pescado o carne de criaturas concretas", "Especias y componentes secundarios"], exit: "Antes del tramo final, localiza recetas avanzadas y verifica sus requisitos." },
    { focus: "Completa la habilidad con recetas avanzadas verificadas y aprovecha Cocina junto a Pesca cuando sea rentable.", checklist: ["Comprueba los requisitos de las recetas de alto nivel.", "Verifica las bonificaciones de comida de Forever.", "Fabrica lo necesario para la habilidad y conserva alimentos útiles."], materials: ["Ingredientes de alto nivel según receta", "Pescados, carnes y especias específicas", "Componentes de recetas especiales si están confirmados"], exit: "Al alcanzar el máximo, revisa las recetas nuevas y el sistema de Acampada de Forever." }
  ],
  'primeros-auxilios': [
    { focus: "Aprende las vendas iniciales y conviértelas a partir de tela de bajo nivel.", checklist: ["Aprende la receta inicial con el instructor.", "Fabrica vendas solo mientras den habilidad.", "Reserva una parte de la tela para Sastrería si la subes a la vez."], materials: ["Tela de lino u otra tela inicial requerida", "Receta de venda disponible", "Hueco de bolsa para vendas"], exit: "Aprende la siguiente receta al cumplir el requisito y reserva la tela que exige." },
    { focus: "Usa telas de rango medio para las vendas siguientes y comprueba los requisitos de aprendizaje.", checklist: ["Consulta el instructor o el método de aprendizaje de cada venda.", "No conviertas toda la tela antes de revisar la receta siguiente.", "Lleva vendas apropiadas para tu nivel de personaje."], materials: ["Tela de rango medio", "Recetas de venda intermedia", "Tela reservada para Sastrería si procede"], exit: "Cambia a la venda siguiente cuando la receta actual deje de dar habilidad." },
    { focus: "Actualiza a vendas avanzadas y comprueba si la versión de Forever añade curativos o requisitos distintos.", checklist: ["Verifica los requisitos en el cliente actual.", "Revisa si existen recetas especiales para estados concretos.", "Fabrica cantidades moderadas hasta confirmar la ruta."], materials: ["Tela de rango medio-alto", "Recetas avanzadas verificadas", "Materiales adicionales si los indica el cliente"], exit: "Confirma el requisito de la receta final y consigue los materiales antes de avanzar." },
    { focus: "Completa el rango final con vendas de alto nivel y verifica los curativos especiales documentados en Forever.", checklist: ["Comprueba las recetas finales y su fuente.", "No asumas que una poción pertenece a esta profesión sin verificarla.", "Guarda vendas útiles para el contenido que juegas."], materials: ["Tela de alto nivel", "Recetas finales disponibles", "Componentes adicionales solo si están indicados en el cliente"], exit: "Al llegar al máximo, revisa las novedades de Primeros auxilios y el sistema de Acampada." }
  ],
  pesca: [
    { focus: "Practica en aguas de zonas iniciales y aprende la mecánica de lanzar y recoger. Elige lugares con capturas constantes.", checklist: ["Aprende Pesca con un instructor.", "Consigue una caña y equipa cebos si los tienes.", "Practica en aguas de bajo nivel y revisa la frecuencia de fallos."], materials: ["Caña de pescar", "Cebos iniciales si están disponibles", "Espacio de inventario para peces"], exit: "Cambia a aguas de rango superior cuando la habilidad y las capturas lo permitan." },
    { focus: "Prueba zonas de nivel medio y reúne peces que sirvan para Cocina o que tengan demanda.", checklist: ["Elige lugares cercanos a vendedores o bancos si necesitas vaciar bolsas.", "Usa cebos cuando el aumento de habilidad compense el coste.", "Registra dónde aparecen los peces que necesitas."], materials: ["Caña y cebos de habilidad media", "Espacio para peces y objetos pescados", "Lista de peces útiles para Cocina"], exit: "Avanza hacia nuevas aguas cuando tu habilidad y la tasa de captura lo justifiquen." },
    { focus: "Pesca en zonas avanzadas y busca bancos o especies específicas para recetas y objetivos de personaje.", checklist: ["Comprueba qué peces aparecen en cada masa de agua.", "Compara cebos y bonificaciones disponibles.", "Evita zonas en las que falles de forma constante."], materials: ["Caña y bonificaciones adecuadas", "Cebos si son rentables", "Espacio para especies de rango alto"], exit: "Selecciona la ruta final según los peces disponibles y la habilidad requerida." },
    { focus: "Optimiza la pesca por objetivo: habilidad máxima, ingredientes para Cocina o peces de valor.", checklist: ["Confirma las zonas y requisitos en la versión actual.", "Combina la ruta con Cocina cuando te resulte rentable.", "Verifica los peces especiales y su disponibilidad antes de farmearlos."], materials: ["Caña y cebos adecuados al objetivo", "Espacio de inventario suficiente", "Lista de especies y zonas verificadas"], exit: "Completa la progresión al alcanzar el máximo de la versión y conserva la ruta más útil para tus objetivos." }
  ]
};


type RouteRecipe = { range: string; recipe: string; crafts: string; materials: string[] };
const verifiedCraftRoutes: Record<string, RouteRecipe[]> = {
  alquimia: [
    {range:"1–13",recipe:"Minor Arcane Elixir",crafts:"13",materials:["Peacebloom × 13","Empty Vial × 13"]},
    {range:"13–20",recipe:"Elixir of Minor Defense",crafts:"7 aprox.",materials:["Silverleaf × 7","Peacebloom × 7","Empty Vial × 7"]},
    {range:"20–23",recipe:"Mana Well",crafts:"4 aprox.",materials:["Peacebloom × 4","Empty Vial × 4"]},
    {range:"23–84",recipe:"Elixir of Minor Defense",crafts:"83 aprox.",materials:["Silverleaf × 83","Peacebloom × 83","Empty Vial × 83"]},
    {range:"84–89",recipe:"Minor Mana Potion",crafts:"11 aprox.",materials:["Mageroyal × 11","Peacebloom × 11","Empty Vial × 11"]},
    {range:"89–119",recipe:"Lesser Discolored Healing Potion",crafts:"69 aprox.",materials:["Empty Vial × 69","Briarthorn × 69","Murloc Eye × 69"]},
    {range:"119–120",recipe:"Elixir of Giant Growth",crafts:"1",materials:["Deviate Fish × 1","Earthroot × 1","Empty Vial × 1"]},
    {range:"120–130",recipe:"Elixir of Wisdom",crafts:"12 aprox.",materials:["Mageroyal × 12","Briarthorn × 24","Empty Vial × 12"]},
    {range:"130–145",recipe:"Swim Speed Potion",crafts:"19 aprox.",materials:["Swiftthistle × 19","Blackmouth Oil × 19","Empty Vial × 19"]},
    {range:"145–175",recipe:"Lesser Mana Potion",crafts:"54 aprox.",materials:["Mageroyal × 54","Stranglekelp × 54","Empty Vial × 54"]},
    {range:"175–190",recipe:"Greater Discolored Healing Potion",crafts:"19 aprox.",materials:["Leaded Vial × 19","Kingsblood × 19","Murloc Eye × 19"]},
    {range:"190–205",recipe:"Draught of Water Walking",crafts:"19 aprox.",materials:["Blackmouth Oil × 19","Liferoot × 19","Leaded Vial × 19"]},
    {range:"205–215",recipe:"Elixir of Agility",crafts:"12 aprox.",materials:["Stranglekelp × 12","Goldthorn × 12","Leaded Vial × 12"]},
    {range:"215–245",recipe:"Elixir of Defense",crafts:"54 aprox.",materials:["Wild Steelbloom × 54","Goldthorn × 54","Leaded Vial × 54"]},
    {range:"245–250",recipe:"Draught of Detect Undead",crafts:"6 aprox.",materials:["Arthas' Tears × 6","Crystal Vial × 6"]},
    {range:"250–258",recipe:"Stonescale Oil",crafts:"15",materials:["Stonescale Eel × 15","Leaded Vial × 15"]},
    {range:"258–272",recipe:"Elixir of Greater Agility",crafts:"19",materials:["Sungrass × 19","Goldthorn × 19","Crystal Vial × 19"]},
    {range:"272–300",recipe:"Draught of Detect Demon",crafts:"73",materials:["Gromsblood × 146","Crystal Vial × 73"]},
  ],
  herreria: [
    {range:"1–45",recipe:"Rough Sharpening Stone",crafts:"68 aprox.",materials:["Rough Stone × 68"]},
    {range:"45–82",recipe:"Rough Grinding Stone",crafts:"98 aprox.",materials:["Rough Stone × 196"]},
    {range:"82–95",recipe:"Copper Chain Belt",crafts:"25 aprox.",materials:["Copper Bar × 150"]},
    {range:"95–100",recipe:"Rough Bronze Leggings",crafts:"5 aprox.",materials:["Bronze Bar × 30"]},
    {range:"100–113",recipe:"Heavy Weightstone",crafts:"28 aprox.",materials:["Heavy Stone × 28"]},
    {range:"113–125",recipe:"Rough Bronze Leggings",crafts:"13 aprox.",materials:["Bronze Bar × 78"]},
    {range:"125–130",recipe:"Iron Buckle",crafts:"12 aprox.",materials:["Iron Bar × 12"]},
    {range:"130–145",recipe:"Patterned Bronze Bracers",crafts:"27 aprox.",materials:["Bronze Bar × 135","Coarse Grinding Stone × 54"]},
    {range:"145–155",recipe:"Silvered Bronze Gauntlets",crafts:"15 aprox.",materials:["Bronze Bar × 120","Silver Bar × 15","Coarse Grinding Stone × 30"]},
    {range:"155–165",recipe:"Bronze Warhammer",crafts:"12 aprox.",materials:["Bronze Bar × 96","Strong Flux × 12","Medium Leather × 12"]},
    {range:"165–175",recipe:"Green Iron Bracers",crafts:"13 aprox.",materials:["Iron Bar × 78","Green Dye × 13"]},
    {range:"175–185",recipe:"Solid Sharpening Stone",crafts:"30 aprox.",materials:["Solid Stone × 30"]},
    {range:"185–205",recipe:"Golden Scale Bracers",crafts:"39 aprox.",materials:["Steel Bar × 195","Heavy Grinding Stone × 78"]},
    {range:"205–210",recipe:"Steel Breastplate",crafts:"7 aprox.",materials:["Steel Bar × 112","Heavy Grinding Stone × 21"]},
    {range:"210–225",recipe:"Steel Plate Helm",crafts:"27 aprox.",materials:["Steel Bar × 378","Solid Grinding Stone × 27"]},
    {range:"225–230",recipe:"Mithril Coif",crafts:"6 aprox.",materials:["Mithril Bar × 60","Mageweave Cloth × 36"]},
    {range:"230–235",recipe:"Dense Sharpening Stone",crafts:"12 aprox.",materials:["Dense Stone × 12"]},
    {range:"235–248",recipe:"Heavy Mithril Boots",crafts:"37 aprox.",materials:["Mithril Bar × 518","Thick Leather × 148"]},
    {range:"248–257",recipe:"Radiant Belt",crafts:"10 aprox.",materials:["Thorium Bar × 100","Heart of Fire × 20"]},
    {range:"257–282",recipe:"Thorium Shield Spike",crafts:"31",materials:["Thorium Bar × 124","Dense Grinding Stone × 124","Essence of Earth × 62"]},
    {range:"282–294",recipe:"Radiant Boots",crafts:"15",materials:["Thorium Bar × 210","Heart of Fire × 60"]},
    {range:"294–300",recipe:"Radiant Leggings",crafts:"6",materials:["Thorium Bar × 120","Heart of Fire × 24"]},
  ],
  encantamiento: [
    {range:"1–25",recipe:"Enchant Bracer - Inferior Stamina",crafts:"31 aprox.",materials:["Mote of Magic × 31"]},
    {range:"25–90",recipe:"Enchant Bracer - Minor Deflect",crafts:"67 aprox.",materials:["Lesser Magic Essence × 67"]},
    {range:"90–119",recipe:"Enchant Chest - Minor Absorption",crafts:"51 aprox.",materials:["Lesser Magic Essence × 51"]},
    {range:"119–129",recipe:"Greater Magic Wand",crafts:"16 aprox.",materials:["Simple Wood × 16","Lesser Magic Essence × 32"]},
    {range:"129–130",recipe:"Enchant Bracer - Lesser Spirit",crafts:"1",materials:["Lesser Astral Essence × 1"]},
    {range:"130–150",recipe:"Enchant 2H Weapon - Minor Impact",crafts:"28 aprox.",materials:["Strange Dust × 28","Small Glimmering Shard × 28"]},
    {range:"150–155",recipe:"Enchant Cloak - Lesser Fire Resistance",crafts:"6 aprox.",materials:["Fire Oil × 6","Lesser Astral Essence × 6"]},
    {range:"155–170",recipe:"Enchant Bracer - Lesser Stamina",crafts:"19 aprox.",materials:["Soul Dust × 19"]},
    {range:"170–180",recipe:"Enchant Chest - Intellect",crafts:"12 aprox.",materials:["Greater Astral Essence × 12"]},
    {range:"180–200",recipe:"Enchant Boots - Lesser Agility",crafts:"28 aprox.",materials:["Soul Dust × 28"]},
    {range:"200–205",recipe:"Enchant Bracer - Strength",crafts:"6 aprox.",materials:["Vision Dust × 6"]},
    {range:"205–225",recipe:"Enchant Chest - Greater Intellect",crafts:"28 aprox.",materials:["Lesser Mystic Essence × 28"]},
    {range:"225–249",recipe:"Enchant Cloak - Greater Defense",crafts:"36 aprox.",materials:["Vision Dust × 36"]},
    {range:"249–250",recipe:"Enchant Gloves - Agility",crafts:"2 aprox.",materials:["Vision Dust × 2"]},
    {range:"250–274",recipe:"Enchant Chest - Superior Intellect",crafts:"36 aprox.",materials:["Greater Nether Essence × 36"]},
    {range:"274–285",recipe:"Enchant Boots - Agility",crafts:"29 aprox.",materials:["Greater Nether Essence × 29"]},
    {range:"285–300",recipe:"Enchant Gloves - Minor Haste",crafts:"36 aprox.",materials:["Large Radiant Shard × 36","Wildvine × 36"]},
  ],
  ingenieria: [
    {range:"1–34",recipe:"Rough Blasting Powder",crafts:"42 aprox.",materials:["Rough Stone × 42"]},
    {range:"34–45",recipe:"Rough Dynamite",crafts:"17 aprox.",materials:["Rough Blasting Powder × 17","Linen Cloth × 17"]},
    {range:"45–60",recipe:"Handful of Copper Bolts",crafts:"50 aprox.",materials:["Copper Bar × 50"]},
    {range:"60–80",recipe:"Rough Copper Bomb",crafts:"32 aprox.",materials:["Copper Bar × 32","Handful of Copper Bolts × 32","Rough Blasting Powder × 64","Linen Cloth × 32"]},
    {range:"80–85",recipe:"Copper Tube",crafts:"6 aprox.",materials:["Copper Bar × 12","Weak Flux × 6"]},
    {range:"85–93",recipe:"Coarse Blasting Powder",crafts:"15 aprox.",materials:["Coarse Stone × 15"]},
    {range:"93–95",recipe:"Copper Tube",crafts:"4 aprox.",materials:["Copper Bar × 8","Weak Flux × 4"]},
    {range:"95–108",recipe:"Copper Modulator",crafts:"17 aprox.",materials:["Handful of Copper Bolts × 34","Copper Bar × 17","Linen Cloth × 34"]},
    {range:"108–115",recipe:"Bronze Tube",crafts:"8 aprox.",materials:["Bronze Bar × 16","Weak Flux × 8"]},
    {range:"115–124",recipe:"Practice Lock",crafts:"14",materials:["Bronze Bar × 14","Handful of Copper Bolts × 28","Weak Flux × 14"]},
    {range:"124–125",recipe:"Bronze Tube",crafts:"2",materials:["Bronze Bar × 4","Weak Flux × 2"]},
    {range:"125–141",recipe:"Heavy Blasting Powder",crafts:"31 aprox.",materials:["Heavy Stone × 31"]},
    {range:"141–150",recipe:"Whirring Bronze Gizmo",crafts:"16 aprox.",materials:["Bronze Bar × 32","Wool Cloth × 16"]},
    {range:"150–159",recipe:"Aquadynamic Fish Attractor",crafts:"12 aprox.",materials:["Bronze Bar × 24","Nightcrawlers × 12","Coarse Blasting Powder × 12"]},
    {range:"159–160",recipe:"Bronze Framework",crafts:"2 aprox.",materials:["Bronze Bar × 4","Medium Leather × 2","Wool Cloth × 2"]},
    {range:"160–170",recipe:"Iron Strut",crafts:"14 aprox.",materials:["Iron Bar × 28"]},
    {range:"170–175",recipe:"Gyrochronatom",crafts:"6 aprox.",materials:["Iron Bar × 6","Gold Power Core × 6"]},
    {range:"175–188",recipe:"Solid Blasting Powder",crafts:"21 aprox.",materials:["Solid Stone × 42"]},
    {range:"188–200",recipe:"Iron Grenade",crafts:"23 aprox.",materials:["Iron Bar × 23","Heavy Blasting Powder × 23","Silk Cloth × 23"]},
    {range:"200–210",recipe:"Unstable Trigger",crafts:"12 aprox.",materials:["Mithril Bar × 12","Mageweave Cloth × 12","Solid Blasting Powder × 12"]},
    {range:"210–245",recipe:"Hi-Impact Mithril Slugs",crafts:"80",materials:["Mithril Bar × 80","Solid Blasting Powder × 80"]},
    {range:"245–250",recipe:"Mithril Gyro-Shot",crafts:"6",materials:["Mithril Bar × 12","Solid Blasting Powder × 12"]},
    {range:"250–259",recipe:"Dense Blasting Powder",crafts:"20",materials:["Dense Stone × 40"]},
    {range:"259–283",recipe:"Mithril Gyro-Shot",crafts:"95",materials:["Mithril Bar × 190","Solid Blasting Powder × 190"]},
    {range:"283–285",recipe:"Thorium Widget",crafts:"3",materials:["Thorium Bar × 9","Runecloth × 3"]},
    {range:"285–300",recipe:"Thorium Shells",crafts:"15",materials:["Thorium Bar × 30","Dense Blasting Powder × 15"]},
  ],
  peleteria: [
    {range:"1–50",recipe:"Light Armor Kit",crafts:"61 aprox.",materials:["Light Leather × 61"]},
    {range:"50–67",recipe:"Cured Light Hide",crafts:"36 aprox.",materials:["Light Hide × 36","Salt × 36"]},
    {range:"67–70",recipe:"Light Leather Quiver",crafts:"6 aprox.",materials:["Light Leather × 24","Coarse Thread × 12"]},
    {range:"70–89",recipe:"Embossed Leather Gloves",crafts:"30 aprox.",materials:["Light Leather × 90","Coarse Thread × 60"]},
    {range:"89–90",recipe:"Fine Leather Belt",crafts:"2 aprox.",materials:["Light Leather × 12","Coarse Thread × 4"]},
    {range:"90–103",recipe:"Cured Medium Hide",crafts:"28 aprox.",materials:["Medium Hide × 28","Salt × 28"]},
    {range:"103–120",recipe:"Light Leather Pants",crafts:"29 aprox.",materials:["Light Leather × 290","Cured Light Hide × 29","Fine Thread × 29"]},
    {range:"120–125",recipe:"Nimble Leather Gloves",crafts:"6 aprox.",materials:["Elixir of Minor Agility × 6","Medium Leather × 36","Fine Thread × 6"]},
    {range:"125–130",recipe:"Heavy Leather",crafts:"7 aprox.",materials:["Medium Leather × 35"]},
    {range:"130–135",recipe:"Hillman's Shoulders",crafts:"6 aprox.",materials:["Cured Medium Hide × 6","Medium Leather × 24","Fine Thread × 6"]},
    {range:"135–144",recipe:"Cured Heavy Hide",crafts:"20 aprox.",materials:["Heavy Hide × 20","Salt × 60"]},
    {range:"145–155",recipe:"Heavy Armor Kit",crafts:"14 aprox.",materials:["Heavy Leather × 70","Fine Thread × 14"]},
    {range:"155–170",recipe:"Green Leather Belt",crafts:"27 aprox.",materials:["Cured Heavy Hide × 27","Heavy Leather × 135","Fine Thread × 27","Green Dye × 27","Iron Buckle × 27"]},
    {range:"170–175",recipe:"Barbaric Shoulders",crafts:"6 aprox.",materials:["Heavy Leather × 48","Cured Heavy Hide × 6","Fine Thread × 12"]},
    {range:"175–185",recipe:"Green Leather Bracers",crafts:"10 aprox.",materials:["Cured Heavy Hide × 20","Heavy Leather × 60","Green Dye × 10","Fine Thread × 10"]},
    {range:"185–197",recipe:"Guardian Gloves",crafts:"18 aprox.",materials:["Heavy Leather × 72","Cured Heavy Hide × 18","Silken Thread × 18"]},
    {range:"197–204",recipe:"Thick Armor Kit",crafts:"10 aprox.",materials:["Thick Leather × 50","Silken Thread × 10"]},
    {range:"204–218",recipe:"Nightscape Headband",crafts:"38",materials:["Thick Leather × 190","Silken Thread × 76"]},
    {range:"218–220",recipe:"Guardian Leather Bracers",crafts:"3",materials:["Heavy Leather × 18","Cured Heavy Hide × 6","Silken Thread × 3"]},
    {range:"220–225",recipe:"Thick Leather Ammo Pouch",crafts:"6",materials:["Thick Leather × 60","Cured Thick Hide × 6","Elixir of Defense × 6","Silken Thread × 36"]},
    {range:"225–233",recipe:"Cured Rugged Hide",crafts:"15",materials:["Rugged Hide × 15","Refined Deeprock Salt × 15"]},
    {range:"233–242",recipe:"Rugged Armor Kit",crafts:"26",materials:["Rugged Leather × 130"]},
    {range:"242–247",recipe:"Turtle Scale Breastplate",crafts:"18",materials:["Thick Leather × 108","Turtle Scale × 216","Heavy Silken Thread × 18"]},
    {range:"247–253",recipe:"Helm of Fire",crafts:"8",materials:["Thick Leather × 320","Heart of Fire × 64","Core of Earth × 32","Cured Thick Hide × 16","Heavy Silken Thread × 32"]},
    {range:"253–282",recipe:"Scarlet Infiltrator’s Bracers",crafts:"37",materials:["Rugged Leather × 296"]},
    {range:"282–285",recipe:"Masterwork Volcanic Leggings",crafts:"3",materials:["Rugged Leather × 18","Essence of Fire × 3","Core of Earth × 3","Rune Thread × 3"]},
    {range:"285–294",recipe:"Gordok Ogre Suit",crafts:"20",materials:["Rugged Leather × 80","Bolt of Runecloth × 40","Ogre Tannin × 20","Rune Thread × 20"]},
    {range:"294–300",recipe:"Blue Suede Bracers",crafts:"7",materials:["Rugged Leather × 70","Rune Thread × 7","Blue Dye × 7"]},
  ],
  sastreria: [
    {range:"1–38",recipe:"Bolt of Linen Cloth",crafts:"42 aprox.",materials:["Linen Cloth × 84"]},
    {range:"38–45",recipe:"Simple Linen Pants",crafts:"8 aprox.",materials:["Bolt of Linen Cloth × 8","Coarse Thread × 8"]},
    {range:"45–52",recipe:"Brown Linen Vest",crafts:"9 aprox.",materials:["Bolt of Linen Cloth × 9","Coarse Thread × 9"]},
    {range:"52–80",recipe:"Linen Belt",crafts:"64 aprox.",materials:["Bolt of Linen Cloth × 64","Coarse Thread × 64"]},
    {range:"80–110",recipe:"Woolen Cape",crafts:"66 aprox.",materials:["Bolt of Woolen Cloth × 66","Fine Thread × 66"]},
    {range:"110–132",recipe:"Double-stitched Woolen Shoulders",crafts:"34 aprox.",materials:["Bolt of Woolen Cloth × 102","Fine Thread × 68"]},
    {range:"132–145",recipe:"Gloves of Meditation",crafts:"25 aprox.",materials:["Bolt of Woolen Cloth × 100","Fine Thread × 75","Elixir of Wisdom × 25"]},
    {range:"145–149",recipe:"Bolt of Mageweave",crafts:"7 aprox.",materials:["Mageweave Cloth × 35"]},
    {range:"149–150",recipe:"Small Silk Pack",crafts:"2 aprox.",materials:["Bolt of Silk Cloth × 6","Heavy Leather × 4","Fine Thread × 6"]},
    {range:"150–155",recipe:"Red Swashbuckler's Shirt",crafts:"7 aprox.",materials:["Bolt of Silk Cloth × 21","Red Dye × 14","Silken Thread × 7"]},
    {range:"155–170",recipe:"Earthen Vest",crafts:"21 aprox.",materials:["Bolt of Silk Cloth × 63","Elemental Earth × 21","Fine Thread × 42"]},
    {range:"170–180",recipe:"Crimson Silk Vest",crafts:"14 aprox.",materials:["Bolt of Silk Cloth × 56","Red Dye × 28","Fine Thread × 28"]},
    {range:"180–185",recipe:"Crimson Silk Pantaloons",crafts:"6 aprox.",materials:["Bolt of Silk Cloth × 24","Red Dye × 12","Silken Thread × 12"]},
    {range:"185–190",recipe:"Orange Mageweave Shirt",crafts:"7 aprox.",materials:["Bolt of Mageweave × 7","Orange Dye × 7","Heavy Silken Thread × 7"]},
    {range:"190–205",recipe:"Earthen Vest",crafts:"21 aprox.",materials:["Bolt of Silk Cloth × 63","Elemental Earth × 21","Fine Thread × 42"]},
    {range:"205–210",recipe:"Long Silken Cloak",crafts:"6 aprox.",materials:["Bolt of Silk Cloth × 24","Mana Potion × 6","Silken Thread × 6"]},
    {range:"210–213",recipe:"Bolt of Runecloth",crafts:"4 aprox.",materials:["Runecloth × 20"]},
    {range:"213–220",recipe:"Long Silken Cloak",crafts:"12 aprox.",materials:["Bolt of Silk Cloth × 48","Mana Potion × 12","Silken Thread × 12"]},
    {range:"220–248",recipe:"Black Mageweave Vest",crafts:"75 aprox.",materials:["Bolt of Mageweave × 150","Silken Thread × 225"]},
    {range:"248–285",recipe:"Mooncloth",crafts:"43",materials:["Felcloth × 86"]},
    {range:"285–294",recipe:"Gordok Ogre Suit",crafts:"20",materials:["Bolt of Runecloth × 40","Rugged Leather × 80","Ogre Tannin × 20","Rune Thread × 20"]},
    {range:"294–300",recipe:"Mooncloth Boots",crafts:"10",materials:["Bolt of Runecloth × 60","Mooncloth × 40","Black Pearl × 20","Rune Thread × 10"]},
  ],
  cocina: [
    {range:"1–82",recipe:"Charred Wolf Meat",crafts:"142 aprox.",materials:["Stringy Wolf Meat × 142"]},
    {range:"82–87",recipe:"Spiced Wolf Meat",crafts:"36 aprox.",materials:["Stringy Wolf Meat × 36","Mild Spices × 36"]},
    {range:"87–90",recipe:"Smoked Bear Meat",crafts:"4 aprox.",materials:["Bear Meat × 4"]},
    {range:"90–115",recipe:"Coyote Steak",crafts:"39 aprox.",materials:["Coyote Meat × 39"]},
    {range:"115–142",recipe:"Crab Cake",crafts:"44 aprox.",materials:["Crawler Meat × 44","Mild Spices × 44"]},
    {range:"142–156",recipe:"Dry Pork Ribs",crafts:"57 aprox.",materials:["Boar Ribs × 57","Mild Spices × 57"]},
    {range:"156–165",recipe:"Lean Wolf Steak",crafts:"9 aprox.",materials:["Lean Wolf Flank × 9","Mild Spices × 9"]},
    {range:"165–191",recipe:"Goblin Deviled Clams",crafts:"42 aprox.",materials:["Tangy Clam Meat × 42","Hot Spices × 42"]},
    {range:"191–215",recipe:"Plain Ol' Paletusk",crafts:"30 aprox.",materials:["Chunk of Boar Meat × 60","Mild Spices × 30"]},
    {range:"215–241",recipe:"Goldthorn Tea",crafts:"42 aprox.",materials:["Goldthorn × 42","Refreshing Spring Water × 42"]},
    {range:"241–271",recipe:"Spider Sausage",crafts:"57 aprox.",materials:["White Spider Meat × 114"]},
    {range:"271–300",recipe:"Poached Sunscale Salmon",crafts:"31 aprox.",materials:["Raw Sunscale Salmon × 31"]},
  ],
  "primeros-auxilios": [
    {range:"1–50",recipe:"Linen Bandage",crafts:"61 aprox.",materials:["Linen Cloth × 61"]},
    {range:"50–80",recipe:"Heavy Linen Bandage",crafts:"46 aprox.",materials:["Linen Cloth × 92"]},
    {range:"80–129",recipe:"Wool Bandage",crafts:"84 aprox.",materials:["Wool Cloth × 84"]},
    {range:"129–150",recipe:"Heavy Wool Bandage",crafts:"33 aprox.",materials:["Wool Cloth × 66"]},
    {range:"150–208",recipe:"Silk Bandage",crafts:"191 aprox.",materials:["Silk Cloth × 191"]},
    {range:"208–210",recipe:"Heavy Silk Bandage",crafts:"4 aprox.",materials:["Silk Cloth × 8"]},
    {range:"210–240",recipe:"Mageweave Bandage",crafts:"42 aprox.",materials:["Mageweave Cloth × 42"]},
    {range:"240–260",recipe:"Heavy Mageweave Bandage",crafts:"25 aprox.",materials:["Mageweave Cloth × 50"]},
    {range:"260–300",recipe:"Runecloth Bandage",crafts:"65 aprox.",materials:["Runecloth × 65"]},
  ],
};
const gatheringPlans: Record<string, Record<string, string[]>> = {
  herboristeria: {
    "1–75": ["Recolecta Peacebloom, Silverleaf y Earthroot en zonas iniciales.", "Entrena la habilidad al llegar al límite del rango.", "No abandones un nodo si aparece como demasiado difícil; vuelve cuando suba la habilidad."],
    "75–150": ["Busca Briarthorn, Mageroyal y Bruiseweed en zonas de nivel bajo-intermedio.", "Añade Stranglekelp en costas y zonas acuáticas cuando tu habilidad lo permita.", "Prioriza rutas circulares con varios puntos de aparición."],
    "150–225": ["Progresa hacia Liferoot, Kingsblood, Fadeleaf y Goldthorn.", "Ajusta la zona según el requisito de habilidad que muestre el nodo.", "Lleva espacio libre en bolsas para evitar interrupciones."],
    "225–300": ["Busca hierbas de nivel alto como Sungrass, Dreamfoil, Mountain Silversage e Icecap cuando puedas recolectarlas.", "Contrasta el requisito del nodo en el cliente de Forever.", "Combina el recorrido con Minería solo si no reduce demasiado el ritmo de recolección."],
  },
  mineria: {
    "1–75": ["Extrae Cobre y recoge Rough Stone.", "Funde las menas si la receta de fundición te da habilidad en tu versión.", "Entrena al alcanzar el límite del rango."],
    "75–150": ["Progresa a Estaño y después Hierro según la habilidad requerida por el filón.", "Guarda las piedras para Herrería e Ingeniería.", "Funde las menas cuando sea útil y tengas acceso a una forja."],
    "150–225": ["Busca Mithril y después pequeñas cantidades de Truesilver o Gold cuando estén disponibles.", "Elige zonas con recorridos de filones conectados y baja competencia.", "Comprueba la habilidad requerida antes de planificar una ruta larga."],
    "225–300": ["Progresa hacia Small Thorium Veins y Rich Thorium Veins cuando tu habilidad lo permita.", "Reserva Dense Stone y Thorium para recetas de fabricación.", "Las ubicaciones de filones son variables; registra los recorridos que funcionen en tu servidor."],
  },
  desuello: {
    "1–75": ["Desuella bestias de nivel bajo hasta que dejen de otorgar habilidad.", "Lleva un cuchillo de desuello en las bolsas.", "No podrás desollar criaturas que no cumplan el requisito de nivel/habilidad."],
    "75–150": ["Avanza a bestias de nivel medio y comprueba el tipo de cuero que sueltan.", "Combina el recorrido con Peletería para aprovechar los materiales.", "Evita zonas con poca densidad de criaturas."],
    "150–225": ["Busca criaturas que proporcionen Heavy Leather y después Thick Leather.", "Prioriza áreas con reaparición rápida y muchos objetivos desollables.", "Guarda pellejos raros para recetas que los requieran."],
    "225–300": ["Avanza a criaturas de nivel alto que proporcionen Rugged Leather y pellejos asociados.", "Comprueba el requisito del objetivo antes de invertir tiempo en la zona.", "Ajusta la ruta según densidad de criaturas y competencia."],
  },
  pesca: {
    "1–75": ["Pesca en aguas de zonas iniciales y practica hasta que las capturas sean consistentes.", "Utiliza una caña y cebo si lo tienes disponible.", "Entrena la habilidad cuando alcances el límite del rango."],
    "75–150": ["Desplázate a zonas de nivel intermedio y prueba aguas costeras y continentales.", "Usa cebos para reducir capturas fallidas si tu habilidad es baja para la zona.", "Guarda peces para subir Cocina."],
    "150–225": ["Progresa en zonas con peces de nivel medio-alto y ajusta la habilidad con cebos.", "Alterna entre pesca y Cocina si quieres aprovechar las capturas.", "Comprueba si las zonas tienen requisito específico de habilidad."],
    "225–300": ["Pesca en zonas de nivel alto y utiliza cebos de habilidad cuando sea necesario.", "Guarda peces raros y los ingredientes solicitados por recetas de Cocina.", "La progresión depende de los intentos y de la zona; no existe una cantidad fija de lanzamientos garantizada."],
  },
};

function ProfessionDetailPage({ profession }: { profession: ProfessionInfo }) {
  const Icon = profession.icon;
  const guide = professionGuides[profession.slug];
  const officialProfessionUrl = `https://warcraftforever.games/es/professions/${profession.sourceSlug}`;
  const officialLevelingUrl = "https://warcraftforever.games/es/guides/profession-leveling";
  const guideSources = [
    { label: `Catálogo de ${profession.name} en Warcraft Forever`, url: officialProfessionUrl },
    { label: "Guía de progresión y materiales de Warcraft Forever", url: officialLevelingUrl },
    { label: "Comparativa de rutas de profesiones de la beta", url: "https://metammo.com/wow-forever/professions" },
  ];
  return <div className="site-shell"><ProfessionHeader /><main className="profession-page">
    <section className={`profession-hero alchemy-hero profession-hero-${profession.slug}`}><div className="profession-backdrop"/><div className="profession-hero-content"><a className="profession-breadcrumb" href="/profesiones">Profesiones <span>/</span> {profession.name}</a><div className="section-kicker">GUÍA LOCAL · WARCRAFT FOREVER</div><h1><em>{profession.name}</em>{profession.hasCraftingRoute ? " 1–300" : " · guía"}</h1><p>{profession.description} Guía organizada para consultar la preparación, progresión y particularidades de Forever sin salir de Pacto Escarlata.</p><div className="alchemy-tags"><span><BookOpen size={14}/> {guide.routeType}</span><span><Icon size={14}/> Contenido local</span></div></div></section>
    <section className="profession-content alchemy-content"><div className="section-kicker">PLAN DE PROFESIÓN</div><h2>{profession.hasCraftingRoute ? `Cómo subir ${profession.name} del 1 al 300` : `Cómo progresar en ${profession.name}`}</h2><p className="alchemy-intro">{guide.objective}</p>
      <div className="guide-local-grid"><article className="guide-local-panel"><div className="guide-panel-heading"><BookOpen size={19}/><h3>Antes de empezar</h3></div><ul>{guide.preparation.map((item,i)=><li key={i}>{item}</li>)}</ul></article><article className="guide-local-panel"><div className="guide-panel-heading"><Shield size={19}/><h3>Consejos prácticos</h3></div><ul>{guide.tips.map((item,i)=><li key={i}>{item}</li>)}</ul></article></div>
      <div className="guide-route-heading"><div className="section-kicker">PROGRESIÓN</div><h2>{profession.hasCraftingRoute ? "Tramos de habilidad" : "Ruta de recolección"}</h2><p>En las profesiones de fabricación y secundarias verás una tabla con habilidad, receta, número de fabricaciones y materiales. En las de recolección, cada tramo incluye objetivos y orientación de zonas.</p></div>
      <div className="guide-route-list">{guide.progression.map((step,i)=>{ const plan = stagePlans[profession.slug]?.[i]; const recipes = verifiedCraftRoutes[profession.slug]?.filter((row)=>{ const start=Number(row.range.split("–")[0]); return i===0 ? start<75 : i===1 ? start>=75 && start<150 : i===2 ? start>=150 && start<225 : start>=225; }) || []; const gather = gatheringPlans[profession.slug]?.[step.range] || []; return <details className="guide-route-step" key={step.range}><summary className="guide-route-summary"><span className="guide-route-number">{String(i+1).padStart(2,"0")}</span><span className="guide-route-copy"><span className="guide-route-meta">{step.range}</span><span className="guide-route-step-title">{step.title}</span></span><span className="guide-route-toggle" aria-hidden="true"/></summary><div className="guide-route-details">{profession.hasCraftingRoute ? <><h4>Habilidad, receta y materiales</h4>{recipes.length ? <div className="guide-recipe-table-wrap"><table className="guide-recipe-table"><thead><tr><th>Habilidad</th><th>Receta</th><th>Veces</th><th>Materiales</th></tr></thead><tbody>{recipes.map((row,j)=><tr key={`${row.range}-${row.recipe}-${j}`}><td>{row.range}</td><td>{row.recipe}</td><td>{row.crafts}</td><td><ul>{row.materials.map((mat,k)=><li key={k}>{mat}</li>)}</ul></td></tr>)}</tbody></table></div> : <p>No hay pasos cargados para este tramo en esta versión.</p>}<p className="guide-route-note">Las cantidades son estimaciones de una ruta de referencia basada en datos de la beta de WoW Forever. Las recetas amarillas o verdes pueden requerir fabricaciones adicionales; confirma los requisitos en el cliente antes de comprar.</p></> : <><h4>Ruta de recolección</h4><ul>{gather.map((item,j)=><li key={j}>{item}</li>)}</ul><p className="guide-route-note">La habilidad que otorga cada nodo y su ubicación pueden variar; confirma el requisito en el juego. Las zonas son orientación general, no coordenadas exactas.</p></>}{plan && <><h4>Comprobaciones del tramo</h4><ul>{plan.checklist.slice(0,2).map((item,j)=><li key={j}>{item}</li>)}</ul><h4>Antes de avanzar</h4><p>{plan.exit}</p></>}</div></details>})}</div>
      <section className="guide-forever"><div className="section-kicker">PARTICULARIDADES DE FOREVER</div><h2>Qué debes tener en cuenta</h2><ul>{guide.forever.map((item,i)=><li key={i}>{item}</li>)}</ul></section>
      <div className="guide-caution"><strong>Sobre materiales y cantidades</strong><p>Las rutas de fabricación se han contrastado con rutas publicadas a partir del cliente beta de WoW Forever (build 1.60.1.70205). Los recuentos son estimaciones de referencia: recetas amarillas/verdes pueden requerir más intentos y la beta puede cambiar. Las rutas de recolección son orientación por rangos, no un mapa de nodos con coordenadas verificadas.</p></div>
      <div className="alchemy-source"><strong>Fuentes consultadas</strong><p>Las notas de Forever y las rutas de beta se usan para distinguir los cambios documentados de las recomendaciones generales.</p>{guideSources.map((source)=><a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label} <ExternalLink size={14}/></a>)}<small>Revisión de la estructura local: 23/10/2026. Los datos del juego pueden cambiar durante la beta.</small></div>
      <a className="profession-back-link" href="/profesiones"><ArrowRight size={15}/> Volver a todas las profesiones</a>
    </section></main><ProfessionFooter /></div>;
}

function TalentCalculatorPage() {
  return <div className="site-shell">
    <ProfessionHeader />
    <main className="profession-page talent-page">
      <section className="profession-hero talent-hero">
        <div className="profession-backdrop" />
        <div className="profession-hero-content">
          <a className="profession-breadcrumb" href="/">Pacto Escarlata <span>/</span> Talentos</a>
          <div className="section-kicker"><BrainCircuit size={15} /> HERRAMIENTA DE LA HERMANDAD</div>
          <h1>Calculadora de <em>talentos</em></h1>
          <p>Planifica tu build de WoW Forever directamente en Pacto Escarlata, sin iframes.</p>
        </div>
      </section>
      <section className="talent-content">
        <TalentCalculator />
        <a className="profession-back-link" href="/"><ArrowRight size={15}/> Volver a Pacto Escarlata</a>
      </section>
    </main>
    <ProfessionFooter />
  </div>;
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return <AdminApp />;
  if (path === "/grupos") return <DungeonGroupsPage />;
  if (path === "/talentos") return <TalentCalculatorPage />;
  if (path === "/profesiones") return <ProfessionsPage />;
  const professionMatch = path.match(/^\/profesiones\/([^/]+)$/);
  if (professionMatch) { const profession = professionList.find(item => item.slug === professionMatch[1]); if (profession) return <ProfessionDetailPage profession={profession} />; }
  return <PublicSite />;
}

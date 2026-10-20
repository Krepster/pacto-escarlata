
import { useEffect, useState } from "react";
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

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://pacto-escarlata.cosimonepones27.workers.dev/api"
).replace(/\/$/, "");

type EventItem = {
  id: number;
  title: string;
  type: string;
  starts_at: string;
  description: string | null;
};

function App() {
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

export default App;

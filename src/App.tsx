import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Crown, ExternalLink, Menu, Shield, Swords, Users, X } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8787/api").replace(/\/$/, "");
type EventItem = { id: number; title: string; type: string; starts_at: string; description: string | null };

const fallbackEvents: EventItem[] = [
  { id: 1, title: "Noche de mazmorras", type: "PvE", starts_at: "2026-10-23T20:30:00+02:00", description: "Formamos grupos según nivel y objetivos." },
  { id: 2, title: "Jornada de hermandad", type: "Social", starts_at: "2026-10-24T21:00:00+02:00", description: "Conocernos, ayudar a miembros y preparar objetivos." },
  { id: 3, title: "Campo de batalla", type: "PvP", starts_at: "2026-10-25T20:00:00+02:00", description: "Organización de grupos y juego en equipo." },
];

function App() {
  const [events, setEvents] = useState<EventItem[]>(fallbackEvents);
  const [apiOnline, setApiOnline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE.replace(/\/api$/, "")}/health`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));

    fetch(`${API_BASE}/events`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: unknown) => {if (Array.isArray(data) && data.length) {setEvents(data as EventItem[]);}})
      .catch(() => undefined);
    }, []);

  const closeMenu = () => setMenuOpen(false);
  const dateLabel = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString("es-ES", { weekday: "short", hour: "2-digit", minute: "2-digit" }).toUpperCase();
  };

  return <div className="site-shell">
    <div className="topline"><span className="topline-dot" /> HERMANDAD DE LA ALIANZA <span className="topline-divider">/</span> WOW FOREVER · PVE NORMAL</div>
    <header className="header">
      <a className="brand" href="#inicio" onClick={closeMenu} aria-label="Pacto Escarlata, inicio">
        <span className="brand-mark"><Shield size={28} strokeWidth={1.6} /><span>✠</span></span>
        <span className="brand-copy"><strong>PACTO <em>ESCARLATA</em></strong><small>UNIDOS POR AZEROTH</small></span>
      </a>
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? "nav nav-open" : "nav"}>
        <a href="#hermandad" onClick={closeMenu}>La hermandad</a><a href="#actividades" onClick={closeMenu}>Actividades</a><a href="#reclutamiento" onClick={closeMenu}>Reclutamiento</a>
        <a className="nav-cta" href="#reclutamiento" onClick={closeMenu}>Únete al pacto <ArrowRight size={15} /></a>
      </nav>
    </header>
    <main>
      <section className="hero" id="inicio"><div className="hero-backdrop" /><div className="hero-content">
        <div className="eyebrow"><span /> ALIANZA · WOW FOREVER <span /></div>
        <h1>La fuerza nace<br />de <em>nuestro pacto.</em></h1>
        <p className="hero-lede">Una hermandad. Muchas leyendas. Un mismo estandarte.</p>
        <p className="hero-text">Aventuras PvE, desafíos PvP y una comunidad que siempre tiene un lugar para los suyos. Forjamos nuestra historia juntos, dentro y fuera de Azeroth.</p>
        <div className="hero-actions"><a className="button button-gold" href="#reclutamiento">Solicitar ingreso <ArrowRight size={17} /></a><a className="button button-outline" href="#hermandad">Descubrir la hermandad</a></div>
        <div className="hero-note"><Shield size={16} /> HONOR · LEALTAD · HERMANDAD</div>
      </div><div className="hero-side-mark"><span>FOR THE ALLIANCE</span><div className="side-line" /><Shield size={33} /></div><div className="hero-bottom"><span>EST. IN AZEROTH</span><span>01 — 03</span></div></section>

      <section className="intro section-wrap" id="hermandad"><div className="section-kicker">01 / QUIÉNES SOMOS</div>
        <div className="intro-grid"><div><h2>Unidos por algo<br /><em>más grande.</em></h2></div><div className="intro-copy"><p>Pacto Escarlata es una hermandad de la Alianza en WoW Forever, construida alrededor del compañerismo, el progreso y las ganas de disfrutar del juego en equipo.</p><p>Ya vengas a conquistar mazmorras, organizarte para PvP o encontrar compañeros para tus aventuras, aquí tu historia también cuenta.</p></div></div>
        <div className="values-grid"><article className="value-card"><Swords /><span>01</span><h3>Progresión</h3><p>Avanzamos juntos, aprendiendo y mejorando en cada encuentro.</p></article><article className="value-card"><Shield /><span>02</span><h3>Lealtad</h3><p>Respeto, cooperación y apoyo entre todos los miembros.</p></article><article className="value-card"><Users /><span>03</span><h3>Comunidad</h3><p>Un lugar para compartir aventuras y crear nuevas amistades.</p></article></div>
      </section>

      <section className="events-section" id="actividades"><div className="section-wrap"><div className="section-kicker">02 / EN EL HORIZONTE</div>
        <div className="section-heading"><div><h2>Nuestras <em>actividades</em></h2><p>Siempre hay una nueva aventura por comenzar.</p></div><span className="heading-sigil"><CalendarDays size={28} /></span></div>
        <div className="events-grid">{events.map(event => <article className="event-card" key={event.id}><div className="event-top"><span>{event.type}</span><span>{dateLabel(event.starts_at)}</span></div><h3>{event.title}</h3><p>{event.description || "Actividad de hermandad."}</p><div className="event-foot"><span>ACTIVIDAD DE HERMANDAD</span><CalendarDays size={16} /></div></article>)}</div>
        {!apiOnline && <p className="demo-note">Mostrando datos de ejemplo hasta que la API esté publicada y conectada.</p>}
      </div></section>

      <section className="join-section section-wrap" id="reclutamiento"><div className="join-panel"><div className="join-ornament"><Crown size={35} /></div><div className="section-kicker">03 / TU HISTORIA CONTINÚA AQUÍ</div><h2>El pacto está abierto.<br /><em>¿Te unes?</em></h2><p>Buscamos aventureros con ganas de colaborar, compartir y construir una gran hermandad. Tu clase y tu experiencia no definen tu valor: lo hace tu actitud.</p><a className="button button-gold" href="https://discord.com/" target="_blank" rel="noreferrer">Contactar por Discord <ExternalLink size={16} /></a><small>Enlace provisional: sustituir por la invitación oficial de la hermandad.</small></div></section>
    </main>
    <footer className="footer"><a className="brand footer-brand" href="#inicio"><span className="brand-mark"><Shield size={23} /><span>✠</span></span><span className="brand-copy"><strong>PACTO <em>ESCARLATA</em></strong><small>UNIDOS POR AZEROTH</small></span></a><p>Por la Alianza. Por la hermandad. Por el pacto.</p><div className="api-status"><span className={apiOnline ? "status-dot online" : "status-dot"} /> API {apiOnline ? "conectada" : "en preparación"}</div><small className="legal">Proyecto comunitario no oficial. World of Warcraft y sus marcas pertenecen a sus respectivos propietarios.</small></footer>
  </div>;
}
export default App;

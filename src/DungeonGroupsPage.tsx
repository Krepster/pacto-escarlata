import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, Check, Clipboard, Crown, RefreshCw, Search, Shield, Swords, Users, X } from "lucide-react";
import "./dungeon-groups.css";

type GroupStatus = "recruiting" | "full" | "in_progress" | "completed" | "cancelled";
type Role = "tank" | "healer" | "dps";
type DungeonGroup = {
  id: string; title: string; dungeon_name: string; creator_name: string; description: string;
  min_level: number; max_level: number; starts_at: string; timezone: string;
  tank_slots: number; healer_slots: number; dps_slots: number; status: GroupStatus;
  tanks_filled: number; healers_filled: number; dps_filled: number; created_at: string;
};
type Application = { id: string; character_name: string; class_name: string; level: number; role: Role; note: string; contact: string; status: string; created_at: string };
type ManageData = { group: DungeonGroup; applications: Application[] };
const API = "/api/dungeon-groups";
const DUNGEONS = ["Cavernas de los Lamentos", "Las Minas de la Muerte", "Castillo de Colmillo Oscuro", "Prisión de Ventormenta", "Las Mazmorras", "Gnomeregan", "Monasterio Escarlata", "Uldaman", "Zul'Farrak", "Maraudon", "Templo de Atal'Hakkar", "Profundidades de Roca Negra", "Cumbre de Roca Negra", "Stratholme", "Scholomance", "Otra mazmorra"];
const CLASSES = ["Guerrero", "Paladín", "Cazador", "Pícaro", "Sacerdote", "Chamán", "Mago", "Brujo", "Druida"];
const roleLabel = (role: string) => role === "tank" ? "Tanque" : role === "healer" ? "Sanador" : "DPS";
const statusLabel = (status: string) => ({ recruiting: "Buscando jugadores", full: "Grupo completo", in_progress: "En curso", completed: "Completado", cancelled: "Cancelado", pending: "Pendiente", accepted: "Aceptada", rejected: "Rechazada" } as Record<string,string>)[status] ?? status;
const localDateValue = () => { const date = new Date(Date.now() + 60 * 60 * 1000); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0,16); };
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
  return data as T;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="dg-field"><span>{label}</span>{children}</label>; }

export default function DungeonGroupsPage() {
  const [groups, setGroups] = useState<DungeonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDungeon, setSelectedDungeon] = useState("Todas las mazmorras");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createBusy, setCreateBusy] = useState(false);
  const [applyGroup, setApplyGroup] = useState<DungeonGroup | null>(null);
  const [applyBusy, setApplyBusy] = useState(false);
  const [manageId, setManageId] = useState("");
  const [manageToken, setManageToken] = useState("");
  const [manageData, setManageData] = useState<ManageData | null>(null);
  const [manageBusy, setManageBusy] = useState(false);
  const [manageError, setManageError] = useState("");
  const [createdLink, setCreatedLink] = useState("");
  const [form, setForm] = useState({ title: "", dungeon_name: DUNGEONS[0], creator_name: "", description: "", min_level: "18", max_level: "25", starts_at: localDateValue(), tank_slots: "1", healer_slots: "1", dps_slots: "3" });
  const [appForm, setAppForm] = useState({ character_name: "", class_name: CLASSES[0], level: "20", role: "dps" as Role, note: "", contact: "" });

  const loadGroups = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ status: "recruiting" });
      if (selectedDungeon !== "Todas las mazmorras") query.set("dungeon", selectedDungeon);
      const data = await request<DungeonGroup[]>(`${API}?${query}`);
      setGroups(data);
    } catch (e) { setError(e instanceof Error ? e.message : "No se han podido cargar los grupos."); }
    finally { setLoading(false); }
  }, [selectedDungeon]);

  useEffect(() => { void loadGroups(); }, [loadGroups]);
  useEffect(() => {
    const match = window.location.hash.match(/^#gestionar=([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
    if (match) { setManageId(match[1]); setManageToken(match[2]); window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`); }
  }, []);
  useEffect(() => { if (manageId && manageToken) void loadManagement(manageId, manageToken); }, [manageId, manageToken]);

  async function loadManagement(id = manageId, token = manageToken) {
    setManageBusy(true); setManageError("");
    try { setManageData(await request<ManageData>(`${API}/${id}/manage`, { headers: { "X-Group-Management-Token": token } })); }
    catch (e) { setManageError(e instanceof Error ? e.message : "No se ha podido abrir la gestión."); setManageData(null); }
    finally { setManageBusy(false); }
  }
  async function copyManagementLink() {
    if (!createdLink) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(createdLink);
      } else {
        throw new Error("Clipboard API no disponible en este contexto");
      }
      setNotice("Enlace privado copiado al portapapeles. Guárdalo: permite gestionar tu grupo.");
    } catch {
      // Fallback para navegadores/contextos donde Clipboard API no está disponible.
      try {
        const input = document.createElement("textarea");
        input.value = createdLink;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        input.style.pointerEvents = "none";
        document.body.appendChild(input);
        input.focus();
        input.select();
        input.setSelectionRange(0, input.value.length);
        const copied = document.execCommand("copy");
        document.body.removeChild(input);
        if (!copied) throw new Error("El navegador no permitió copiar el enlace");
        setNotice("Enlace privado copiado al portapapeles. Guárdalo: permite gestionar tu grupo.");
      } catch {
        setNotice("No se pudo copiar automáticamente. Selecciona el enlace del campo y cópialo manualmente.");
      }
    }
  }
  const visibleGroups = useMemo(() => groups.filter(g => roleFilter === "all" || (roleFilter === "tank" ? g.tanks_filled < g.tank_slots : roleFilter === "healer" ? g.healers_filled < g.healer_slots : g.dps_filled < g.dps_slots)), [groups, roleFilter]);
  async function createGroup(event: React.FormEvent) {
    event.preventDefault(); setCreateBusy(true); setError(""); setNotice("");
    try {
      const result = await request<{ group_id: string; management_token: string }>(API, { method: "POST", body: JSON.stringify({ ...form, min_level: Number(form.min_level), max_level: Number(form.max_level), tank_slots: Number(form.tank_slots), healer_slots: Number(form.healer_slots), dps_slots: Number(form.dps_slots), starts_at: new Date(form.starts_at).toISOString() }) });
      const link = `${window.location.origin}/grupos#gestionar=${result.group_id}.${result.management_token}`;
      setCreatedLink(link); setManageId(result.group_id); setManageToken(result.management_token); setShowCreate(false); setNotice("Grupo publicado. Guarda el enlace privado de gestión; no podremos recuperarlo si lo pierdes."); await loadGroups();
    } catch (e) { setError(e instanceof Error ? e.message : "No se ha podido crear el grupo."); }
    finally { setCreateBusy(false); }
  }
  async function applyToGroup(event: React.FormEvent) {
    event.preventDefault(); if (!applyGroup) return; setApplyBusy(true); setNotice(""); setError("");
    try { await request(`${API}/${applyGroup.id}/applications`, { method: "POST", body: JSON.stringify({ ...appForm, level: Number(appForm.level) }) }); setNotice("Solicitud enviada. El creador tendrá que aceptarla."); setApplyGroup(null); setAppForm({ character_name: "", class_name: CLASSES[0], level: String(appForm.level), role: "dps", note: "", contact: "" }); }
    catch (e) { setError(e instanceof Error ? e.message : "No se ha podido enviar la solicitud."); }
    finally { setApplyBusy(false); }
  }
  async function decide(applicationId: string, action: "accept" | "reject") {
    try { await request(`${API}/${manageId}/applications/${applicationId}/${action}`, { method: "POST", headers: { "X-Group-Management-Token": manageToken }, body: "{}" }); await loadManagement(); await loadGroups(); }
    catch (e) { setManageError(e instanceof Error ? e.message : "No se ha podido actualizar la solicitud."); }
  }
  async function changeStatus(status: "in_progress" | "completed" | "cancelled") {
    try { await request(`${API}/${manageId}/status`, { method: "POST", headers: { "X-Group-Management-Token": manageToken }, body: JSON.stringify({ status }) }); await loadManagement(); await loadGroups(); }
    catch (e) { setManageError(e instanceof Error ? e.message : "No se ha podido cambiar el estado."); }
  }
  const formatDate = (date: string) => new Date(date).toLocaleString("es-ES", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return <main className="dungeon-page">
    <div className="dg-topline"><span /> HERRAMIENTA COMUNITARIA · WOW FOREVER</div>
    <header className="dg-header"><a className="dg-brand" href="/"><Shield size={28}/><span>PACTO <b>ESCARLATA</b><small>BUSCADOR DE GRUPOS</small></span></a><nav><a href="/">Volver a la web</a><button className="dg-button dg-button-outline" onClick={() => { setShowCreate(!showCreate); setNotice(""); }}> <Swords size={16}/> Crear grupo</button></nav></header>
    <section className="dg-hero"><div className="dg-kicker">ALIANZA · PVE · COMUNIDAD ABIERTA</div><h1>Encuentra tu <em>grupo</em></h1><p>Organiza una mazmorra, encuentra compañeros y completa tu grupo. No necesitas una cuenta ni pertenecer a la hermandad.</p><div className="dg-hero-stats"><span><Users size={16}/> {groups.length} grupos buscando jugadores</span><span><Shield size={16}/> Solicitudes revisadas por el creador</span></div></section>
    <section className="dg-content">
      {notice && <div className="dg-notice"><Check size={17}/><div>{notice}{createdLink && <div className="dg-created-link"><input readOnly value={createdLink}/><button type="button" onClick={() => void copyManagementLink()}><Clipboard size={15}/> Copiar enlace privado</button></div>}</div></div>}
      {error && <div className="dg-alert"><X size={17}/>{error}</div>}
      {showCreate && <form className="dg-panel dg-form" onSubmit={createGroup}><div className="dg-panel-heading"><div><span className="dg-kicker">NUEVA ACTIVIDAD</span><h2>Crear un grupo</h2></div><button type="button" className="dg-icon-button" onClick={() => setShowCreate(false)} aria-label="Cerrar"><X/></button></div><div className="dg-form-grid">
        <Field label="Título del grupo"><input required minLength={3} maxLength={100} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ej. Monasterio Escarlata — Catedral"/></Field>
        <Field label="Mazmorra"><select value={form.dungeon_name} onChange={e=>setForm({...form,dungeon_name:e.target.value})}>{DUNGEONS.map(d=><option key={d}>{d}</option>)}</select></Field>
        <Field label="Nombre del personaje creador"><input required minLength={2} maxLength={40} value={form.creator_name} onChange={e=>setForm({...form,creator_name:e.target.value})}/></Field>
        <Field label="Fecha y hora"><input required type="datetime-local" min={localDateValue()} value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></Field>
        <Field label="Nivel mínimo"><input required type="number" min="1" max="60" value={form.min_level} onChange={e=>setForm({...form,min_level:e.target.value})}/></Field>
        <Field label="Nivel máximo"><input required type="number" min={form.min_level} max="60" value={form.max_level} onChange={e=>setForm({...form,max_level:e.target.value})}/></Field>
        <Field label="Plazas de tanque"><select value={form.tank_slots} onChange={e=>setForm({...form,tank_slots:e.target.value})}>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></Field>
        <Field label="Plazas de sanador"><select value={form.healer_slots} onChange={e=>setForm({...form,healer_slots:e.target.value})}>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></Field>
        <Field label="Plazas de DPS"><select value={form.dps_slots} onChange={e=>setForm({...form,dps_slots:e.target.value})}>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></Field>
        <Field label="Descripción (opcional)"><textarea maxLength={1500} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Objetivo, requisitos, ruta..."/></Field>
      </div><p className="dg-muted">Al publicar recibirás un enlace privado. Guárdalo: permite gestionar las solicitudes sin crear una cuenta.</p><button className="dg-button dg-button-gold" disabled={createBusy || Number(form.tank_slots)+Number(form.healer_slots)+Number(form.dps_slots)<1}>{createBusy ? "Publicando…" : "Publicar grupo"}</button></form>}

      {manageId && <section className="dg-panel dg-management"><div className="dg-panel-heading"><div><span className="dg-kicker">ZONA PRIVADA</span><h2>Gestión del grupo</h2></div><button className="dg-button dg-button-outline" onClick={() => void loadManagement()}><RefreshCw size={14}/> Actualizar</button></div>{manageBusy ? <p>Cargando gestión…</p> : manageError ? <div className="dg-alert">{manageError}<button onClick={() => void loadManagement()}>Reintentar</button></div> : manageData && <><p><b>{manageData.group.title}</b> · {statusLabel(manageData.group.status)}</p><div className="dg-manage-actions"><button className="dg-button dg-button-outline" onClick={() => void changeStatus("in_progress")}>Marcar en curso</button><button className="dg-button dg-button-outline" onClick={() => void changeStatus("completed")}>Completar</button><button className="dg-button dg-button-danger" onClick={() => void changeStatus("cancelled")}>Cancelar grupo</button></div><h3>Solicitudes ({manageData.applications.length})</h3>{manageData.applications.length===0 ? <p className="dg-muted">Todavía no hay solicitudes.</p> : manageData.applications.map(a=><article className="dg-application" key={a.id}><div><b>{a.character_name}</b> <span className="dg-pill">{a.class_name} · nivel {a.level}</span><p>{roleLabel(a.role)} · {statusLabel(a.status)}{a.note ? ` · ${a.note}` : ""}</p>{a.contact && <small>Contacto: {a.contact}</small>}</div>{a.status==="pending" && <div className="dg-inline-actions"><button className="dg-button dg-button-gold" onClick={()=>void decide(a.id,"accept")}><Check size={14}/> Aceptar</button><button className="dg-button dg-button-outline" onClick={()=>void decide(a.id,"reject")}><X size={14}/> Rechazar</button></div>}</article>)}</>}</section>}

      <div className="dg-filterbar"><div><span className="dg-kicker">TABLÓN DE ACTIVIDADES</span><h2>Grupos disponibles</h2></div><div className="dg-filters"><label><Search size={15}/><select value={selectedDungeon} onChange={e=>setSelectedDungeon(e.target.value)}><option>Todas las mazmorras</option>{DUNGEONS.map(d=><option key={d}>{d}</option>)}</select></label><select aria-label="Filtrar por rol" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="all">Cualquier rol</option><option value="tank">Tanque</option><option value="healer">Sanador</option><option value="dps">DPS</option></select><button className="dg-icon-button" onClick={()=>void loadGroups()} aria-label="Actualizar grupos"><RefreshCw size={16}/></button></div></div>
      {loading ? <div className="dg-empty">Cargando grupos…</div> : visibleGroups.length===0 ? <div className="dg-empty"><Swords size={32}/><h3>{error ? "No se ha podido consultar el tablón" : "No hay grupos con esos filtros"}</h3><p>{error ? "Comprueba que la API y la migración de base de datos estén desplegadas." : "Sé el primero en publicar una actividad o cambia los filtros."}</p><button className="dg-button dg-button-gold" onClick={()=>setShowCreate(true)}>Crear un grupo</button></div> : <div className="dg-group-grid">{visibleGroups.map(g=><article className="dg-group-card" key={g.id}><div className="dg-card-top"><span>{g.dungeon_name}</span><span className="dg-status"><i/> Buscando jugadores</span></div><h3>{g.title}</h3><p className="dg-card-description">{g.description || "Sin descripción adicional."}</p><div className="dg-card-meta"><span><Crown size={14}/> {g.creator_name}</span><span><CalendarClock size={14}/> {formatDate(g.starts_at)}</span><span><Users size={14}/> Nivel {g.min_level}–{g.max_level}</span></div><div className="dg-slots"><Slot label="Tanque" filled={g.tanks_filled} total={g.tank_slots}/><Slot label="Sanador" filled={g.healers_filled} total={g.healer_slots}/><Slot label="DPS" filled={g.dps_filled} total={g.dps_slots}/></div><button className="dg-button dg-button-gold dg-apply-button" onClick={()=>{setApplyGroup(g);setAppForm({...appForm,level:String(Math.max(g.min_level,Math.min(Number(appForm.level),g.max_level)))})}}>Solicitar plaza <ArrowLeft size={15}/></button></article>)}</div>}
      <div className="dg-bottom-note"><Shield size={16}/><p>El buscador es independiente de los eventos de la hermandad. Las solicitudes no se aceptan automáticamente: cada creador decide quién entra en su grupo.</p></div>
    </section>
    <footer className="dg-footer"><a href="/">PACTO ESCARLATA</a><span>Herramienta comunitaria · WoW Forever</span></footer>

    {applyGroup && <div className="dg-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setApplyGroup(null)}}><form className="dg-panel dg-modal" onSubmit={applyToGroup}><div className="dg-panel-heading"><div><span className="dg-kicker">SOLICITUD DE PLAZA</span><h2>{applyGroup.title}</h2><p className="dg-muted">Nivel permitido: {applyGroup.min_level}–{applyGroup.max_level}</p></div><button type="button" className="dg-icon-button" onClick={()=>setApplyGroup(null)} aria-label="Cerrar"><X/></button></div><div className="dg-form-grid"><Field label="Nombre del personaje"><input required minLength={2} maxLength={40} value={appForm.character_name} onChange={e=>setAppForm({...appForm,character_name:e.target.value})}/></Field><Field label="Clase"><select value={appForm.class_name} onChange={e=>setAppForm({...appForm,class_name:e.target.value})}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Nivel"><input required type="number" min={applyGroup.min_level} max={applyGroup.max_level} value={appForm.level} onChange={e=>setAppForm({...appForm,level:e.target.value})}/></Field><Field label="Rol"><select value={appForm.role} onChange={e=>setAppForm({...appForm,role:e.target.value as Role})}><option value="tank">Tanque</option><option value="healer">Sanador</option><option value="dps">DPS</option></select></Field><Field label="Contacto (opcional)"><input maxLength={120} value={appForm.contact} onChange={e=>setAppForm({...appForm,contact:e.target.value})} placeholder="Discord, por ejemplo"/></Field><Field label="Nota (opcional)"><textarea rows={3} maxLength={500} value={appForm.note} onChange={e=>setAppForm({...appForm,note:e.target.value})}/></Field></div><p className="dg-muted">No necesitas cuenta. Envía solo información que quieras compartir con el creador.</p><button className="dg-button dg-button-gold" disabled={applyBusy}>{applyBusy ? "Enviando…" : "Enviar solicitud"}</button></form></div>}
  </main>;
}
function Slot({ label, filled, total }: { label: string; filled: number; total: number }) { return <div className="dg-slot"><span>{label}</span><b>{filled}/{total}</b><div><i style={{width: `${total ? Math.min(100, filled/total*100) : 100}%`}}/></div></div>; }

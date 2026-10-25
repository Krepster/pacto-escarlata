import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Share2, ChevronUp, Info, LoaderCircle, ExternalLink } from "lucide-react";

type Talent = {
  name: string;
  max: number;
  row: number;
  col: number;
  icon?: string;
  desc?: string[];
  req?: string;
  passive?: boolean;
  classic?: { status?: string };
};
type Tree = { name: string; icon?: string; talents: Talent[] };
type ClassData = { icon?: string; trees: Tree[] };
type Dataset = { talents: Record<string, ClassData>; generated?: string; attribution?: string; license?: string };
type Allocation = Record<string, number>;

const DATA_URL = "/api/talents-data";
const CLASS_NAMES: Record<string, string> = {
  Warrior: "Guerrero", Paladin: "Paladín", Hunter: "Cazador", Rogue: "Pícaro",
  Priest: "Sacerdote", Shaman: "Chamán", Mage: "Mago", Warlock: "Brujo", Druid: "Druida",
};
const TREE_NAMES: Record<string, string> = {
  Arms: "Armas", Fury: "Furia", Protection: "Protección", Holy: "Sagrado", Retribution: "Reprensión",
  Discipline: "Disciplina", Shadow: "Sombras", Beast: "Bestias", "Beast Mastery": "Dominio de bestias",
  Marksmanship: "Puntería", Survival: "Supervivencia", Assassination: "Asesinato", Combat: "Combate",
  Subtlety: "Sutileza", Elemental: "Elemental", Enhancement: "Mejora", Restoration: "Restauración",
  Arcane: "Arcano", Fire: "Fuego", Frost: "Escarcha", Affliction: "Aflicción", Demonology: "Demonología",
  Destruction: "Destrucción", Balance: "Equilibrio", "Feral Combat": "Combate feral",
};
const statusLabel: Record<string, string> = { new: "Nuevo en Forever", changed: "Modificado", moved: "Reubicado", same: "Como en Classic" };
const keyOf = (treeIndex: number, talentName: string) => `${treeIndex}:${talentName}`;

function loadInitialState() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("clase") || "Warrior";
  const level = Math.min(60, Math.max(10, Number(params.get("nivel") || 60)));
  const build: Allocation = {};
  const raw = params.get("build");
  if (raw) {
    try {
      for (const item of raw.split(",")) {
        const [tree, encodedName, rank] = item.split("~");
        if (tree !== undefined && encodedName && Number(rank) > 0) build[`${tree}:${decodeURIComponent(encodedName)}`] = Number(rank);
      }
    } catch { /* Un enlace incompleto se abre con una configuración vacía. */ }
  }
  return { requested, level, build };
}

export default function TalentCalculator() {
  const initial = useMemo(loadInitialState, []);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loadError, setLoadError] = useState("");
  const [classKey, setClassKey] = useState(initial.requested);
  const [level, setLevel] = useState(initial.level);
  const [allocation, setAllocation] = useState<Allocation>(initial.build);
  const [selected, setSelected] = useState<{ tree: number; talent: Talent } | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(DATA_URL, { headers: { Accept: "application/json" } })
      .then((response) => { if (!response.ok) throw new Error(`El servidor respondió ${response.status}`); return response.json() as Promise<Dataset>; })
      .then((data: Dataset) => {
        if (!data?.talents || typeof data.talents !== "object") throw new Error("El formato de datos recibido no es válido.");
        if (!cancelled) { setDataset(data); setLoadError(""); }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "No se han podido cargar los datos.");
      });
    return () => { cancelled = true; };
  }, []);

  const classKeys = useMemo(() => dataset ? Object.keys(dataset.talents) : [], [dataset]);
  const safeClassKey = dataset && dataset.talents[classKey] ? classKey : (classKeys[0] || "Warrior");
  const classData = dataset?.talents[safeClassKey];
  const trees = classData?.trees ?? [];
  const totalSpent = useMemo(() => Object.values(allocation).reduce((sum, rank) => sum + rank, 0), [allocation]);
  const pointBudget = level - 9;
  const pointsLeft = pointBudget - totalSpent;
  const spentByTree = useMemo(() => trees.map((tree, treeIndex) => tree.talents.reduce((sum, talent) => sum + (allocation[keyOf(treeIndex, talent.name)] || 0), 0)), [trees, allocation]);

  const getRank = useCallback((treeIndex: number, talent: Talent, source = allocation) => source[keyOf(treeIndex, talent.name)] || 0, [allocation]);
  const isTalentAvailable = useCallback((treeIndex: number, talent: Talent, source = allocation) => {
    const spentInTree = trees[treeIndex]?.talents.reduce((sum, item) => sum + (item.row < talent.row ? (source[keyOf(treeIndex, item.name)] || 0) : 0), 0) || 0;
    const rank = source[keyOf(treeIndex, talent.name)] || 0;
    if (rank >= talent.max) return false;
    if (Object.values(source).reduce((sum, value) => sum + value, 0) >= pointBudget) return false;
    if (talent.row > 1 && spentInTree < (talent.row - 1) * 5) return false;
    if (talent.req) {
      const prerequisite = trees[treeIndex]?.talents.find((item) => item.name === talent.req);
      if (!prerequisite || (source[keyOf(treeIndex, prerequisite.name)] || 0) < prerequisite.max) return false;
    }
    return true;
  }, [allocation, trees, pointBudget]);

  const isRefundAllowed = useCallback((treeIndex: number, talent: Talent) => {
    const rank = allocation[keyOf(treeIndex, talent.name)] || 0;
    if (rank <= 0) return false;
    const after = { ...allocation, [keyOf(treeIndex, talent.name)]: rank - 1 };
    if (after[keyOf(treeIndex, talent.name)] === 0) delete after[keyOf(treeIndex, talent.name)];
    for (let ti = 0; ti < trees.length; ti++) {
      const tree = trees[ti];
      for (const item of tree.talents) {
        const allocated = after[keyOf(ti, item.name)] || 0;
        if (!allocated) continue;
        const pointsBeforeRow = tree.talents.reduce((sum, prior) => sum + (prior.row < item.row ? (after[keyOf(ti, prior.name)] || 0) : 0), 0);
        if (item.row > 1 && pointsBeforeRow < (item.row - 1) * 5) return false;
        if (item.req) {
          const reqTalent = tree.talents.find((candidate) => candidate.name === item.req);
          if (!reqTalent || (after[keyOf(ti, reqTalent.name)] || 0) < reqTalent.max) return false;
        }
      }
    }
    return true;
  }, [allocation, trees]);

  const changeRank = (treeIndex: number, talent: Talent, delta: 1 | -1) => {
    const current = getRank(treeIndex, talent);
    if (delta === 1 && !isTalentAvailable(treeIndex, talent)) return;
    if (delta === -1 && !isRefundAllowed(treeIndex, talent)) return;
    const key = keyOf(treeIndex, talent.name);
    setAllocation((currentAllocation) => {
      const next = { ...currentAllocation };
      const value = (next[key] || 0) + delta;
      if (value <= 0) delete next[key]; else next[key] = value;
      return next;
    });
    setSelected({ tree: treeIndex, talent });
  };

  const resetBuild = () => { setAllocation({}); setSelected(null); setCopyMessage(""); };
  const changeClass = (nextClass: string) => { setClassKey(nextClass); setAllocation({}); setSelected(null); setCopyMessage(""); };
  const changeLevel = (nextLevel: number) => {
    const budget = nextLevel - 9;
    if (totalSpent > budget) {
      setCopyMessage(`Tienes ${totalSpent} puntos asignados. Retira ${totalSpent - budget} antes de bajar el nivel.`);
      return;
    }
    setLevel(nextLevel); setCopyMessage("");
  };
  const makeShareUrl = () => {
    const entries = Object.entries(allocation).filter(([, rank]) => rank > 0).map(([key, rank]) => {
      const split = key.indexOf(":");
      return `${key.slice(0, split)}~${encodeURIComponent(key.slice(split + 1))}~${rank}`;
    }).join(",");
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("clase", safeClassKey);
    url.searchParams.set("nivel", String(level));
    if (entries) url.searchParams.set("build", entries);
    return url.toString();
  };
  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(makeShareUrl());
      setCopyMessage("Enlace copiado. Puedes compartir tu configuración.");
    } catch {
      setCopyMessage(makeShareUrl());
    }
  };

  useEffect(() => {
    if (!dataset || !dataset.talents[safeClassKey]) return;
    // Validamos el enlace importado contra los datos reales: rangos, presupuesto, filas y requisitos.
    const params = new URLSearchParams(window.location.search);
    if (!params.has("build")) return;
    const candidate = { ...allocation };
    let changed = false;
    for (const key of Object.keys(candidate)) {
      const split = key.indexOf(":");
      const ti = Number(key.slice(0, split));
      const talentName = key.slice(split + 1);
      const talent = trees[ti]?.talents.find((item) => item.name === talentName);
      if (!talent || candidate[key] > talent.max || candidate[key] < 1) { delete candidate[key]; changed = true; }
    }
    while (Object.values(candidate).reduce((sum, value) => sum + value, 0) > pointBudget) {
      const key = Object.keys(candidate).at(-1); if (!key) break; candidate[key]--; if (candidate[key] <= 0) delete candidate[key]; changed = true;
    }
    if (changed) setAllocation(candidate);
  // Only sanitize the imported link after the source data has loaded.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset]);

  return <div className="talent-calculator-app">
    <div className="talent-calc-heading">
      <div><div className="talent-calc-eyebrow">PACTO ESCARLATA · HERRAMIENTA DE HERMANDAD</div><h2>Calculadora de <em>talentos</em></h2><p>Diseña tu build de WoW Forever y comparte la configuración con tu hermandad.</p></div>
      <a className="talent-calc-source-link" href="https://talentsforever.com/" target="_blank" rel="noopener noreferrer">Fuente de datos <ExternalLink size={14}/></a>
    </div>

    {loadError && <div className="talent-calc-error"><strong>No se han podido cargar los árboles de talentos.</strong><span>{loadError}. El navegador o la red pueden estar bloqueando la descarga del JSON.</span><a href="https://talentsforever.com/data.json" target="_blank" rel="noopener noreferrer">Abrir los datos originales <ExternalLink size={13}/></a><button type="button" onClick={() => { setLoadError(""); setDataset(null); fetch(DATA_URL).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<Dataset>; }).then((data) => setDataset(data)).catch(e => setLoadError(e instanceof Error ? e.message : "Error de conexión")); }}>Reintentar</button></div>}
    {!dataset && !loadError && <div className="talent-calc-loading"><LoaderCircle className="talent-calc-spinner" size={24}/><span>Cargando árboles y descripciones de talentos…</span></div>}

    {dataset && classData && <>
      <div className="talent-calc-controls">
        <label>Clase<select value={safeClassKey} onChange={(event) => changeClass(event.target.value)}>{classKeys.map((key) => <option key={key} value={key}>{CLASS_NAMES[key] || key}</option>)}</select></label>
        <label>Nivel<select value={level} onChange={(event) => changeLevel(Number(event.target.value))}>{Array.from({ length: 51 }, (_, i) => i + 10).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <div className="talent-calc-points"><span>PUNTOS DISPONIBLES</span><strong>{pointsLeft}</strong><small>{totalSpent} / {pointBudget} asignados</small></div>
        <div className="talent-calc-actions"><button type="button" onClick={resetBuild}><RotateCcw size={15}/> Reiniciar</button><button type="button" className="primary" onClick={() => void copyShareUrl()}><Share2 size={15}/> Compartir build</button></div>
      </div>
      {copyMessage && <div className="talent-calc-feedback" role="status"><span>{copyMessage}</span><button type="button" onClick={() => setCopyMessage("")} aria-label="Cerrar mensaje">×</button></div>}

      <div className="talent-calc-tree-grid">
        {trees.map((tree, treeIndex) => <section className="talent-tree-card" key={`${safeClassKey}-${tree.name}`}>
          <header><div><span>ÁRBOL {treeIndex + 1}</span><h3>{TREE_NAMES[tree.name] || tree.name}</h3></div><strong>{spentByTree[treeIndex] || 0} <small>PTS</small></strong></header>
          <div className="talent-tree-board" role="group" aria-label={`Talentos de ${tree.name}`}>
            {Array.from({ length: Math.max(7, ...tree.talents.map((talent) => talent.row)) }, (_, rowIndex) => <div className="talent-tree-row" key={rowIndex}>
              {Array.from({ length: Math.max(4, ...tree.talents.map((talent) => talent.col)) }, (_, colIndex) => {
                const talent = tree.talents.find((item) => item.row === rowIndex + 1 && item.col === colIndex + 1);
                if (!talent) return <div className="talent-empty-slot" key={colIndex}/>;
                const rank = getRank(treeIndex, talent);
                const canAdd = isTalentAvailable(treeIndex, talent);
                const canRefund = isRefundAllowed(treeIndex, talent);
                const requirement = talent.req ? `Requiere ${talent.req} al máximo.` : "";
                const rowRequirement = talent.row > 1 ? `Requiere ${((talent.row - 1) * 5)} puntos previos en este árbol.` : "";
                const description = talent.desc?.[Math.max(0, rank - 1)] || talent.desc?.[0] || "Sin descripción disponible.";
                return <button type="button" key={talent.name} className={`talent-node ${rank > 0 ? "learned" : ""} ${!rank && !canAdd ? "locked" : ""} ${selected?.tree === treeIndex && selected.talent.name === talent.name ? "inspected" : ""}`} onClick={() => { setSelected({ tree: treeIndex, talent }); if (canAdd) changeRank(treeIndex, talent, 1); }} onContextMenu={(event) => { event.preventDefault(); setSelected({ tree: treeIndex, talent }); if (canRefund) changeRank(treeIndex, talent, -1); }} title={`${talent.name} · ${rank}/${talent.max}${requirement ? ` · ${requirement}` : ""}${rowRequirement ? ` · ${rowRequirement}` : ""}`} aria-label={`${talent.name}, rango ${rank} de ${talent.max}. Clic para añadir un punto; clic derecho para quitarlo.`}>
                  <span className="talent-node-icon">{talent.icon ? <img src={`https://wow.zamimg.com/images/wow/icons/large/${talent.icon.toLowerCase()}.jpg`} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }}/> : <span>{talent.name.slice(0, 1)}</span>}</span>
                  <span className="talent-node-rank">{rank}/{talent.max}</span>
                  <span className="talent-node-name">{talent.name}</span>
                </button>;
              })}
            </div>)}
          </div>
          <footer><span>{tree.talents.length} talentos</span><button type="button" onClick={() => { const next = { ...allocation }; for (const talent of tree.talents) delete next[keyOf(treeIndex, talent.name)]; setAllocation(next); if (selected?.tree === treeIndex) setSelected(null); }}>Reiniciar árbol</button></footer>
        </section>)}
      </div>

      <section className="talent-inspector">
        <div className="talent-inspector-icon"><Info size={20}/></div>
        {selected ? <div className="talent-inspector-copy"><div className="talent-inspector-title"><div><span>{TREE_NAMES[trees[selected.tree]?.name] || trees[selected.tree]?.name}</span><h3>{selected.talent.name}</h3></div><strong>{getRank(selected.tree, selected.talent)}/{selected.talent.max}</strong></div><p>{selected.talent.desc?.[Math.max(0, getRank(selected.tree, selected.talent) - 1)] || selected.talent.desc?.[0] || "Sin descripción disponible."}</p><div className="talent-inspector-meta">{selected.talent.classic?.status && <span>{statusLabel[selected.talent.classic.status] || selected.talent.classic.status}</span>}{selected.talent.req && <span>Requisito: {selected.talent.req}</span>}<span>Fila {selected.talent.row}</span></div><div className="talent-inspector-buttons"><button type="button" disabled={!isRefundAllowed(selected.tree, selected.talent)} onClick={() => changeRank(selected.tree, selected.talent, -1)}>− Quitar punto</button><button type="button" disabled={!isTalentAvailable(selected.tree, selected.talent)} onClick={() => changeRank(selected.tree, selected.talent, 1)}>+ Añadir punto</button></div></div> : <p>Selecciona un talento para consultar su descripción y sus requisitos. Clic para añadir puntos; clic derecho para retirarlos.</p>}
      </section>
      <div className="talent-calc-legend"><span><i className="legend-dot learned-dot"/> Aprendido</span><span><i className="legend-dot locked-dot"/> Bloqueado por requisitos</span><span><i className="legend-dot available-dot"/> Disponible</span><span><ChevronUp size={13}/> Clic derecho para retirar puntos</span></div>
      <p className="talent-calc-attribution">Datos de talentos adaptados de <a href="https://talentsforever.com/" target="_blank" rel="noopener noreferrer">TalentsForever</a>, bajo licencia <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Los nombres, textos e iconos de World of Warcraft pertenecen a sus respectivos titulares. Datos publicados: {dataset.generated || "sin fecha indicada"}. Proyecto comunitario no oficial.</p>
    </>}
  </div>;
}

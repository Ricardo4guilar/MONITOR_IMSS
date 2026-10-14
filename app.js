/* =============================================================
 *  Mapa interactivo de México — lógica de la aplicación
 * ============================================================= */
(function () {
  "use strict";

  const MAP = window.MX_MAP;
  const CFG = window.APPSHEET_CONFIG || {};

  if (!MAP || !Array.isArray(MAP.states)) {
    console.error("No se encontró window.MX_MAP. ¿Se cargó mx-states.js?");
    return;
  }

  // Índice por id para acceso rápido
  const byId = Object.create(null);
  MAP.states.forEach((s) => (byId[s.id] = s));

  // Referencias del DOM
  const el = {
    stage: document.getElementById("mapStage"),
    loading: document.getElementById("mapLoading"),
    legend: document.getElementById("legend"),
    tooltip: document.getElementById("tooltip"),
    search: document.getElementById("searchInput"),
    region: document.getElementById("regionFilter"),
    reset: document.getElementById("resetBtn"),
    visibleCount: document.getElementById("visibleCount"),
    panelEmpty: document.getElementById("panelEmpty"),
    panelDetail: document.getElementById("panelDetail"),
    dAbbr: document.getElementById("detailAbbr"),
    dName: document.getElementById("detailName"),
    dRegion: document.getElementById("detailRegion"),
    dRegion2: document.getElementById("detailRegion2"),
    dCapital: document.getElementById("detailCapital"),
    dHospitales: document.getElementById("detailHospitales"),
    dServicios: document.getElementById("detailServicios"),
    dAgentes: document.getElementById("detailAgentes"),
    dashboardBtn: document.getElementById("dashboardBtn"),
  };

  const SVG_NS = "http://www.w3.org/2000/svg";
  let selectedId = null;
  let offRegions = new Set(); // regiones ocultas desde la leyenda

  /* =============================================================
   *  REGIONES OFICIALES (match exacto con la tabla EntidadesFederativas,
   *  campo "Region", y con entidades_data.csv). Colores fijos y distintos.
   * ============================================================= */
  const REGION_DEFS = [
    { name: "Norte/ Occidente",       color: "#0ea5e9" }, // azul
    { name: "Metropolitano",          color: "#f59e0b" }, // ámbar
    { name: "Centro/Sur",             color: "#ef4444" }, // rojo
    { name: "Centro/ Golfo/ Sureste", color: "#22c55e" }, // verde
  ];
  const REGION_ORDER = REGION_DEFS.map((r) => r.name);

  // Normaliza nombres de región para tolerar espacios extra/inconsistentes
  // entre el CSV, la hoja y el código (p.ej. "Norte/  Occidente").
  function normalizeRegion(s) {
    return String(s || "")
      .replace(/\s+/g, " ") // colapsa espacios múltiples
      .trim();
  }

  // Diccionario normalizado -> color, construido desde REGION_DEFS.
  const REGION_COLOR_BY_NORM = Object.create(null);
  REGION_DEFS.forEach((r) => (REGION_COLOR_BY_NORM[normalizeRegion(r.name)] = r.color));

  // Mapa de color por región, construido dinámicamente desde la tabla.
  let regionColors = Object.create(null);

  /* =============================================================
   *  CARGA DE DATOS: tabla EntidadesFederativas (Google Sheets)
   *  El mapa regenera regiones/colores a partir de esta tabla.
   * ============================================================= */
  const DATA = CFG.DATA || {};
  const COLS = DATA.COLUMNS || { iso: "clave_iso", name: "entidad_federativa", region: "region", color: "color" };

  // Config de métricas por entidad (card de detalle).
  const METRICS = DATA.METRICS || {};
  const MCOLS = METRICS.COLUMNS || { iso: "clave_iso", hospitales: "hospitales", servicios: "servicios", agentes: "agentes" };
  // Métricas por clave ISO: { MXCMX: { hospitales, servicios, agentes }, ... }
  let metricsByIso = Object.create(null);

  // Paleta de respaldo para asignar color cuando la tabla no trae uno.
  const FALLBACK_PALETTE = [
    "#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b",
    "#a855f7", "#ef4444", "#22c55e", "#ec4899",
    "#84cc16", "#06b6d4", "#f97316", "#8b5cf6",
  ];

  // URL remota para leer la tabla: usa la URL publicada si está definida
  // (pública, sin CORS); si no, cae al endpoint gviz (requiere permisos).
  function remoteUrl() {
    if (DATA.PUBLISHED_CSV_URL) return DATA.PUBLISHED_CSV_URL;
    const id = DATA.SHEET_ID;
    const sheet = encodeURIComponent(DATA.SHEET_NAME || "");
    const gid = DATA.GID != null ? "&gid=" + encodeURIComponent(DATA.GID) : "";
    return "https://docs.google.com/spreadsheets/d/" + id +
      "/gviz/tq?tqx=out:csv&sheet=" + sheet + gid;
  }

  // Parser CSV mínimo que respeta comillas y comas internas.
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c === "\r") { /* ignora */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim() !== ""));
  }

  // Convierte filas CSV en objetos usando la primera fila como encabezado.
  function rowsToObjects(rows) {
    if (!rows.length) return [];
    const header = rows[0].map((h) => h.trim());
    return rows.slice(1).map((r) => {
      const o = {};
      header.forEach((h, i) => (o[h] = (r[i] || "").trim()));
      return o;
    });
  }

  // Intenta cargar la tabla: remoto (gviz) y/o CSV local, según MODE.
  async function loadEntidades() {
    const mode = DATA.MODE || "auto";
    const attempts = [];
    if (DATA.SHEET_ID && (mode === "auto" || mode === "remote")) {
      attempts.push({ kind: "remoto (Google Sheets publicado)", url: remoteUrl() });
    }
    if (DATA.LOCAL_CSV && (mode === "auto" || mode === "local")) {
      attempts.push({ kind: "local (" + DATA.LOCAL_CSV + ")", url: DATA.LOCAL_CSV });
    }

    for (const a of attempts) {
      try {
        const res = await fetch(a.url, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const text = await res.text();
        // Si Google devuelve HTML (hoja privada), no es CSV válido.
        if (/^\s*<(!doctype|html)/i.test(text)) throw new Error("respuesta no-CSV (¿hoja privada?)");
        const objs = rowsToObjects(parseCSV(text));
        if (!objs.length) throw new Error("CSV vacío");
        console.info("Datos cargados desde fuente " + a.kind + ": " + objs.length + " filas.");
        return objs;
      } catch (err) {
        console.warn("Fuente " + a.kind + " falló: " + err.message);
      }
    }
    console.warn("No se pudo cargar la tabla EntidadesFederativas. Se usan las regiones por defecto del mapa.");
    return null;
  }

  // Aplica los datos de la tabla al modelo del mapa (regenera región/color).
  function applyEntidades(objs) {
    if (!objs) { // sin tabla: usa las regiones por defecto que ya trae el mapa
      MAP.states.forEach((s) => (s.region = normalizeRegion(s.region)));
      buildRegionColors();
      return;
    }
    objs.forEach((o) => {
      const iso = (o[COLS.iso] || "").trim();
      const st = byId[iso];
      if (!st) return; // ignora filas que no corresponden a un estado del mapa
      const region = normalizeRegion(o[COLS.region] || st.region || "");
      const color = (COLS.color && o[COLS.color] ? o[COLS.color] : "").trim();
      st.region = region || st.region;
      if (color) st.color = color;
      if (o[COLS.name]) st.name = o[COLS.name].trim();
    });
    buildRegionColors();
  }

  // Construye el diccionario región->color.
  // Prioriza: 1) color explícito en la tabla, 2) color fijo de REGION_DEFS,
  // 3) respaldo de paleta para regiones no previstas.
  function buildRegionColors() {
    regionColors = Object.create(null);
    uniqueRegions().forEach((r, i) => {
      const norm = normalizeRegion(r);
      const withColor = MAP.states.find((s) => s.region === r && s.color);
      regionColors[r] =
        (withColor && withColor.color) ||
        REGION_COLOR_BY_NORM[norm] ||
        FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];
    });
  }

  // Pinta cada path según color explícito del estado o color de su región.
  function paintStates() {
    MAP.states.forEach((s) => {
      const path = document.getElementById("path-" + s.id);
      if (!path) return;
      const color = s.color || regionColors[s.region] || "#6366f1";
      path.setAttribute("data-region", s.region);
      path.style.fill = color;
      path.setAttribute("aria-label", s.name + ", región " + s.region);
    });
  }

  /* =============================================================
   *  MapeoEntidad(): carga las métricas por entidad y las mapea por
   *  clave ISO para la card de detalle:
   *    - hospitales → conteo DirectorioHospital por EntidadRef
   *    - servicios  → conteo ReporteActividad por Entidad
   *    - agentes    → suma "Cantidad de agentes instalados" por Entidad
   *
   *  Fuente según METRICS.MODE:
   *    - "auto"   : hoja publicada (tiempo real) y si falla → CSV local.
   *    - "remote" : solo la hoja publicada.
   *    - "local"  : solo el CSV local.
   *  Esto permite datos en vivo en GitHub Pages/Vercel (la hoja publicada
   *  es pública y sin CORS), con el CSV local como respaldo.
   *  Resultado: rellena metricsByIso y adjunta las métricas a cada estado.
   * ============================================================= */
  async function MapeoEntidad() {
    metricsByIso = Object.create(null);

    const mode = METRICS.MODE || "auto";
    const attempts = [];
    if (METRICS.PUBLISHED_CSV_URL && (mode === "auto" || mode === "remote")) {
      attempts.push({ kind: "remoto (MetricasEntidad publicada)", url: METRICS.PUBLISHED_CSV_URL });
    }
    if (METRICS.LOCAL_CSV && (mode === "auto" || mode === "local")) {
      attempts.push({ kind: "local (" + METRICS.LOCAL_CSV + ")", url: METRICS.LOCAL_CSV });
    }
    if (!attempts.length) {
      console.warn("MapeoEntidad: no hay fuente de métricas configurada (PUBLISHED_CSV_URL / LOCAL_CSV).");
      return metricsByIso;
    }

    const toInt = (v) => parseInt(String(v || "0").replace(/[^0-9-]/g, ""), 10) || 0;

    for (const a of attempts) {
      try {
        const res = await fetch(a.url, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const text = await res.text();
        // Si Google devuelve HTML (hoja no publicada/privada), no es CSV válido.
        if (/^\s*<(!doctype|html)/i.test(text)) throw new Error("respuesta no-CSV (¿hoja no publicada?)");
        const objs = rowsToObjects(parseCSV(text));
        if (!objs.length) throw new Error("CSV vacío");

        const map = Object.create(null);
        objs.forEach((o) => {
          const iso = (o[MCOLS.iso] || "").trim().toUpperCase();
          if (!iso) return;
          map[iso] = {
            hospitales: toInt(o[MCOLS.hospitales]),
            servicios: toInt(o[MCOLS.servicios]),
            agentes: toInt(o[MCOLS.agentes]),
          };
        });
        if (!Object.keys(map).length) throw new Error("sin filas con clave ISO");

        metricsByIso = map;
        // Adjuntar también al modelo de cada estado para acceso directo.
        Object.keys(map).forEach((iso) => { if (byId[iso]) byId[iso].metrics = map[iso]; });

        console.info("MapeoEntidad: métricas cargadas desde fuente " + a.kind + ": " + Object.keys(map).length + " entidades.");
        return metricsByIso;
      } catch (err) {
        console.warn("MapeoEntidad: fuente " + a.kind + " falló: " + err.message);
      }
    }

    console.warn("MapeoEntidad: no se pudieron cargar las métricas de ninguna fuente. Se usan ceros.");
    return metricsByIso;
  }

  // Devuelve las métricas de una entidad por clave ISO (con ceros por defecto).
  function metricsFor(iso) {
    return metricsByIso[iso] || { hospitales: 0, servicios: 0, agentes: 0 };
  }

  // Formatea números con separador de miles (es-MX).
  function fmtNum(n) {
    try { return Number(n || 0).toLocaleString("es-MX"); }
    catch (e) { return String(n || 0); }
  }

  /* ---------- Render del SVG ---------- */
  function renderMap() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", MAP.viewBox);
    svg.setAttribute("role", "list");
    svg.setAttribute("aria-label", "Estados de México");

    MAP.states.forEach((s) => {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", s.d);
      p.setAttribute("id", "path-" + s.id);
      p.setAttribute("data-id", s.id);
      p.setAttribute("data-region", s.region);
      p.setAttribute("role", "listitem");
      p.setAttribute("tabindex", "0");
      p.setAttribute("aria-label", s.name + ", región " + s.region);
      svg.appendChild(p);
    });

    el.loading.remove();
    el.stage.appendChild(svg);

    // Delegación de eventos
    svg.addEventListener("click", onPathActivate);
    svg.addEventListener("mousemove", onPathMove);
    svg.addEventListener("mouseover", onPathEnter);
    svg.addEventListener("mouseout", onPathLeave);
    svg.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.dataset.id) {
        e.preventDefault();
        onPathActivate(e);
      }
    });
  }

  /* ---------- Leyenda / regiones ---------- */
  function uniqueRegions() {
    const present = [...new Set(MAP.states.map((s) => s.region))];
    // Ordena primero las regiones oficiales (en su orden) y luego cualquier
    // región inesperada, para una leyenda estable y predecible.
    const known = REGION_ORDER.filter((r) => present.includes(r));
    const extra = present.filter((r) => !REGION_ORDER.includes(r)).sort();
    return known.concat(extra);
  }

  function buildLegendAndFilter() {
    // Limpia por si se reconstruye tras recargar datos.
    el.legend.innerHTML = "";
    // Conserva solo la opción "Todas las regiones".
    el.region.querySelectorAll("option:not([value=''])").forEach((o) => o.remove());

    const regions = uniqueRegions();

    regions.forEach((r) => {
      // Leyenda
      const item = document.createElement("span");
      item.className = "legend-item";
      item.dataset.region = r;
      const sw = document.createElement("span");
      sw.className = "legend-swatch";
      sw.style.background = regionColors[r] || "#6366f1";
      item.appendChild(sw);
      item.appendChild(document.createTextNode(r));
      item.addEventListener("click", () => toggleRegion(r, item));
      el.legend.appendChild(item);

      // Opción del filtro
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      el.region.appendChild(opt);
    });
  }

  function toggleRegion(r, item) {
    if (offRegions.has(r)) { offRegions.delete(r); item.classList.remove("is-off"); }
    else { offRegions.add(r); item.classList.add("is-off"); }
    applyFilters();
  }

  /* ---------- Filtros (búsqueda + región + leyenda) ---------- */
  function applyFilters() {
    const q = (el.search.value || "").trim().toLowerCase();
    const regionSel = el.region.value;
    let visible = 0;

    MAP.states.forEach((s) => {
      const path = document.getElementById("path-" + s.id);
      if (!path) return;

      const matchesText =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.abbr.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.capital.toLowerCase().includes(q);

      const matchesRegion = !regionSel || s.region === regionSel;
      const notHiddenByLegend = !offRegions.has(s.region);

      const show = matchesText && matchesRegion && notHiddenByLegend;
      path.classList.toggle("is-dimmed", !show);
      path.style.pointerEvents = show ? "" : "none";
      if (show) visible++;
    });

    el.visibleCount.textContent = visible;
  }

  /* ---------- Tooltip ---------- */
  function showTooltip(state, x, y) {
    el.tooltip.innerHTML =
      "<strong>" + state.name + "</strong>" +
      '<span class="t-sub">' + state.region + " · Capital: " + state.capital + "</span>";
    el.tooltip.hidden = false;
    el.tooltip.style.left = x + "px";
    el.tooltip.style.top = y + "px";
  }
  function hideTooltip() { el.tooltip.hidden = true; }

  /* ---------- Eventos del mapa ---------- */
  function onPathEnter(e) {
    const id = e.target.dataset && e.target.dataset.id;
    if (!id) return;
    showTooltip(byId[id], e.clientX, e.clientY);
  }
  function onPathMove(e) {
    const id = e.target.dataset && e.target.dataset.id;
    if (!id) { hideTooltip(); return; }
    el.tooltip.style.left = e.clientX + "px";
    el.tooltip.style.top = e.clientY + "px";
  }
  function onPathLeave(e) {
    if (e.target.dataset && e.target.dataset.id) hideTooltip();
  }
  function onPathActivate(e) {
    const id = e.target.dataset && e.target.dataset.id;
    if (!id) return;
    selectState(id);
  }

  /* ---------- Selección + panel ---------- */
  function selectState(id) {
    const state = byId[id];
    if (!state) return;
    selectedId = id;

    document.querySelectorAll(".map-stage path.is-selected")
      .forEach((p) => p.classList.remove("is-selected"));
    const path = document.getElementById("path-" + id);
    if (path) {
      path.classList.add("is-selected");
      // Llevar al frente: en SVG el orden del DOM define el z-order, así el
      // resplandor (drop-shadow) no queda tapado por estados vecinos.
      path.parentNode.appendChild(path);
    }

    el.panelEmpty.hidden = true;
    el.panelDetail.hidden = false;

    el.dAbbr.textContent = state.abbr;
    // Colorea el cuadro de la abreviatura con el color de su región.
    const regionColor = (state.color || regionColors[state.region] || "#6366f1");
    el.dAbbr.style.background = regionColor;
    el.dName.textContent = state.name;
    el.dRegion.textContent = state.region;
    el.dRegion2.textContent = state.region;
    el.dCapital.textContent = state.capital;

    // Métricas por entidad (card): hospitales, servicios, agentes.
    const m = metricsFor(id);
    if (el.dHospitales) el.dHospitales.textContent = fmtNum(m.hospitales);
    if (el.dServicios) el.dServicios.textContent = fmtNum(m.servicios);
    if (el.dAgentes) el.dAgentes.textContent = fmtNum(m.agentes);
  }

  function clearSelection() {
    selectedId = null;
    document.querySelectorAll(".map-stage path.is-selected")
      .forEach((p) => p.classList.remove("is-selected"));
    el.panelDetail.hidden = true;
    el.panelEmpty.hidden = false;
  }

  /* ---------- Acción AppSheet: botón global "Abrir Dashboard" ---------- */
  // Base del deep-link de AppSheet a partir de APP_URL o APP_ID.
  function appsheetBase() {
    if (CFG.APP_URL) return CFG.APP_URL.replace(/\/+$/, "");
    if (CFG.APP_ID) return "https://www.appsheet.com/start/" + CFG.APP_ID;
    return "";
  }

  // Construye la URL de la vista Dashboard (sin filtro por estado).
  // Patrón: .../start/<APP_ID>#view=<DASHBOARD_VIEW>
  function buildDashboardUrl() {
    const base = appsheetBase();
    if (!base) return "";
    const view = CFG.DASHBOARD_VIEW || "Dashboard";
    const frag = new URLSearchParams();
    frag.set("view", view);
    return base + "#" + frag.toString();
  }

  // Abre el Dashboard de AppSheet (navegación o hook).
  function openDashboard() {
    const url = buildDashboardUrl();

    if (typeof CFG.onConnect === "function") {
      CFG.onConnect(null, url);
      return;
    }
    if (!url) {
      alert("Falta APP_ID o APP_URL en appsheet-config.js para abrir el Dashboard.");
      return;
    }
    if (CFG.OPEN_IN_NEW_TAB) window.open(url, "_blank", "noopener");
    else window.location.href = url;
  }

  /* ---------- Reset ---------- */
  function resetAll() {
    el.search.value = "";
    el.region.value = "";
    offRegions.clear();
    document.querySelectorAll(".legend-item.is-off").forEach((i) => i.classList.remove("is-off"));
    clearSelection();
    applyFilters();
  }

  /* ---------- Estado inicial recibido desde AppSheet ---------- */
  function selectStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const iso = (params.get("clave_iso") || "").trim().toUpperCase();
    if (!iso || !byId[iso]) return;

    selectState(iso);
    document.title = byId[iso].name + " · Mapa Interactivo de México";
  }

  /* ---------- Init ---------- */
  async function init() {
    renderMap();

    // 1) Cargar la tabla EntidadesFederativas y regenerar región/color.
    const objs = await loadEntidades();
    applyEntidades(objs);

    // 2) Cargar las métricas por entidad (hospitales/servicios/agentes).
    await MapeoEntidad();

    // 3) Construir leyenda/filtro con las regiones resultantes y pintar.
    buildLegendAndFilter();
    paintStates();
    applyFilters();

    // 4) Si AppSheet envió ?clave_iso=MX..., seleccionar esa entidad.
    selectStateFromUrl();

    el.search.addEventListener("input", applyFilters);
    el.region.addEventListener("change", applyFilters);
    el.reset.addEventListener("click", resetAll);
    if (el.dashboardBtn) el.dashboardBtn.addEventListener("click", openDashboard);

    // Esc limpia la selección
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") clearSelection();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();

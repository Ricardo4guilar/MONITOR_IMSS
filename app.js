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
    dIso: document.getElementById("detailIso"),
    appsheetBtn: document.getElementById("appsheetBtn"),
    appsheetUrl: document.getElementById("appsheetUrlPreview"),
  };

  const SVG_NS = "http://www.w3.org/2000/svg";
  let selectedId = null;
  let offRegions = new Set(); // regiones ocultas desde la leyenda

  // Mapa de color por región, construido dinámicamente desde la tabla.
  let regionColors = Object.create(null);

  /* =============================================================
   *  CARGA DE DATOS: tabla EntidadesFederativas (Google Sheets)
   *  El mapa regenera regiones/colores a partir de esta tabla.
   * ============================================================= */
  const DATA = CFG.DATA || {};
  const COLS = DATA.COLUMNS || { iso: "clave_iso", name: "entidad_federativa", region: "region", color: "color" };

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
    if (!objs) { // sin tabla: deriva colores de las regiones por defecto
      buildRegionColorsFromDefaults();
      return;
    }
    const seenRegions = [];
    objs.forEach((o) => {
      const iso = (o[COLS.iso] || "").trim();
      const st = byId[iso];
      if (!st) return; // ignora filas que no corresponden a un estado del mapa
      const region = (o[COLS.region] || st.region || "").trim();
      const color = (o[COLS.color] || "").trim();
      st.region = region || st.region;
      if (color) st.color = color;
      if (o[COLS.name]) st.name = o[COLS.name].trim();
      if (region && !seenRegions.includes(region)) seenRegions.push(region);
    });
    buildRegionColors(seenRegions);
  }

  // Construye el diccionario región->color (prioriza color explícito de la tabla).
  function buildRegionColors(regionOrder) {
    regionColors = Object.create(null);
    const regions = regionOrder && regionOrder.length ? regionOrder : uniqueRegions();
    regions.forEach((r, i) => {
      // Si algún estado de esa región trae color explícito, úsalo.
      const withColor = MAP.states.find((s) => s.region === r && s.color);
      regionColors[r] = withColor ? withColor.color : FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];
    });
    // Estados con color propio que no definieron región también se respetan en paint.
  }

  function buildRegionColorsFromDefaults() {
    const css = getComputedStyle(document.documentElement);
    const def = {
      Centro: "--r-centro", Noreste: "--r-noreste", Noroeste: "--r-noroeste",
      Occidente: "--r-occidente", Oriente: "--r-oriente", Sur: "--r-sur", Sureste: "--r-sureste",
    };
    regionColors = Object.create(null);
    uniqueRegions().forEach((r, i) => {
      const v = def[r] ? css.getPropertyValue(def[r]).trim() : "";
      regionColors[r] = v || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];
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
  const REGION_VARS = {
    Centro: "--r-centro", Noreste: "--r-noreste", Noroeste: "--r-noroeste",
    Occidente: "--r-occidente", Oriente: "--r-oriente", Sur: "--r-sur", Sureste: "--r-sureste",
  };

  function uniqueRegions() {
    return [...new Set(MAP.states.map((s) => s.region))].sort();
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
    el.dName.textContent = state.name;
    el.dRegion.textContent = state.region;
    el.dRegion2.textContent = state.region;
    el.dCapital.textContent = state.capital;
    el.dIso.textContent = state.id;

    el.appsheetBtn.dataset.stateId = id;
    updateAppsheetPreview(state);
  }

  function clearSelection() {
    selectedId = null;
    document.querySelectorAll(".map-stage path.is-selected")
      .forEach((p) => p.classList.remove("is-selected"));
    el.panelDetail.hidden = true;
    el.panelEmpty.hidden = false;
  }

  /* ---------- Acción AppSheet (deep-link por clave_iso) ---------- */
  function pickFilterValue(state) {
    switch (CFG.FILTER_VALUE_FIELD) {
      case "iso": return state.id;
      case "abbr": return state.abbr;
      case "name":
      default: return state.name;
    }
  }

  // Base del deep-link de AppSheet a partir de APP_ID / APP_NAME.
  function appsheetBase() {
    if (CFG.APP_URL) return CFG.APP_URL.replace(/\/+$/, "");
    if (CFG.APP_ID) {
      // Formato de ejecución (end-user) de AppSheet.
      return "https://www.appsheet.com/start/" + CFG.APP_ID;
    }
    return "";
  }

  // Construye el deep-link de AppSheet para el estado dado.
  // Patrón: .../start/<APP_ID>#view=<Vista>&<columna>=<valor>
  function buildAppsheetUrl(state) {
    const base = appsheetBase();
    if (!base) return "";
    const col = CFG.FILTER_COLUMN || "clave_iso";
    const val = pickFilterValue(state);
    const frag = new URLSearchParams();
    if (CFG.VIEW_NAME) frag.set("view", CFG.VIEW_NAME);
    frag.set(col, val);
    // AppSheet usa el fragmento (#) para el enrutado de vistas en el cliente.
    return base + "#" + frag.toString();
  }

  function updateAppsheetPreview(state) {
    const url = buildAppsheetUrl(state);
    el.appsheetBtn.disabled = false;
    el.appsheetUrl.textContent = url
      ? url
      : "Falta APP_ID/APP_URL en appsheet-config.js.";
  }

  // Dispara la conexión (navegación o hook).
  function connectToAppsheet() {
    const id = el.appsheetBtn.dataset.stateId;
    const state = byId[id];
    if (!state) return;

    const url = buildAppsheetUrl(state);

    // Hook personalizado (p.ej. postMessage a un iframe embebido).
    if (typeof CFG.onConnect === "function") {
      CFG.onConnect(state, url);
      return;
    }

    if (!url) {
      alert("Falta APP_ID o APP_URL en appsheet-config.js para abrir AppSheet.");
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

    // 2) Construir leyenda/filtro con las regiones resultantes y pintar.
    buildLegendAndFilter();
    paintStates();
    applyFilters();

    // 3) Si AppSheet envió ?clave_iso=MX..., seleccionar esa entidad.
    selectStateFromUrl();

    el.search.addEventListener("input", applyFilters);
    el.region.addEventListener("change", applyFilters);
    el.reset.addEventListener("click", resetAll);
    el.appsheetBtn.addEventListener("click", connectToAppsheet);

    // Esc limpia la selección
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") clearSelection();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();

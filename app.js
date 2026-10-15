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
    zoomIn: document.getElementById("zoomInBtn"),
    zoomOut: document.getElementById("zoomOutBtn"),
    zoomRestore: document.getElementById("zoomRestoreBtn"),
    zoomLevel: document.getElementById("zoomLevel"),
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
   *  TagMap(): ancla iconos de métricas (Lucide) DENTRO de cada estado
   *  del mapa como referencia visual de la existencia de la métrica:
   *    - Hospital (hospitales identificados)
   *    - Wrench   (servicios realizados)
   *    - Bot      (agentes instalados)
   *
   *  Reglas:
   *   - Los iconos son SIEMPRE blancos y quedan por encima del mapa (z+1):
   *     el grupo <g class="map-tags"> se mantiene como el último hijo del
   *     SVG, incluso tras seleccionar un estado (ver keepTagsOnTop()).
   *   - Los iconos se colocan en un punto interior del polígono (no en el
   *     centro de la caja, que puede caer fuera en formas irregulares).
   *   - Si el estado no tiene espacio para alojar los iconos (no caben
   *     dentro del polígono) o el zoom es bajo, se sustituyen por un punto
   *     negro cuadrado (T). ZoomMap() alterna (T) <-> iconos según el zoom.
   * ============================================================= */
  // Orden y mapeo de las métricas a su icono Lucide.
  const TAG_DEFS = [
    { key: "hospitales", icon: "hospital" },
    { key: "servicios",  icon: "wrench" },
    { key: "agentes",    icon: "bot" },
  ];

  // Definición de los iconos Lucide (viewBox 0 0 24 24) como SVG nativo
  // (no foreignObject) para control total de tamaño/color y evitar recortes.
  // Fuente: https://lucide.dev (ISC). Cada icono es una lista de elementos.
  const LUCIDE_ICONS = {
    hospital: [
      { t: "path", d: "M12 7v4" },
      { t: "path", d: "M14 21v-3a2 2 0 0 0-4 0v3" },
      { t: "path", d: "M14 9h-4" },
      { t: "path", d: "M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" },
      { t: "path", d: "M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16" },
    ],
    wrench: [
      { t: "path", d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" },
    ],
    bot: [
      { t: "path", d: "M12 8V4H8" },
      { t: "rect", width: 16, height: 12, x: 4, y: 8, rx: 2 },
      { t: "path", d: "M2 14h2" },
      { t: "path", d: "M20 14h2" },
      { t: "path", d: "M15 13v2" },
      { t: "path", d: "M9 13v2" },
    ],
  };

  // Construye un <g> con el icono Lucide nativo, escalado a `size` y
  // centrado en (cx, cy), con trazo blanco. (viewBox base 24x24)
  function buildIcon(name, cx, cy, size, stateId) {
    const parts = LUCIDE_ICONS[name];
    if (!parts) return null;
    const scale = size / 24;
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "map-tag");
    g.setAttribute("data-id", stateId);
    g.setAttribute(
      "transform",
      "translate(" + (cx - size / 2) + "," + (cy - size / 2) + ") scale(" + scale + ")"
    );
    parts.forEach((p) => {
      const node = document.createElementNS(SVG_NS, p.t);
      if (p.t === "path") {
        node.setAttribute("d", p.d);
      } else if (p.t === "rect") {
        node.setAttribute("x", p.x);
        node.setAttribute("y", p.y);
        node.setAttribute("width", p.width);
        node.setAttribute("height", p.height);
        if (p.rx != null) node.setAttribute("rx", p.rx);
      }
      g.appendChild(node);
    });
    return g;
  }
  // Tamaño base del icono en unidades del viewBox del SVG.
  const TAG_SIZE = 12;
  const TAG_GAP = 1.5;          // separación horizontal entre iconos
  const DOT_SIZE = 5;           // lado del punto negro cuadrado (T)

  // Cache de puntos interiores por estado (evita recomputar en cada zoom).
  const interiorCache = Object.create(null);

  /* Devuelve un punto interior "cómodo" del polígono (aprox. al polo de
   * inaccesibilidad): muestrea una rejilla dentro de la caja envolvente y
   * elige el punto interior más alejado del borde del path. */
  function interiorPoint(path) {
    const id = path.getAttribute("data-id");
    if (interiorCache[id]) return interiorCache[id];

    const svg = path.ownerSVGElement;
    let bb;
    try { bb = path.getBBox(); } catch (e) { return null; }

    const pt = svg.createSVGPoint();
    const inside = (x, y) => {
      pt.x = x; pt.y = y;
      return path.isPointInFill(pt);
    };

    const steps = 12;
    let best = null, bestScore = -1;
    for (let i = 1; i < steps; i++) {
      for (let j = 1; j < steps; j++) {
        const x = bb.x + (bb.width * i) / steps;
        const y = bb.y + (bb.height * j) / steps;
        if (!inside(x, y)) continue;
        // Puntúa por distancia mínima al borde del bbox y a puntos externos
        // cercanos (aprox. de "qué tan hacia dentro" está el punto).
        const r = Math.min(bb.width, bb.height) / 3;
        let score = 0;
        // Prueba 8 direcciones a distancia r: cuántas siguen dentro.
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          if (inside(x + Math.cos(ang) * r, y + Math.sin(ang) * r)) score++;
        }
        if (score > bestScore) { bestScore = score; best = { x, y, bb }; }
      }
    }
    // Respaldo: centro del bbox si está dentro, si no, el primer punto hallado.
    if (!best) {
      const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      best = { x: cx, y: cy, bb };
    }
    interiorCache[id] = best;
    return best;
  }

  /* ¿Caben `count` iconos (en línea) centrados en (cx,cy) dentro del path?
   * Comprueba que las esquinas de la caja de iconos estén dentro del fill. */
  function iconsFit(path, cx, cy, count, scale) {
    const svg = path.ownerSVGElement;
    const pt = svg.createSVGPoint();
    const inside = (x, y) => { pt.x = x; pt.y = y; return path.isPointInFill(pt); };

    const size = TAG_SIZE * scale;
    const gap = TAG_GAP * scale;
    const w = count * size + (count - 1) * gap;
    const h = size;
    const x0 = cx - w / 2, y0 = cy - h / 2;
    // Esquinas + centro de la caja total.
    const probes = [
      [x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h],
      [cx, cy],
    ];
    return probes.every(([x, y]) => inside(x, y));
  }

  /* Construye el grupo <g.map-tags> según el estado de zoom actual. */
  function TagMap() {
    const svg = el.stage.querySelector("svg");
    if (!svg) return;

    // Limpia tags previos (re-render al recargar métricas o al hacer zoom).
    const old = svg.querySelector(".map-tags");
    if (old) old.remove();

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "map-tags");

    // A mayor zoom, los iconos del mapa deben verse del mismo tamaño en
    // pantalla, así que se escalan en sentido inverso al zoom.
    const iconScale = 1 / zoomState.scale;

    MAP.states.forEach((s) => {
      const path = document.getElementById("path-" + s.id);
      if (!path) return;

      const m = metricsFor(s.id);
      const icons = TAG_DEFS.filter((d) => (m[d.key] || 0) > 0).map((d) => d.icon);
      if (!icons.length) return;

      const ip = interiorPoint(path);
      if (!ip) return;
      const cx = ip.x, cy = ip.y;

      // Decide iconos vs. punto (T):
      //  - Siempre se intenta mostrar los iconos del estado.
      //  - Si NO caben dentro del polígono a la escala aparente actual se
      //    usa el punto negro cuadrado (T).
      //  Al hacer zoom-in los iconos aparentes miden lo mismo en pantalla
      //  (iconScale = 1/scale), por lo que en coordenadas del mapa se
      //  reducen y acaban cabiendo: así (T) -> iconos. Al hacer zoom-out
      //  crecen en coordenadas del mapa y dejan de caber: iconos -> (T).
      const fits = iconsFit(path, cx, cy, icons.length, iconScale);

      if (fits) {
        renderIconsInto(group, s.id, icons, cx, cy, iconScale);
      } else {
        renderDotInto(group, s.id, cx, cy, iconScale);
      }
    });

    svg.appendChild(group);
    keepTagsOnTop();          // asegura z+1 sobre el mapa
    syncTagVisibility();      // sincroniza atenuado con el filtro
  }

  // Inserta los iconos (SVG nativo) centrados en (cx,cy) dentro del grupo.
  function renderIconsInto(group, stateId, icons, cx, cy, scale) {
    const size = TAG_SIZE * scale;
    const gap = TAG_GAP * scale;
    const total = icons.length * size + (icons.length - 1) * gap;
    // Posición del centro de cada icono, de izquierda a derecha.
    let x = cx - total / 2 + size / 2;
    icons.forEach((icon) => {
      const g = buildIcon(icon, x, cy, size, stateId);
      if (g) group.appendChild(g);
      x += size + gap;
    });
  }

  // Inserta el punto negro cuadrado (T) centrado en (cx,cy).
  function renderDotInto(group, stateId, cx, cy, scale) {
    const side = DOT_SIZE * scale;
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", cx - side / 2);
    rect.setAttribute("y", cy - side / 2);
    rect.setAttribute("width", side);
    rect.setAttribute("height", side);
    rect.setAttribute("rx", side * 0.18);
    rect.setAttribute("class", "map-dot");
    rect.setAttribute("data-id", stateId);
    group.appendChild(rect);
  }

  /* Mantiene el grupo de tags como ÚLTIMO hijo del SVG para que quede
   * siempre por encima del mapa (z+1), incluso tras seleccionar un estado
   * (selectState reordena su path al frente). */
  function keepTagsOnTop() {
    const svg = el.stage.querySelector("svg");
    if (!svg) return;
    const group = svg.querySelector(".map-tags");
    if (group && group !== svg.lastElementChild) svg.appendChild(group);
  }

  // Atenúa los tags cuyos estados están ocultos por el filtro/leyenda.
  function syncTagVisibility() {
    const svg = el.stage.querySelector("svg");
    if (!svg) return;
    svg.querySelectorAll(".map-tag, .map-dot").forEach((tag) => {
      const id = tag.getAttribute("data-id");
      const path = document.getElementById("path-" + id);
      const dimmed = path && path.classList.contains("is-dimmed");
      tag.classList.toggle("is-dimmed", !!dimmed);
    });
  }

  // Ejecuta lucide.createIcons() de forma segura (cards + tags del mapa).
  function renderLucideIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    } else {
      console.warn("Lucide no está disponible: los iconos no se renderizarán.");
    }
  }

  /* =============================================================
   *  ZoomMap(): control de zoom del mapa con zoom-in / zoom-out /
   *  zoom-restore. El zoom escala el <svg> con CSS transform.
   *   - zoom-restore: tamaño real (escala 1, estado actual del mapa).
   *   - zoom-in : aumenta la escala. Los iconos del mapa mantienen su
   *               tamaño en pantalla, por lo que ocupan menos área del
   *               polígono y los puntos (T) que ya caben se reemplazan
   *               por los iconos del estado.
   *   - zoom-out: reduce la escala; los iconos crecen respecto al mapa y
   *               los que dejan de caber vuelven a (T).
   *  Tras cada cambio de zoom se re-ejecuta TagMap() para recalcular
   *  (T) <-> iconos y el tamaño aparente de los iconos.
   * ============================================================= */
  const ZOOM_MIN = 1;          // zoom-restore = tamaño real (actual)
  const ZOOM_MAX = 4;
  const ZOOM_STEP = 0.5;
  const zoomState = { scale: 1 };

  function applyZoom() {
    const svg = el.stage.querySelector("svg");
    if (svg) svg.style.transform = "scale(" + zoomState.scale + ")";
    if (el.zoomLevel) el.zoomLevel.textContent = Math.round(zoomState.scale * 100) + "%";
    if (el.zoomOut) el.zoomOut.disabled = zoomState.scale <= ZOOM_MIN + 1e-6;
    if (el.zoomIn) el.zoomIn.disabled = zoomState.scale >= ZOOM_MAX - 1e-6;
    // Recalcula iconos vs. (T) y su tamaño aparente a la nueva escala.
    TagMap();
  }

  function ZoomMap(action) {
    switch (action) {
      case "in":
        zoomState.scale = Math.min(ZOOM_MAX, +(zoomState.scale + ZOOM_STEP).toFixed(2));
        break;
      case "out":
        zoomState.scale = Math.max(ZOOM_MIN, +(zoomState.scale - ZOOM_STEP).toFixed(2));
        break;
      case "restore":
      default:
        zoomState.scale = ZOOM_MIN; // tamaño real
        break;
    }
    applyZoom();
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

    // Mantén los iconos de métricas (TagMap) atenuados junto a sus estados.
    syncTagVisibility();
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
      // resplandor (drop-shadow) no queda tapado por estados vecinos. Pero
      // los iconos (map-tags) deben quedar SIEMPRE encima (z+1), por lo que
      // tras reordenar el path se vuelven a subir los tags.
      path.parentNode.appendChild(path);
      keepTagsOnTop();
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
    ZoomMap("restore"); // vuelve el mapa a su tamaño real
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

    // 3.1) Anclar iconos de métricas (Lucide) a los estados del mapa y
    //      materializar también los iconos de las cards.
    TagMap();

    // 4) Si AppSheet envió ?clave_iso=MX..., seleccionar esa entidad.
    selectStateFromUrl();

    el.search.addEventListener("input", applyFilters);
    el.region.addEventListener("change", applyFilters);
    el.reset.addEventListener("click", resetAll);
    if (el.dashboardBtn) el.dashboardBtn.addEventListener("click", openDashboard);

    // Controles de zoom del mapa (ZoomMap).
    if (el.zoomIn) el.zoomIn.addEventListener("click", () => ZoomMap("in"));
    if (el.zoomOut) el.zoomOut.addEventListener("click", () => ZoomMap("out"));
    if (el.zoomRestore) el.zoomRestore.addEventListener("click", () => ZoomMap("restore"));
    applyZoom(); // estado inicial de botones/etiqueta (100%)

    // Esc limpia la selección
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") clearSelection();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();

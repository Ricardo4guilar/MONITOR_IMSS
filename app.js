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
    panelEmptyIcon: document.querySelector(".panel-empty-icon"),
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
  // Tamaño base del icono en unidades del viewBox del SVG (+15%).
  const TAG_SIZE = 13.8;        // antes 12 (+15%)
  const TAG_GAP = 1.5;          // separación horizontal entre iconos
  const DOT_SIZE = 5.75;        // lado del punto negro cuadrado (T), antes 5 (+15%)

  /* Coordenadas (x,y) en el viewBox del mapa de la CAPITAL geográfica de
   * cada estado. Derivadas proyectando la lat/lng real de cada capital con
   * una transformación afín calibrada contra el propio mapa (Simplemaps).
   * Los iconos se anclan a estas coordenadas; si la capital cae fuera del
   * polígono (estados pequeños y muy juntos), se hace clamp al punto
   * interior del estado (ver capitalAnchor). */
  const CAPITAL_XY = {
    MXSON:{x:249.4,y:154.2}, MXBCN:{x:119.9,y:44.1}, MXCHH:{x:398.1,y:165.3},
    MXCOA:{x:546.6,y:264.3}, MXTAM:{x:599.8,y:316.7}, MXNLE:{x:568.4,y:255.5},
    MXROO:{x:920.3,y:476.2}, MXCAM:{x:854.9,y:435.7}, MXTAB:{x:776.2,y:495.5},
    MXCHP:{x:768.0,y:534.9}, MXCOL:{x:447.8,y:461.9}, MXNAY:{x:417.3,y:390.8},
    MXBCS:{x:257.1,y:310.3}, MXSIN:{x:348.6,y:287.5}, MXYUC:{x:886.7,y:399.1},
    MXVER:{x:658.1,y:448.5}, MXJAL:{x:462.8,y:416.8}, MXMIC:{x:527.0,y:446.0},
    MXGRO:{x:573.4,y:513.2}, MXOAX:{x:657.7,y:526.7}, MXMEX:{x:573.0,y:458.3},
    MXPUE:{x:617.0,y:465.2}, MXMOR:{x:585.5,y:469.5}, MXQUE:{x:553.6,y:417.3},
    MXHID:{x:602.6,y:431.9}, MXGUA:{x:528.0,y:404.2}, MXSLP:{x:539.2,y:367.9},
    MXZAC:{x:491.5,y:349.4}, MXAGU:{x:498.3,y:377.3}, MXDUR:{x:430.9,y:310.7},
    MXTLA:{x:616.6,y:456.5}, MXCMX:{x:589.5,y:453.3},
  };

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

  /* Devuelve el punto de anclaje de los iconos para un estado: la CAPITAL
   * geográfica si está definida y cae dentro del polígono; si cae fuera
   * (imprecisión de proyección en estados pequeños), hace clamp al punto
   * del interior del estado más cercano a la capital sobre el segmento
   * capital→punto-interior. Si no hay capital, usa el punto interior. */
  function capitalAnchor(path, stateId) {
    const ip = interiorPoint(path);
    const cap = CAPITAL_XY[stateId];
    if (!cap) return ip;
    if (!ip) return cap;

    const svg = path.ownerSVGElement;
    const pt = svg.createSVGPoint();
    const inside = (x, y) => { pt.x = x; pt.y = y; return path.isPointInFill(pt); };

    // La capital cae dentro -> úsala tal cual.
    if (inside(cap.x, cap.y)) return { x: cap.x, y: cap.y };

    // Cae fuera -> busca el punto más cercano a la capital que esté dentro,
    // interpolando entre la capital y el punto interior del estado.
    let lo = 0, hi = 1, best = { x: ip.x, y: ip.y };
    for (let i = 0; i < 18; i++) {
      const t = (lo + hi) / 2;
      const x = cap.x + (ip.x - cap.x) * t;
      const y = cap.y + (ip.y - cap.y) * t;
      if (inside(x, y)) { best = { x, y }; hi = t; } // dentro: acércate más a la capital
      else { lo = t; }                                 // fuera: aléjate hacia el interior
    }
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

    // Los iconos deben verse SIEMPRE del mismo tamaño en pantalla sin
    // importar el zoom. El zoom se hace por viewBox (ver ZoomMap), así que
    // el tamaño en coordenadas del mapa debe ser proporcional al ancho
    // actual del viewBox respecto al original: menos viewBox (más zoom) ->
    // iconos más pequeños en coords del mapa -> tamaño constante en px.
    const iconScale = mapView.w / BASE.w;

    MAP.states.forEach((s) => {
      const path = document.getElementById("path-" + s.id);
      if (!path) return;

      const m = metricsFor(s.id);
      const icons = TAG_DEFS.filter((d) => (m[d.key] || 0) > 0).map((d) => d.icon);
      if (!icons.length) return;

      // Ancla los iconos a la capital geográfica del estado (con respaldo
      // al interior del polígono si la capital cae fuera por la proyección).
      const anchor = capitalAnchor(path, s.id);
      if (!anchor) return;
      const cx = anchor.x, cy = anchor.y;
      // Todos los estados con métrica > 0 muestran SIEMPRE el punto negro
      // cuadrado (T), sin importar el zoom. (Los iconos de las cards de
      // métricas no cambian; solo cambia el marcador del mapa.)
      renderDotInto(group, s.id, cx, cy, iconScale);
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
   *  zoom-restore. El zoom se hace por VIEWBOX del SVG (zoom + paneo
   *  reales, estilo mapa), no con CSS transform, para que:
   *   - Los iconos del mapa se mantengan SIEMPRE del mismo tamaño en
   *     pantalla (TagMap escala su tamaño en coords del mapa según el
   *     ancho actual del viewBox), sin distorsionarse al hacer zoom-in.
   *   - El mapa se pueda desplazar con click sostenido (ver setupPan).
   *
   *   - zoom-restore: viewBox original = tamaño real (100%).
   *   - zoom-in : reduce el viewBox (acerca). Los (T) que ya caben pasan
   *               a iconos (porque ocupan menos área del polígono).
   *   - zoom-out: amplía el viewBox (aleja); los iconos que dejan de caber
   *               vuelven a (T). No se puede alejar más allá del original.
   *  Tras cada cambio se re-ejecuta TagMap() para recalcular (T) <-> iconos
   *  y el tamaño aparente de los iconos.
   * ============================================================= */
  const ZOOM_MIN = 1;          // zoom-restore = tamaño real (100%)
  const ZOOM_MAX = 6;          // acercamiento máximo
  const ZOOM_FACTOR = 1.4;     // paso de zoom por clic

  // viewBox original del mapa ("x y w h") -> base inmutable.
  const BASE = (function () {
    const p = String(MAP.viewBox).trim().split(/\s+/).map(Number);
    return { x: p[0] || 0, y: p[1] || 0, w: p[2] || 1000, h: p[3] || 630 };
  })();
  // viewBox actual (mutable con zoom/pan).
  const mapView = { x: BASE.x, y: BASE.y, w: BASE.w, h: BASE.h };

  // Factor de zoom visible (1 = 100%).
  function zoomFactor() { return BASE.w / mapView.w; }

  // Aplica el viewBox actual al SVG, actualiza controles y re-renderiza tags.
  function applyView() {
    const svg = el.stage.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("viewBox", mapView.x + " " + mapView.y + " " + mapView.w + " " + mapView.h);
    const f = zoomFactor();
    if (el.zoomLevel) el.zoomLevel.textContent = Math.round(f * 100) + "%";
    if (el.zoomOut) el.zoomOut.disabled = f <= ZOOM_MIN + 1e-3;
    if (el.zoomIn) el.zoomIn.disabled = f >= ZOOM_MAX - 1e-3;
    // Recalcula iconos vs. (T) y su tamaño aparente (constante en pantalla).
    TagMap();
  }

  // Mantiene el viewBox dentro de los límites del mapa (no salirse al panear).
  function clampView() {
    // Limita el tamaño por el zoom permitido.
    const minW = BASE.w / ZOOM_MAX, maxW = BASE.w;
    mapView.w = Math.min(maxW, Math.max(minW, mapView.w));
    mapView.h = mapView.w * (BASE.h / BASE.w);
    // Limita la posición para no mostrar vacío fuera del mapa.
    mapView.x = Math.min(BASE.x + BASE.w - mapView.w, Math.max(BASE.x, mapView.x));
    mapView.y = Math.min(BASE.y + BASE.h - mapView.h, Math.max(BASE.y, mapView.y));
  }

  // Zoom centrado en un punto del mapa (cx,cy en coords del viewBox).
  function zoomAt(factor, cx, cy) {
    const newW = mapView.w / factor;
    const newH = mapView.h / factor;
    // Mantén el punto (cx,cy) en la misma posición relativa de la vista.
    const relX = (cx - mapView.x) / mapView.w;
    const relY = (cy - mapView.y) / mapView.h;
    mapView.x = cx - relX * newW;
    mapView.y = cy - relY * newH;
    mapView.w = newW;
    mapView.h = newH;
    clampView();
    applyView();
  }

  function ZoomMap(action) {
    const cx = mapView.x + mapView.w / 2; // centro actual de la vista
    const cy = mapView.y + mapView.h / 2;
    switch (action) {
      case "in":
        zoomAt(Math.min(ZOOM_FACTOR, ZOOM_MAX / zoomFactor()), cx, cy);
        break;
      case "out":
        zoomAt(Math.max(1 / ZOOM_FACTOR, ZOOM_MIN / zoomFactor()), cx, cy);
        break;
      case "restore":
      default:
        mapView.x = BASE.x; mapView.y = BASE.y; mapView.w = BASE.w; mapView.h = BASE.h;
        applyView();
        break;
    }
  }

  /* ---------- Paneo con click sostenido del ratón ----------
   * Arrastra el mapa moviendo el viewBox en sentido contrario al cursor.
   * Convierte el desplazamiento en píxeles a unidades del viewBox usando
   * la escala actual (mapView.w / anchoEnPx). */
  function setupPan() {
    const svg = el.stage.querySelector("svg");
    if (!svg) return;

    let dragging = false, moved = false;
    let startClientX = 0, startClientY = 0;
    let startViewX = 0, startViewY = 0;

    const unitsPerPx = () => {
      const rect = svg.getBoundingClientRect();
      return { ux: mapView.w / rect.width, uy: mapView.h / rect.height };
    };

    svg.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;      // solo botón izquierdo
      dragging = true; moved = false;
      startClientX = e.clientX; startClientY = e.clientY;
      startViewX = mapView.x; startViewY = mapView.y;
      svg.classList.add("is-panning");
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const { ux, uy } = unitsPerPx();
      const dx = (e.clientX - startClientX) * ux;
      const dy = (e.clientY - startClientY) * uy;
      if (Math.abs(e.clientX - startClientX) > 3 || Math.abs(e.clientY - startClientY) > 3) {
        moved = true;
      }
      mapView.x = startViewX - dx;
      mapView.y = startViewY - dy;
      clampView();
      // Durante el arrastre basta con mover el viewBox (sin recalcular tags
      // cada frame es más fluido; TagMap no depende de x/y, solo del ancho).
      svg.setAttribute("viewBox", mapView.x + " " + mapView.y + " " + mapView.w + " " + mapView.h);
    });

    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      svg.classList.remove("is-panning");
    });

    // Evita que un arrastre dispare la selección del estado (click).
    svg.addEventListener("click", (e) => {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);

    // Rueda del ratón: zoom centrado en el cursor.
    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const cx = mapView.x + ((e.clientX - rect.left) / rect.width) * mapView.w;
      const cy = mapView.y + ((e.clientY - rect.top) / rect.height) * mapView.h;
      const f = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const clamped = Math.min(
        ZOOM_MAX / zoomFactor(),
        Math.max(ZOOM_MIN / zoomFactor(), f)
      );
      zoomAt(clamped, cx, cy);
    }, { passive: false });
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
  /* ---------- Loader inicial (efecto pulse durante la carga) ----------
   * Activa el "latido" en el mapa y en el icono line-dot-top-vertical del
   * panel informativo mientras se consumen los datos. Al terminar la carga
   * (con o sin respuesta) se detienen los efectos. */
  function startLoading() {
    if (el.stage) el.stage.classList.add("is-loading");
    if (el.panelEmptyIcon) el.panelEmptyIcon.classList.add("is-loading");
  }
  function stopLoading() {
    if (el.stage) el.stage.classList.remove("is-loading");
    if (el.panelEmptyIcon) el.panelEmptyIcon.classList.remove("is-loading");
  }

  async function init() {
    renderMap();

    // Materializa los iconos Lucide (incluido el del panel vacío) ANTES de
    // cargar datos, para que el efecto pulse del icono sea visible ya.
    renderLucideIcons();

    // Inicia el loader (pulse en mapa + icono del panel) durante la carga.
    startLoading();

    try {
      // 1) Cargar la tabla EntidadesFederativas y regenerar región/color.
      const objs = await loadEntidades();
      applyEntidades(objs);

      // 2) Cargar las métricas por entidad (hospitales/servicios/agentes).
      await MapeoEntidad();

      // 3) Construir leyenda/filtro con las regiones resultantes y pintar.
      buildLegendAndFilter();
      paintStates();
      applyFilters();

      // 3.1) Anclar los marcadores del mapa y materializar los iconos de
      //      las cards de métricas.
      TagMap();
      renderLucideIcons();

      // 4) Si AppSheet envió ?clave_iso=MX..., seleccionar esa entidad.
      selectStateFromUrl();
    } finally {
      // Detiene el loader al tener respuesta y consumir la data (o si falla).
      stopLoading();
    }

    el.search.addEventListener("input", applyFilters);
    el.region.addEventListener("change", applyFilters);
    el.reset.addEventListener("click", resetAll);
    if (el.dashboardBtn) el.dashboardBtn.addEventListener("click", openDashboard);

    // Controles de zoom del mapa (ZoomMap) + paneo con click sostenido.
    if (el.zoomIn) el.zoomIn.addEventListener("click", () => ZoomMap("in"));
    if (el.zoomOut) el.zoomOut.addEventListener("click", () => ZoomMap("out"));
    if (el.zoomRestore) el.zoomRestore.addEventListener("click", () => ZoomMap("restore"));
    setupPan();   // desplazamiento del mapa arrastrando con el ratón
    applyView();  // estado inicial del viewBox/botones/etiqueta (100%)

    // Esc limpia la selección
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") clearSelection();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();

/* =============================================================
 *  CONFIGURACIÓN DE CONEXIÓN: MAPA  ↔  APPSHEET  ↔  GOOGLE SHEETS
 *  -------------------------------------------------------------
 *  Edita SOLO este archivo para ajustar la conexión.
 * ============================================================= */
window.APPSHEET_CONFIG = {

  /* ----------------------------------------------------------
   *  1) APPSHEET (Mapa  ->  AppSheet, deep-link por clave_iso)
   * ---------------------------------------------------------- */

  // ID y nombre de tu app (de la URL que proporcionaste).
  APP_ID:   "87f67b7f-1660-4dca-8822-aa34a41bf1e8",
  APP_NAME: "MONITORKaspersky4N-558781516",

  // Vista de AppSheet a la que se salta al hacer clic en un estado.
  VIEW_NAME: "Mapa",

  // Vista de AppSheet del botón global "Abrir Dashboard" (fuera de la card).
  // No lleva filtro por estado; abre el tablero general.
  DASHBOARD_VIEW: "Dashboard",

  // Columna de la tabla AppSheet usada como filtro del deep-link.
  // En tu tabla EntidadesFederativas la clave ISO es la columna "Clave".
  FILTER_COLUMN: "Clave",

  // Qué valor del estado enviar como filtro:
  //   "iso"  -> "MXJAL"   (recomendado; corresponde a la columna "Clave")
  //   "name" -> "Jalisco"
  //   "abbr" -> "JAL"
  FILTER_VALUE_FIELD: "iso",

  // Abrir en nueva pestaña (true) o en la misma (false).
  OPEN_IN_NEW_TAB: true,

  // Hook opcional en lugar de la navegación por URL (p.ej. postMessage
  // a un iframe de AppSheet embebido). Recibe (state, url).
  onConnect: null,


  /* ----------------------------------------------------------
   *  2) GOOGLE SHEETS (tabla EntidadesFederativas  ->  Mapa)
   *     El mapa regenera regiones/colores a partir de esta tabla.
   * ---------------------------------------------------------- */
  DATA: {
    // ID del spreadsheet (de la URL que proporcionaste).
    SHEET_ID: "1vq6DFGnCjNu-hlcmFbnAIqiEnTwtaCIMwpPz9KlPnfk",

    // Nombre de la pestaña/hoja con los datos.
    SHEET_NAME: "EntidadesFederativas",

    // gid de la hoja (de la URL: ...#gid=0).
    GID: "0",

    /*
     * URL de PUBLICACIÓN de la hoja (Archivo > Compartir > Publicar en la Web,
     * hoja EntidadesFederativas, formato CSV). Es pública y sin CORS, por eso
     * el mapa puede leerla en vivo desde el navegador.
     */
    PUBLISHED_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR326fXCMPwxyp_zolXbeBY0SjOpSnoDzuL4tFTqcvdD4oBVAxbmRZR6fdx2J8S_v4RiuxbBG7cLGsL/pub?gid=0&single=true&output=csv",

    /*
     * MODO DE LECTURA:
     *  - "auto"   : intenta la URL publicada y si falla cae al CSV local.
     *  - "remote" : solo la URL publicada (lectura en vivo).
     *  - "local"  : solo el CSV local LOCAL_CSV (hoja privada).
     */
    MODE: "auto",

    // CSV local junto al mapa (exporta aquí tu hoja si es privada).
    LOCAL_CSV: "entidades_data.csv",

    /*
     * Mapeo de columnas de TU tabla EntidadesFederativas -> campos del mapa.
     * Encabezados reales de la hoja:
     *   NumeroEstado | Nombre | Clave | Region | TipoEspacio
     */
    COLUMNS: {
      iso:    "Clave",         // clave ISO del estado (MXAGU, …)
      name:   "Nombre",        // nombre del estado
      region: "Region",        // región (ej. "Norte/ Occidente", "Metropolitano")
      color:  "",              // la hoja no trae color: se autogenera por región
    },

    /*
     * MÉTRICAS POR ENTIDAD (para la card de detalle):
     *   - Hospitales identificados: conteo de DirectorioHospital por EntidadRef.
     *   - Servicios realizados:     conteo de ReporteActividad por Entidad.
     *   - Agentes instalados:       suma de "Cantidad de agentes instalados"
     *                               (ReporteActividad) por Entidad.
     * Como el spreadsheet es privado y no es legible por CORS desde el
     * navegador, estas métricas se precalculan en un CSV local agregado por
     * clave ISO. Regenera el CSV cuando cambien las tablas de origen.
     */
    METRICS: {
      /*
       * URL de PUBLICACIÓN de la hoja MetricasEntidad (Archivo > Compartir >
       * Publicar en la Web, hoja MetricasEntidad, formato CSV). Es pública y
       * sin CORS, por eso el mapa la lee en vivo desde el navegador (sirve en
       * GitHub Pages / Vercel). La hoja se recalcula sola con fórmulas
       * COUNTIF/SUMIF sobre DirectorioHospital y ReporteActividad.
       */
      PUBLISHED_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR326fXCMPwxyp_zolXbeBY0SjOpSnoDzuL4tFTqcvdD4oBVAxbmRZR6fdx2J8S_v4RiuxbBG7cLGsL/pub?gid=373781960&single=true&output=csv",

      /*
       * MODO DE LECTURA:
       *  - "auto"   : intenta la URL publicada y si falla cae al CSV local.
       *  - "remote" : solo la URL publicada (tiempo real).
       *  - "local"  : solo el CSV local LOCAL_CSV.
       */
      MODE: "auto",

      // CSV local de respaldo (foto precalculada) junto al mapa.
      LOCAL_CSV: "metricas_entidad.csv",

      COLUMNS: {
        iso:        "clave_iso",
        hospitales: "hospitales",
        servicios:  "servicios",
        agentes:    "agentes",
      },
    },
  },
};

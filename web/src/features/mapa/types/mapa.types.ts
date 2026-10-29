export type EstadoGeo = {
  id: string
  abbr: string
  name: string
  capital: string
  region: string
  /** Trazo SVG del contorno del estado. */
  d: string
}

export type Metricas = {
  hospitales: number
  servicios: number
  agentes: number
  equipos: number
}

/** Métricas indexadas por clave ISO del estado (MXJAL…): la clave es un dato, por eso es un Record. */
export type MetricasPorEstado = Record<string, Metricas>

export type EstadoMapa = EstadoGeo & { metricas: Metricas }

/** Fila de la tabla EntidadesFederativas ya validada. */
export type FilaEntidad = {
  clave: string
  nombre: string
  region: string
}

/** Rectángulo del mapa que se está viendo, en coordenadas del viewBox del SVG. */
export type VistaMapa = { x: number; y: number; w: number; h: number }

export type Punto = { x: number; y: number }

/** Caja del SVG en pantalla, como la devuelve getBoundingClientRect(). */
export type CajaEnPantalla = { left: number; top: number; width: number; height: number }

export type FuenteCsv = { tipo: 'remota' | 'local'; url: string }

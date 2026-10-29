import type { CajaEnPantalla, Punto, VistaMapa } from '@/features/mapa/types/mapa.types'

export const ZOOM_MIN = 1
export const ZOOM_MAX = 6
export const ZOOM_FACTOR = 1.4

/** "0 0 1000 630" → rectángulo. Si algo no es número, usa el tamaño del mapa original. */
export function parsearViewBox(texto: string): VistaMapa {
  const [x, y, w, h] = texto.trim().split(/\s+/).map(Number)
  return { x: x || 0, y: y || 0, w: w || 1000, h: h || 630 }
}

/** 1 = tamaño real (100 %). */
export function factorZoom(vista: VistaMapa, base: VistaMapa): number {
  return base.w / vista.w
}

/** Mantiene la vista dentro de los límites de zoom y del propio mapa. */
function limitar(vista: VistaMapa, base: VistaMapa): VistaMapa {
  const w = Math.min(base.w, Math.max(base.w / ZOOM_MAX, vista.w))
  const h = (w * base.h) / base.w
  return {
    w,
    h,
    x: Math.min(base.x + base.w - w, Math.max(base.x, vista.x)),
    y: Math.min(base.y + base.h - h, Math.max(base.y, vista.y)),
  }
}

/** Zoom que mantiene bajo (cx, cy) el mismo punto del mapa. */
function zoomEn(vista: VistaMapa, base: VistaMapa, factor: number, cx: number, cy: number): VistaMapa {
  const w = vista.w / factor
  const h = vista.h / factor
  const relativoX = (cx - vista.x) / vista.w
  const relativoY = (cy - vista.y) / vista.h
  return limitar({ x: cx - relativoX * w, y: cy - relativoY * h, w, h }, base)
}

function pasoPermitido(vista: VistaMapa, base: VistaMapa, sentido: 'acercar' | 'alejar'): number {
  const actual = factorZoom(vista, base)
  return sentido === 'acercar'
    ? Math.min(ZOOM_FACTOR, ZOOM_MAX / actual)
    : Math.max(1 / ZOOM_FACTOR, ZOOM_MIN / actual)
}

function centroDe(vista: VistaMapa): Punto {
  return { x: vista.x + vista.w / 2, y: vista.y + vista.h / 2 }
}

export function acercar(vista: VistaMapa, base: VistaMapa): VistaMapa {
  const { x, y } = centroDe(vista)
  return zoomEn(vista, base, pasoPermitido(vista, base, 'acercar'), x, y)
}

export function alejar(vista: VistaMapa, base: VistaMapa): VistaMapa {
  const { x, y } = centroDe(vista)
  return zoomEn(vista, base, pasoPermitido(vista, base, 'alejar'), x, y)
}

/** Zoom con la rueda, centrado en el punto del mapa que apunta el cursor. */
export function zoomConRueda(
  vista: VistaMapa,
  base: VistaMapa,
  sentido: 'acercar' | 'alejar',
  cx: number,
  cy: number,
): VistaMapa {
  return zoomEn(vista, base, pasoPermitido(vista, base, sentido), cx, cy)
}

/** Arrastra el mapa: `dx`/`dy` son lo que se movió el cursor, en unidades del mapa. */
export function panear(vista: VistaMapa, base: VistaMapa, dx: number, dy: number): VistaMapa {
  return limitar({ ...vista, x: vista.x - dx, y: vista.y - dy }, base)
}

/**
 * El SVG conserva su proporción y se centra en su caja: la escala la fija el lado que limita
 * (mismo criterio que `preserveAspectRatio="xMidYMid meet"`).
 */
function ajuste(caja: CajaEnPantalla, vista: VistaMapa) {
  const escala = Math.min(caja.width / vista.w, caja.height / vista.h)
  return {
    escala,
    margenX: (caja.width - vista.w * escala) / 2,
    margenY: (caja.height - vista.h * escala) / 2,
  }
}

/** Cuántas unidades del mapa equivale un píxel de pantalla. */
export function unidadesPorPixel(caja: CajaEnPantalla, vista: VistaMapa): number {
  return 1 / ajuste(caja, vista).escala
}

/** Convierte un punto de pantalla en coordenadas del mapa, descontando las bandas vacías. */
export function aCoordenadasDelMapa(
  caja: CajaEnPantalla,
  vista: VistaMapa,
  clientX: number,
  clientY: number,
): Punto {
  const { escala, margenX, margenY } = ajuste(caja, vista)
  return {
    x: vista.x + (clientX - caja.left - margenX) / escala,
    y: vista.y + (clientY - caja.top - margenY) / escala,
  }
}

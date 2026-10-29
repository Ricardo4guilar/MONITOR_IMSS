import { useCallback, useMemo, useReducer } from 'react'

import { VISTA_BASE } from '@/features/mapa/data/mapa-geo'
import type { VistaMapa } from '@/features/mapa/types/mapa.types'
import { acercar, alejar, factorZoom, panear, zoomConRueda, ZOOM_MAX, ZOOM_MIN } from '@/features/mapa/utils/zoom'

type Accion =
  | { tipo: 'acercar' }
  | { tipo: 'alejar' }
  | { tipo: 'restablecer' }
  | { tipo: 'rueda'; sentido: 'acercar' | 'alejar'; x: number; y: number }
  | { tipo: 'panear'; dx: number; dy: number }

function reducir(vista: VistaMapa, accion: Accion): VistaMapa {
  switch (accion.tipo) {
    case 'acercar':
      return acercar(vista, VISTA_BASE)
    case 'alejar':
      return alejar(vista, VISTA_BASE)
    case 'restablecer':
      return VISTA_BASE
    case 'rueda':
      return zoomConRueda(vista, VISTA_BASE, accion.sentido, accion.x, accion.y)
    case 'panear':
      return panear(vista, VISTA_BASE, accion.dx, accion.dy)
  }
}

/** Zoom y paneo del mapa. Las acciones tienen identidad estable: se pueden pasar como props sin re-render. */
export function useVistaMapa() {
  const [vista, enviar] = useReducer(reducir, VISTA_BASE)

  const acciones = useMemo(
    () => ({
      acercar: () => enviar({ tipo: 'acercar' }),
      alejar: () => enviar({ tipo: 'alejar' }),
      restablecer: () => enviar({ tipo: 'restablecer' }),
    }),
    [],
  )
  const rueda = useCallback(
    (sentido: 'acercar' | 'alejar', x: number, y: number) => enviar({ tipo: 'rueda', sentido, x, y }),
    [],
  )
  const arrastrar = useCallback((dx: number, dy: number) => enviar({ tipo: 'panear', dx, dy }), [])

  const factor = factorZoom(vista, VISTA_BASE)
  return {
    vista,
    factor,
    puedeAcercar: factor < ZOOM_MAX - 1e-3,
    puedeAlejar: factor > ZOOM_MIN + 1e-3,
    ...acciones,
    rueda,
    arrastrar,
  }
}

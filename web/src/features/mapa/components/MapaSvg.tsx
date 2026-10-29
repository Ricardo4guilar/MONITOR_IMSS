import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { ANCLAJES, VISTA_BASE } from '@/features/mapa/data/mapa-geo'
import type { EstadoMapa, VistaMapa } from '@/features/mapa/types/mapa.types'
import { aCoordenadasDelMapa, unidadesPorPixel } from '@/features/mapa/utils/zoom'
import { cn } from '@/lib/utils'

/** Lado del marcador en unidades del mapa a 100 % de zoom. */
const LADO_MARCADOR = 5.75
/** Distancia en píxeles a partir de la cual un gesto cuenta como arrastre y no como clic. */
const UMBRAL_ARRASTRE = 3

type MapaSvgProps = {
  estados: readonly EstadoMapa[]
  idsVisibles: ReadonlySet<string>
  seleccionId: string | null
  cargando: boolean
  vista: VistaMapa
  /** Región → color CSS. */
  colores: ReadonlyMap<string, string>
  onSeleccionar: (id: string) => void
  onRueda: (sentido: 'acercar' | 'alejar', x: number, y: number) => void
  onArrastrar: (dx: number, dy: number) => void
}

type TooltipActivo = { estado: EstadoMapa; x: number; y: number }

/** Un estado dibuja marcador si tiene hospitales, servicios o agentes (los equipos no cuentan). */
const tieneMarcador = ({ metricas }: EstadoMapa) =>
  metricas.hospitales > 0 || metricas.servicios > 0 || metricas.agentes > 0

export function MapaSvg({
  estados,
  idsVisibles,
  seleccionId,
  cargando,
  vista,
  colores,
  onSeleccionar,
  onRueda,
  onArrastrar,
}: MapaSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const arrastre = useRef({ activo: false, movido: false, x: 0, y: 0, inicioX: 0, inicioY: 0 })
  const [arrastrando, setArrastrando] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipActivo | null>(null)

  // La rueda necesita preventDefault (para no desplazar la página) y React la registra como pasiva:
  // por eso va como listener nativo.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    function alRodar(evento: WheelEvent) {
      if (!svg) return
      evento.preventDefault()
      const punto = aCoordenadasDelMapa(svg.getBoundingClientRect(), vista, evento.clientX, evento.clientY)
      onRueda(evento.deltaY < 0 ? 'acercar' : 'alejar', punto.x, punto.y)
    }

    svg.addEventListener('wheel', alRodar, { passive: false })
    return () => svg.removeEventListener('wheel', alRodar)
  }, [vista, onRueda])

  // El arrastre sigue al cursor aunque salga del mapa, por eso escucha en window.
  useEffect(() => {
    function alMover(evento: PointerEvent) {
      const gesto = arrastre.current
      const svg = svgRef.current
      if (!gesto.activo || !svg) return

      if (
        Math.abs(evento.clientX - gesto.inicioX) > UMBRAL_ARRASTRE ||
        Math.abs(evento.clientY - gesto.inicioY) > UMBRAL_ARRASTRE
      ) {
        gesto.movido = true
      }
      const porPixel = unidadesPorPixel(svg.getBoundingClientRect(), vista)
      onArrastrar((evento.clientX - gesto.x) * porPixel, (evento.clientY - gesto.y) * porPixel)
      gesto.x = evento.clientX
      gesto.y = evento.clientY
    }

    function alSoltar() {
      arrastre.current.activo = false
      setArrastrando(false)
    }

    window.addEventListener('pointermove', alMover)
    window.addEventListener('pointerup', alSoltar)
    return () => {
      window.removeEventListener('pointermove', alMover)
      window.removeEventListener('pointerup', alSoltar)
    }
  }, [vista, onArrastrar])

  const seleccionado = estados.find((estado) => estado.id === seleccionId)
  const escala = vista.w / VISTA_BASE.w
  const lado = LADO_MARCADOR * escala

  function elegir(estado: EstadoMapa) {
    if (idsVisibles.has(estado.id)) onSeleccionar(estado.id)
  }

  function alTeclear(evento: KeyboardEvent<SVGPathElement>, estado: EstadoMapa) {
    if (evento.key !== 'Enter' && evento.key !== ' ') return
    evento.preventDefault()
    elegir(estado)
  }

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`${vista.x} ${vista.y} ${vista.w} ${vista.h}`}
        role="group"
        aria-label="Estados de México"
        aria-busy={cargando}
        className={cn(
          'size-full touch-none select-none',
          arrastrando ? 'cursor-grabbing' : 'cursor-grab',
          cargando && 'animate-pulse',
        )}
        onPointerDown={(evento) => {
          if (evento.button !== 0) return
          arrastre.current = {
            activo: true,
            movido: false,
            x: evento.clientX,
            y: evento.clientY,
            inicioX: evento.clientX,
            inicioY: evento.clientY,
          }
          setArrastrando(true)
        }}
        // Un arrastre no debe contar como clic sobre el estado que quedó bajo el cursor.
        onClickCapture={(evento) => {
          if (!arrastre.current.movido) return
          evento.stopPropagation()
          evento.preventDefault()
          arrastre.current.movido = false
        }}
      >
        {estados.map((estado) => {
          const atenuado = !idsVisibles.has(estado.id)
          return (
            <path
              key={estado.id}
              d={estado.d}
              role="button"
              tabIndex={atenuado ? -1 : 0}
              aria-label={`${estado.name}, región ${estado.region}`}
              aria-pressed={estado.id === seleccionId}
              aria-disabled={atenuado || undefined}
              data-id={estado.id}
              data-atenuado={atenuado || undefined}
              style={{ fill: cargando ? 'var(--muted)' : (colores.get(estado.region) ?? 'var(--muted)') }}
              className="cursor-pointer stroke-background stroke-[0.6] outline-none transition-[filter,opacity] hover:brightness-125 focus-visible:stroke-ring focus-visible:stroke-[1.8] data-[atenuado=true]:pointer-events-none data-[atenuado=true]:opacity-20"
              onClick={() => elegir(estado)}
              onKeyDown={(evento) => alTeclear(evento, estado)}
              onPointerEnter={(evento) => {
                if (!atenuado) setTooltip({ estado, x: evento.clientX, y: evento.clientY })
              }}
              onPointerMove={(evento) => {
                if (!atenuado) setTooltip({ estado, x: evento.clientX, y: evento.clientY })
              }}
              onPointerLeave={() => setTooltip(null)}
            />
          )
        })}

        {/* Contorno del estado elegido, encima de los vecinos: así el resplandor no queda tapado
            y no hace falta reordenar los estados (que haría perder el foco al navegar con teclado). */}
        {seleccionado ? (
          <path
            d={seleccionado.d}
            aria-hidden="true"
            className="pointer-events-none fill-none stroke-foreground stroke-[1.6] [filter:drop-shadow(0_0_6px_var(--primary))]"
          />
        ) : null}

        {/* Marcadores siempre al final: quedan por encima de todos los estados. */}
        <g className="pointer-events-none">
          {estados.filter(tieneMarcador).map((estado) => {
            const ancla = ANCLAJES[estado.id]
            if (!ancla) return null
            return (
              <rect
                key={estado.id}
                data-marcador={estado.id}
                x={ancla.x - lado / 2}
                y={ancla.y - lado / 2}
                width={lado}
                height={lado}
                rx={lado * 0.18}
                strokeWidth={0.4 * escala}
                className={cn(
                  'fill-background stroke-foreground transition-opacity',
                  !idsVisibles.has(estado.id) && 'opacity-10',
                )}
              />
            )
          })}
        </g>
      </svg>

      {tooltip ? (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 rounded-lg bg-popover px-3 py-2 text-sm whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, calc(-100% - 12px))' }}
        >
          <strong className="block">{tooltip.estado.name}</strong>
          <span className="text-xs text-muted-foreground">
            {tooltip.estado.region} · Capital: {tooltip.estado.capital}
          </span>
        </div>
      ) : null}
    </>
  )
}

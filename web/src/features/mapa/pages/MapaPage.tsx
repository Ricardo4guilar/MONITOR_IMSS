import { Eye } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PanelDetalle } from '@/components/compartidos/PanelDetalle'
import { DetalleEstado } from '@/features/mapa/components/DetalleEstado'
import { LeyendaRegiones } from '@/features/mapa/components/LeyendaRegiones'
import { MapaSvg } from '@/features/mapa/components/MapaSvg'
import { ZoomControls } from '@/features/mapa/components/ZoomControls'
import { useEstadosMapa } from '@/features/mapa/hooks/useEstadosMapa'
import { useVistaMapa } from '@/features/mapa/hooks/useVistaMapa'
import { idsVisibles } from '@/features/mapa/utils/filtros'

export function MapaPage() {
  const [parametros, setParametros] = useSearchParams()
  const texto = parametros.get('q') ?? ''
  const region = parametros.get('region') ?? ''

  const { estados, regiones, colores, cargando } = useEstadosMapa()
  const zoom = useVistaMapa()
  const [seleccionId, setSeleccionId] = useState<string | null>(null)
  const [regionesOcultas, setRegionesOcultas] = useState<ReadonlySet<string>>(new Set())

  const visibles = useMemo(
    () => idsVisibles(estados, { texto, region, regionesOcultas }),
    [estados, texto, region, regionesOcultas],
  )
  const seleccionado = estados.find((estado) => estado.id === seleccionId) ?? null

  // Escape limpia la selección desde cualquier parte de la página.
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setSeleccionId(null)
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [])

  function alternarRegion(nombre: string) {
    setRegionesOcultas((actuales) => {
      const siguientes = new Set(actuales)
      if (!siguientes.delete(nombre)) siguientes.add(nombre)
      return siguientes
    })
  }

  function restablecer() {
    setSeleccionId(null)
    setRegionesOcultas(new Set())
    setParametros(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales)
        siguientes.delete('q')
        siguientes.delete('region')
        return siguientes
      },
      { replace: true },
    )
    zoom.restablecer()
  }

  const total = visibles.size
  return (
    <div className="grid gap-4 lg:h-full lg:grid-cols-[1fr_20rem]">
      <section aria-label="Mapa de México" className="relative flex min-h-[26rem] lg:min-h-0">
        <Card className="w-full gap-3 shadow-sm">
          <div className="min-h-0 flex-1 px-(--card-spacing)">
            <MapaSvg
              estados={estados}
              idsVisibles={visibles}
              seleccionId={seleccionId}
              cargando={cargando}
              vista={zoom.vista}
              colores={colores}
              onSeleccionar={setSeleccionId}
              onRueda={zoom.rueda}
              onArrastrar={zoom.arrastrar}
            />
          </div>
          {/* Debajo del mapa y no encima: en móvil una leyenda superpuesta chocaba con los controles de zoom. */}
          <div className="min-h-8 px-(--card-spacing)">
            {cargando ? null : (
              <LeyendaRegiones
                regiones={regiones}
                colores={colores}
                regionesOcultas={regionesOcultas}
                onAlternar={alternarRegion}
              />
            )}
          </div>
        </Card>

        <Badge variant="secondary" className="absolute top-4 left-4">
          <Eye data-icon="inline-start" />
          {`${total} ${total === 1 ? 'estado visible' : 'estados visibles'}`}
        </Badge>

        <ZoomControls
          factor={zoom.factor}
          puedeAcercar={zoom.puedeAcercar}
          puedeAlejar={zoom.puedeAlejar}
          onAcercar={zoom.acercar}
          onAlejar={zoom.alejar}
          onTamanoReal={zoom.restablecer}
          onRestablecer={restablecer}
        />
      </section>

      <PanelDetalle abierto={seleccionado !== null} onCerrar={() => setSeleccionId(null)} titulo="Detalle del estado">
        <DetalleEstado
          estado={seleccionado}
          color={seleccionado ? (colores.get(seleccionado.region) ?? 'var(--muted)') : 'var(--muted)'}
          onVolver={() => setSeleccionId(null)}
        />
      </PanelDetalle>
    </div>
  )
}

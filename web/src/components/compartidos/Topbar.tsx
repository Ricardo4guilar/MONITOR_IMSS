import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router'

import { MenuUsuario } from '@/features/auth/MenuUsuario'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TODAS_LAS_REGIONES = 'todas'

type TopbarProps = {
  titulo: string
  subtitulo: string
  /** Regiones reales de la tabla EntidadesFederativas. */
  regiones: readonly string[]
  /** Texto del buscador; cada pantalla dice qué busca. */
  placeholderBusqueda?: string
  /** Si la pantalla tiene buscador. */
  buscador?: boolean
  /** Si la pantalla usa el filtro de región (el mapa sí; los directorios filtran por estado en su propia barra). */
  filtroRegion?: boolean
}

/**
 * La búsqueda y la región viven en la URL (?q=…&region=…): se pueden compartir
 * y sobreviven a recargar. La pantalla activa los lee con useSearchParams.
 *
 * En móvil son dos filas (título + cuenta, y debajo las herramientas a todo el ancho);
 * desde tablet todo va en una sola.
 */
export function Topbar({
  titulo,
  subtitulo,
  regiones,
  placeholderBusqueda = 'Buscar estado o entidad',
  buscador = true,
  filtroRegion = true,
}: TopbarProps) {
  const [parametros, setParametros] = useSearchParams()
  const texto = parametros.get('q') ?? ''
  const region = parametros.get('region') ?? ''

  const opciones = [
    { value: TODAS_LAS_REGIONES, label: 'Todas las regiones' },
    ...regiones.map((nombre) => ({ value: nombre, label: nombre })),
  ]

  function guardar(clave: 'q' | 'region', valor: string) {
    setParametros(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales)
        if (valor) siguientes.set(clave, valor)
        else siguientes.delete(clave)
        return siguientes
      },
      { replace: true },
    )
  }

  const hayHerramientas = buscador || filtroRegion

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-3 border-b bg-background px-4 py-3 md:px-6 md:py-4">
      <div className="order-0 min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold md:text-lg">{titulo}</h1>
        <p className="truncate text-xs text-muted-foreground md:text-sm">{subtitulo}</p>
      </div>

      <MenuUsuario className="order-1 md:order-2" />

      {hayHerramientas ? (
        <div className="order-2 flex w-full items-center gap-3 md:order-1 md:w-auto">
          {buscador ? (
            <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                aria-label={placeholderBusqueda}
                placeholder={`${placeholderBusqueda}…`}
                className="h-9 w-full pl-8"
                value={texto}
                onChange={(evento) => guardar('q', evento.target.value)}
              />
            </div>
          ) : null}

          {filtroRegion ? (
            <Select
              value={region || TODAS_LAS_REGIONES}
              items={opciones}
              onValueChange={(valor) => guardar('region', !valor || valor === TODAS_LAS_REGIONES ? '' : valor)}
            >
              <SelectTrigger aria-label="Filtrar por región" className="h-9 w-40 shrink-0 md:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {opciones.map((opcion) => (
                    <SelectItem key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

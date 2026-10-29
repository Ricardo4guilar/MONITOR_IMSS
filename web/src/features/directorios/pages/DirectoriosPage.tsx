import { CircleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { PanelVacio } from '@/components/compartidos/PanelVacio'
import { PanelDetalle } from '@/components/compartidos/PanelDetalle'
import { TablaCargando } from '@/components/compartidos/TablaCargando'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DetalleDirectorio, type Seleccion } from '@/features/directorios/components/DetalleDirectorio'
import { TablaContactos } from '@/features/directorios/components/TablaContactos'
import { TablaHospitales } from '@/features/directorios/components/TablaHospitales'
import { useDirectorios } from '@/features/directorios/hooks/useDirectorios'
import {
  contactosDeHospital,
  entidadesPresentes,
  filtrarContactos,
  filtrarHospitales,
  hospitalDeContacto,
} from '@/features/directorios/utils/directorios'

type Vista = 'hospitales' | 'contactos'

const TODOS_LOS_ESTADOS = 'todos'

// Encabezados de cada tabla: el esqueleto de carga usa los mismos para que nada se mueva al llegar los datos.
const COLUMNAS_HOSPITALES = ['Hospital', 'Estado', 'Municipio', 'Región', 'Horario'] as const
const COLUMNAS_CONTACTOS = ['Contacto', 'Unidad médica', 'Estado', 'Teléfono', 'Correo'] as const

/** Cantidad de registros de una pestaña; mientras la hoja carga es un esqueleto, no un «0» engañoso. */
function Cantidad({ cargando, valor }: { cargando: boolean; valor: number }) {
  return cargando ? <Skeleton className="h-4 w-6" /> : <Badge variant="secondary">{valor}</Badge>
}

const esVista = (valor: string | null): valor is Vista => valor === 'hospitales' || valor === 'contactos'

export function DirectoriosPage() {
  const [parametros, setParametros] = useSearchParams()
  const vistaParam = parametros.get('vista')
  const vista: Vista = esVista(vistaParam) ? vistaParam : 'hospitales'
  const texto = parametros.get('q') ?? ''
  const entidadId = parametros.get('estado') ?? ''

  const { hospitales, contactos, cargandoHospitales, cargandoContactos, falloHospitales, falloContactos } = useDirectorios()
  // Cada pestaña recuerda qué registro está elegido; cambiar de pestaña la limpia.
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)

  const hospitalesFiltrados = useMemo(
    () => filtrarHospitales(hospitales, { texto, entidadId }),
    [hospitales, texto, entidadId],
  )
  const contactosFiltrados = useMemo(
    () => filtrarContactos(contactos, { texto, entidadId }),
    [contactos, texto, entidadId],
  )
  const estados = useMemo(
    () => entidadesPresentes(vista === 'hospitales' ? hospitales : contactos),
    [vista, hospitales, contactos],
  )
  const opcionesEstado = [
    { value: TODOS_LOS_ESTADOS, label: 'Todos los estados' },
    ...estados.map((estado) => ({ value: estado.id, label: estado.nombre })),
  ]

  const seleccion = useMemo<Seleccion | null>(() => {
    if (!seleccionadoId) return null
    if (vista === 'hospitales') {
      const hospital = hospitales.find((h) => h.clues === seleccionadoId)
      return hospital ? { tipo: 'hospital', hospital, contactos: contactosDeHospital(contactos, hospital.clues) } : null
    }
    const contacto = contactos.find((c) => c.id === seleccionadoId)
    return contacto ? { tipo: 'contacto', contacto, hospital: hospitalDeContacto(hospitales, contacto) } : null
  }, [seleccionadoId, vista, hospitales, contactos])

  // Una sola llamada por cambio: React Router no encadena actualizaciones sucesivas de la URL,
  // la segunda partiría de los parámetros viejos y borraría la primera.
  function actualizar(cambios: Partial<Record<'vista' | 'estado', string>>) {
    setParametros(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales)
        for (const [clave, valor] of Object.entries(cambios)) {
          if (valor) siguientes.set(clave, valor)
          else siguientes.delete(clave)
        }
        return siguientes
      },
      { replace: true },
    )
  }

  function irA(destino: Vista, id: string) {
    actualizar({ vista: destino })
    setSeleccionadoId(id)
  }

  function cambiarVista(valor: unknown) {
    if (typeof valor !== 'string' || !esVista(valor)) return
    // El estado elegido se quita: la otra pestaña puede no tener ese estado.
    actualizar({ vista: valor, estado: '' })
    setSeleccionadoId(null)
  }

  const cargandoVista = vista === 'hospitales' ? cargandoHospitales : cargandoContactos

  // Solo si ninguna de las dos hojas sirvió no hay nada que ofrecer: se avisa en toda la pantalla.
  if (falloHospitales && falloContactos) {
    return (
      <PanelVacio icono={CircleAlert} titulo="No se pudo cargar el directorio" descripcion="Revisa las hojas publicadas." className="h-full" />
    )
  }

  return (
    <div className="grid gap-4 lg:h-full lg:grid-cols-[1fr_22rem]">
      <section aria-label="Directorios" className="flex min-h-0 min-w-0">
        <Card className="min-h-[28rem] w-full min-w-0 shadow-sm lg:min-h-0">
          <Tabs value={vista} onValueChange={cambiarVista} className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 px-(--card-spacing)">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="hospitales">
                  Hospitales <Cantidad cargando={cargandoHospitales} valor={hospitales.length} />
                </TabsTrigger>
                <TabsTrigger value="contactos">
                  Contactos <Cantidad cargando={cargandoContactos} valor={contactos.length} />
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3">
                {cargandoVista ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {vista === 'hospitales'
                      ? `${hospitalesFiltrados.length} de ${hospitales.length} hospitales`
                      : `${contactosFiltrados.length} de ${contactos.length} contactos`}
                  </p>
                )}
                <Select
                  value={entidadId || TODOS_LOS_ESTADOS}
                  items={opcionesEstado}
                  onValueChange={(valor) => actualizar({ estado: !valor || valor === TODOS_LOS_ESTADOS ? '' : valor })}
                >
                  <SelectTrigger aria-label="Filtrar por estado" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {opcionesEstado.map((opcion) => (
                        <SelectItem key={opcion.value} value={opcion.value}>
                          {opcion.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="hospitales" className="min-h-0 flex-1 overflow-y-auto">
              {cargandoHospitales ? (
                <TablaCargando nombre="hospitales" columnas={COLUMNAS_HOSPITALES} />
              ) : falloHospitales ? (
                <PanelVacio icono={CircleAlert} titulo="No se pudieron cargar los hospitales" descripcion="Revisa la hoja publicada." />
              ) : hospitalesFiltrados.length === 0 ? (
                <PanelVacio icono={CircleAlert} titulo="Sin resultados" descripcion="Prueba con otra búsqueda o estado." />
              ) : (
                <TablaHospitales hospitales={hospitalesFiltrados} seleccionadoId={seleccionadoId} onSeleccionar={setSeleccionadoId} />
              )}
            </TabsContent>
            <TabsContent value="contactos" className="min-h-0 flex-1 overflow-y-auto">
              {cargandoContactos ? (
                <TablaCargando nombre="contactos" columnas={COLUMNAS_CONTACTOS} />
              ) : falloContactos ? (
                <PanelVacio icono={CircleAlert} titulo="No se pudieron cargar los contactos" descripcion="Revisa la hoja publicada." />
              ) : contactosFiltrados.length === 0 ? (
                <PanelVacio icono={CircleAlert} titulo="Sin resultados" descripcion="Prueba con otra búsqueda o estado." />
              ) : (
                <TablaContactos contactos={contactosFiltrados} seleccionadoId={seleccionadoId} onSeleccionar={setSeleccionadoId} />
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </section>

      <PanelDetalle abierto={seleccion !== null} onCerrar={() => setSeleccionadoId(null)} titulo="Detalle del directorio">
        <DetalleDirectorio
          seleccion={seleccion}
          onVerContacto={(id) => irA('contactos', id)}
          onVerHospital={(clues) => irA('hospitales', clues)}
        />
      </PanelDetalle>
    </div>
  )
}

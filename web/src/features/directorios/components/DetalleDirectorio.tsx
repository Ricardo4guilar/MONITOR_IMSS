import { Contact, Hospital as IconoHospital } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { Contacto, Hospital } from '@/features/directorios/types/directorios.types'
import { nombreDeEstado } from '@/features/directorios/utils/directorios'
import { describirDias, describirHorario } from '@/features/directorios/utils/formato'

export type Seleccion =
  | { tipo: 'hospital'; hospital: Hospital; contactos: readonly Contacto[] }
  | { tipo: 'contacto'; contacto: Contacto; hospital: Hospital | undefined }

type DetalleDirectorioProps = {
  seleccion: Seleccion | null
  onVerContacto: (id: string) => void
  onVerHospital: (clues: string) => void
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

/** Teléfono y correo de un contacto como enlaces para llamar y escribir; si faltan, lo dice. */
function ViaDeContacto({ contacto }: { contacto: Contacto }) {
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {contacto.telefono ? (
        <a href={`tel:${contacto.telefono}`} className="w-fit underline-offset-4 hover:underline">
          {contacto.telefono}
        </a>
      ) : (
        <span className="text-muted-foreground">Sin teléfono</span>
      )}
      {contacto.correo ? (
        <a href={`mailto:${contacto.correo}`} className="w-fit break-all underline-offset-4 hover:underline">
          {contacto.correo}
        </a>
      ) : (
        <span className="text-muted-foreground">Sin correo</span>
      )}
    </div>
  )
}

function DetalleHospital({
  hospital,
  contactos,
  onVerContacto,
}: {
  hospital: Hospital
  contactos: readonly Contacto[]
  onVerContacto: (id: string) => void
}) {
  return (
    <CardContent className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <IconoHospital aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{hospital.nombre}</h2>
          <p className="text-xs text-muted-foreground">{hospital.clues}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Dato etiqueta="Domicilio">{hospital.domicilio || 'Sin dato'}</Dato>
        </div>
        <Dato etiqueta="Estado">{nombreDeEstado(hospital.entidadId)}</Dato>
        <Dato etiqueta="Municipio">{hospital.municipio || 'Sin dato'}</Dato>
        <Dato etiqueta="Región">{hospital.region || 'Sin dato'}</Dato>
        <Dato etiqueta="Horario">{describirHorario(hospital.horario)}</Dato>
        <div className="col-span-2">
          <Dato etiqueta="Días de servicio">{describirDias(hospital.diasServicio)}</Dato>
        </div>
      </dl>

      <section aria-label="Contactos del hospital" className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Contactos</h3>
        {contactos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin contactos registrados</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {contactos.map((contacto) => (
              <li key={contacto.id} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
                <Button
                  variant="link"
                  className="h-auto w-fit p-0 text-left whitespace-normal"
                  onClick={() => onVerContacto(contacto.id)}
                >
                  {contacto.nombre}
                </Button>
                <ViaDeContacto contacto={contacto} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </CardContent>
  )
}

function DetalleContacto({
  contacto,
  hospital,
  onVerHospital,
}: {
  contacto: Contacto
  hospital: Hospital | undefined
  onVerHospital: (clues: string) => void
}) {
  return (
    <CardContent className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Contact aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{contacto.nombre}</h2>
          {contacto.puesto ? <p className="text-xs text-muted-foreground">{contacto.puesto}</p> : null}
        </div>
      </div>

      <ViaDeContacto contacto={contacto} />

      <dl className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Dato etiqueta="Unidad médica">
            {hospital ? (
              <Button
                variant="link"
                className="h-auto p-0 text-left whitespace-normal"
                onClick={() => onVerHospital(hospital.clues)}
              >
                {hospital.nombre}
              </Button>
            ) : (
              contacto.unidadMedica || 'Sin dato'
            )}
          </Dato>
        </div>
        <Dato etiqueta="Estado">{nombreDeEstado(contacto.entidadId)}</Dato>
        <Dato etiqueta="Municipio">{contacto.municipio || 'Sin dato'}</Dato>
      </dl>
    </CardContent>
  )
}

/** Panel lateral: el detalle del hospital o del contacto elegido, con salto de uno al otro. */
export function DetalleDirectorio({ seleccion, onVerContacto, onVerHospital }: DetalleDirectorioProps) {
  return (
    <aside aria-label="Detalle del directorio" className="flex min-h-0">
      <Card className="min-h-0 w-full overflow-y-auto">
        {seleccion?.tipo === 'hospital' ? (
          <DetalleHospital hospital={seleccion.hospital} contactos={seleccion.contactos} onVerContacto={onVerContacto} />
        ) : seleccion?.tipo === 'contacto' ? (
          <DetalleContacto contacto={seleccion.contacto} hospital={seleccion.hospital} onVerHospital={onVerHospital} />
        ) : (
          <>
            <CardHeader className="sr-only">Detalle</CardHeader>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Contact />
                </EmptyMedia>
                <EmptyTitle>Selecciona un registro</EmptyTitle>
                <EmptyDescription>Elige un hospital o un contacto de la tabla para ver su detalle.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </>
        )}
      </Card>
    </aside>
  )
}

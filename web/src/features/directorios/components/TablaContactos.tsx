import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Contacto } from '@/features/directorios/types/directorios.types'
import { nombreDeEstado } from '@/features/directorios/utils/directorios'

type TablaContactosProps = {
  contactos: readonly Contacto[]
  seleccionadoId: string | null
  onSeleccionar: (id: string) => void
}

export function TablaContactos({ contactos, seleccionadoId, onSeleccionar }: TablaContactosProps) {
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          <TableHead>Contacto</TableHead>
          {/* En pantallas pequeñas solo caben contacto y teléfono; la unidad va bajo el nombre y el resto en el detalle. */}
          <TableHead className="hidden md:table-cell">Unidad médica</TableHead>
          <TableHead className="hidden lg:table-cell">Estado</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead className="hidden md:table-cell">Correo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contactos.map((contacto) => (
          <TableRow
            key={contacto.id}
            // El clic en la fila es comodidad para ratón y dedo; el botón del nombre sigue siendo la vía para teclado y lectores.
            className="cursor-pointer"
            aria-selected={contacto.id === seleccionadoId}
            data-state={contacto.id === seleccionadoId ? 'selected' : undefined}
            onClick={() => onSeleccionar(contacto.id)}
          >
            <TableCell className="whitespace-normal">
              <Button
                variant="link"
                className="h-auto p-0 text-left whitespace-normal"
                aria-pressed={contacto.id === seleccionadoId}
                onClick={() => onSeleccionar(contacto.id)}
              >
                {contacto.nombre}
              </Button>
              <div className="text-xs text-muted-foreground md:hidden">{contacto.unidadMedica}</div>
            </TableCell>
            <TableCell className="hidden whitespace-normal md:table-cell">{contacto.unidadMedica}</TableCell>
            <TableCell className="hidden lg:table-cell">{nombreDeEstado(contacto.entidadId)}</TableCell>
            <TableCell>
              {contacto.telefono ? (
                // Llamar o escribir no debe además abrir el detalle: el clic no sube a la fila.
                <a href={`tel:${contacto.telefono}`} className="underline-offset-4 hover:underline" onClick={(evento) => evento.stopPropagation()}>
                  {contacto.telefono}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="hidden whitespace-normal break-all md:table-cell">
              {contacto.correo ? (
                <a href={`mailto:${contacto.correo}`} className="underline-offset-4 hover:underline" onClick={(evento) => evento.stopPropagation()}>
                  {contacto.correo}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

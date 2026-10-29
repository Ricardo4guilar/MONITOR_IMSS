import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Hospital } from '@/features/directorios/types/directorios.types'
import { nombreDeEstado } from '@/features/directorios/utils/directorios'
import { describirHorario } from '@/features/directorios/utils/formato'

type TablaHospitalesProps = {
  hospitales: readonly Hospital[]
  seleccionadoId: string | null
  onSeleccionar: (clues: string) => void
}

export function TablaHospitales({ hospitales, seleccionadoId, onSeleccionar }: TablaHospitalesProps) {
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          <TableHead>Hospital</TableHead>
          <TableHead>Estado</TableHead>
          {/* En pantallas pequeñas solo caben hospital y estado; el resto está en el detalle. */}
          <TableHead className="hidden md:table-cell">Municipio</TableHead>
          <TableHead className="hidden lg:table-cell">Región</TableHead>
          <TableHead className="hidden md:table-cell">Horario</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {hospitales.map((hospital) => (
          <TableRow
            key={hospital.clues}
            // El clic en la fila es comodidad para ratón y dedo; el botón del nombre sigue siendo la vía para teclado y lectores.
            className="cursor-pointer"
            aria-selected={hospital.clues === seleccionadoId}
            data-state={hospital.clues === seleccionadoId ? 'selected' : undefined}
            onClick={() => onSeleccionar(hospital.clues)}
          >
            <TableCell className="whitespace-normal">
              <Button
                variant="link"
                className="h-auto p-0 text-left whitespace-normal"
                aria-pressed={hospital.clues === seleccionadoId}
                onClick={() => onSeleccionar(hospital.clues)}
              >
                {hospital.nombre}
              </Button>
              <div className="text-xs text-muted-foreground">{hospital.clues}</div>
            </TableCell>
            <TableCell>{nombreDeEstado(hospital.entidadId)}</TableCell>
            <TableCell className="hidden md:table-cell">{hospital.municipio}</TableCell>
            <TableCell className="hidden lg:table-cell">{hospital.region}</TableCell>
            <TableCell className="hidden md:table-cell">{describirHorario(hospital.horario)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

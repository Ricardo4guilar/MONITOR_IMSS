import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type TablaCargandoProps = {
  /** Qué se está cargando; da nombre accesible a la tabla («Cargando hospitales»). */
  nombre: string
  /** Encabezados reales de la tabla: se ven desde el primer instante y solo las filas son esqueleto. */
  columnas: readonly string[]
  filas?: number
}

/** Tabla de esqueleto: conserva el tamaño y los encabezados de la real para que nada se mueva al llegar los datos. */
export function TablaCargando({ nombre, columnas, filas = 8 }: TablaCargandoProps) {
  return (
    <Table aria-busy="true" aria-label={`Cargando ${nombre}`}>
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          {columnas.map((columna) => (
            <TableHead key={columna}>{columna}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: filas }, (_, fila) => (
          <TableRow key={fila}>
            {columnas.map((columna, indice) => (
              <TableCell key={columna}>
                {/* El primer campo es el más largo (el nombre): se dibuja más ancho que el resto. */}
                <Skeleton className={indice === 0 ? 'h-4 w-3/4' : 'h-4 w-1/2'} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

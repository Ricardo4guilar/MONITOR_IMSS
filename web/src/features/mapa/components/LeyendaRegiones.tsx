import { Button } from '@/components/ui/button'

type LeyendaRegionesProps = {
  regiones: readonly string[]
  /** Región → color CSS. */
  colores: ReadonlyMap<string, string>
  regionesOcultas: ReadonlySet<string>
  onAlternar: (region: string) => void
}

/** Una región por botón: pulsarlo apaga o enciende sus estados en el mapa. */
export function LeyendaRegiones({ regiones, colores, regionesOcultas, onAlternar }: LeyendaRegionesProps) {
  return (
    <div role="group" aria-label="Leyenda de regiones" className="flex flex-wrap gap-1">
      {regiones.map((region) => {
        const encendida = !regionesOcultas.has(region)
        return (
          <Button
            key={region}
            variant="ghost"
            size="xs"
            aria-pressed={encendida}
            className={encendida ? undefined : 'opacity-40'}
            onClick={() => onAlternar(region)}
          >
            <span
              aria-hidden="true"
              className="size-3 rounded-sm"
              style={{ background: colores.get(region) ?? 'var(--muted)' }}
            />
            {region}
          </Button>
        )
      })}
    </div>
  )
}

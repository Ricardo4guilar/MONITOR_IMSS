import { LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'

import { ChartPanel } from '@/components/compartidos/ChartPanel'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAuth } from '@/features/auth/useAuth'
import { useCerrarSesion } from '@/features/auth/useCerrarSesion'
import { useTema } from '@/features/tema/useTema'
import type { PreferenciaTema } from '@/features/tema/utils/tema'

const OPCIONES: readonly { valor: PreferenciaTema; etiqueta: string; descripcion: string; icono: LucideIcon }[] = [
  { valor: 'claro', etiqueta: 'Claro', descripcion: 'Fondo claro, ideal con mucha luz.', icono: Sun },
  { valor: 'oscuro', etiqueta: 'Oscuro', descripcion: 'Fondo oscuro, descansa la vista.', icono: Moon },
  { valor: 'sistema', etiqueta: 'Sistema', descripcion: 'Sigue la configuración de tu dispositivo.', icono: Monitor },
]

const esPreferencia = (valor: unknown): valor is PreferenciaTema => OPCIONES.some((opcion) => opcion.valor === valor)

export function AjustesPage() {
  const { preferencia, cambiar } = useTema()
  const { sesion } = useAuth()
  const cerrarSesion = useCerrarSesion()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <ChartPanel titulo="Apariencia" icono={Sun}>
        <RadioGroup
          value={preferencia}
          onValueChange={(valor) => {
            if (esPreferencia(valor)) cambiar(valor)
          }}
          className="grid gap-3 sm:grid-cols-3"
        >
          {OPCIONES.map(({ valor, etiqueta, descripcion, icono: Icono }) => (
            <FieldLabel key={valor} htmlFor={`tema-${valor}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <span className="flex items-center gap-2 font-medium">
                    <Icono aria-hidden="true" className="size-4" />
                    {etiqueta}
                  </span>
                  <FieldDescription>{descripcion}</FieldDescription>
                </FieldContent>
                <RadioGroupItem id={`tema-${valor}`} value={valor} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </ChartPanel>

      <ChartPanel titulo="Sesión" icono={LogOut}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Sesión iniciada como <span className="font-medium text-foreground">{sesion?.usuario}</span>
          </p>
          <Button variant="outline" onClick={() => void cerrarSesion()}>
            <LogOut data-icon="inline-start" />
            Cerrar sesión
          </Button>
        </div>
      </ChartPanel>
    </div>
  )
}

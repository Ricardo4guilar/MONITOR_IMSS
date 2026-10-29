import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, TriangleAlert, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { z } from 'zod'

import { LogoImss } from '@/components/compartidos/LogoImss'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { CredencialesInvalidas, AuthNoConfigurada, SesionBloqueada } from '@/features/auth/types/auth.types'
import { useAuth } from '@/features/auth/useAuth'
import { rutaInterna } from '@/features/auth/utils/ruta-interna'

const esquema = z.object({
  usuario: z.string().trim().min(1, 'Escribe tu usuario'),
  clave: z.string().min(1, 'Escribe tu contraseña'),
})

type Datos = z.infer<typeof esquema>

const MENSAJE_GENERICO = 'No se pudo iniciar sesión. Intenta de nuevo.'

/** Mensajes que se pueden mostrar tal cual. Cualquier otro error se oculta: puede traer detalles técnicos. */
function mensajeDe(error: unknown): string {
  if (error instanceof CredencialesInvalidas || error instanceof SesionBloqueada || error instanceof AuthNoConfigurada) {
    return error.message
  }
  return MENSAJE_GENERICO
}

/** A dónde volver tras entrar, según la pantalla que se intentó abrir antes de que mandara aquí. */
function destinoDe(estado: unknown): string {
  const desde = typeof estado === 'object' && estado !== null && 'desde' in estado ? estado.desde : undefined
  return rutaInterna(desde)
}

/** Marco común del acceso: panel de marca (solo en pantalla grande) y columna con el título y lo que haga falta. */
function MarcoDeAcceso({ subtitulo, children }: { subtitulo: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-2">
      {/* Panel de marca: solo en pantallas grandes; en móvil el logo va sobre el formulario. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--primary)_0%,transparent_55%)] opacity-20" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <LogoImss className="size-12" />
          <span className="text-lg font-semibold tracking-tight">IMSS Bienestar</span>
        </div>
        <div className="relative flex max-w-md flex-col gap-4">
          <h2 className="text-4xl font-semibold tracking-tight text-balance">Monitor de instalación de agentes</h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Avance del proyecto, cobertura por estado y directorio de hospitales y contactos médicos, en un solo lugar.
          </p>
        </div>
        <p className="relative text-sm text-muted-foreground">Acceso exclusivo para personal autorizado.</p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-4">
            <LogoImss className="size-14 lg:hidden" />
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
              <p className="text-sm text-muted-foreground">{subtitulo}</p>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

/** Desarrollo: la app pide usuario y contraseña. */
function FormularioDeAcceso({ iniciarSesion }: { iniciarSesion: (usuario: string, clave: string) => Promise<void> }) {
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: { usuario: '', clave: '' } })

  async function enviar({ usuario, clave }: Datos) {
    setError(null)
    try {
      await iniciarSesion(usuario, clave)
    } catch (fallo) {
      setError(mensajeDe(fallo))
      // La contraseña nunca se conserva tras un intento fallido; el usuario sí, para corregir solo lo que falló.
      resetField('clave')
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-6" aria-busy={isSubmitting}>
      {error ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field data-invalid={errors.usuario ? true : undefined}>
          <FieldLabel htmlFor="usuario">Usuario</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <User />
            </InputGroupAddon>
            <InputGroupInput
              className="h-11"
              id="usuario"
              autoComplete="username"
              autoFocus
              aria-invalid={errors.usuario ? true : undefined}
              {...register('usuario')}
            />
          </InputGroup>
          <FieldError errors={[errors.usuario]} />
        </Field>

        <Field data-invalid={errors.clave ? true : undefined}>
          <FieldLabel htmlFor="clave">Contraseña</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <Lock />
            </InputGroupAddon>
            <InputGroupInput
              className="h-11"
              id="clave"
              type={verClave ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={errors.clave ? true : undefined}
              {...register('clave')}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setVerClave((visible) => !visible)}
              >
                {verClave ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldError errors={[errors.clave]} />
        </Field>
      </FieldGroup>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner aria-hidden="true" data-icon="inline-start" />
            Iniciando sesión…
          </>
        ) : (
          'Iniciar sesión'
        )}
      </Button>
    </form>
  )
}

/** Producción (Cognito): la app no ve la contraseña, solo manda a la página segura de acceso. */
function AccesoPorRedireccion({
  destino,
  iniciarSesionPorRedireccion,
}: {
  destino: string
  iniciarSesionPorRedireccion: (destino: string) => Promise<void>
}) {
  const [saliendo, setSaliendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function continuar() {
    setError(null)
    setSaliendo(true)
    try {
      await iniciarSesionPorRedireccion(destino)
      // Si todo sale bien el navegador abandona la página: el botón se queda ocupado hasta entonces.
    } catch {
      setError(MENSAJE_GENERICO)
      setSaliendo(false)
    }
  }

  return (
    <div className="flex flex-col gap-6" aria-busy={saliendo}>
      {error ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="button" size="lg" className="w-full" disabled={saliendo} onClick={() => void continuar()}>
        {saliendo ? (
          <>
            <Spinner aria-hidden="true" data-icon="inline-start" />
            Redirigiendo…
          </>
        ) : (
          'Continuar'
        )}
      </Button>
    </div>
  )
}

export function LoginPage() {
  const auth = useAuth()
  const ubicacion = useLocation()
  const destino = destinoDe(ubicacion.state)

  if (auth.sesion) return <Navigate to={destino} replace />

  return auth.modo === 'formulario' ? (
    <MarcoDeAcceso subtitulo="Ingresa con tu usuario para continuar.">
      <FormularioDeAcceso iniciarSesion={auth.iniciarSesion} />
    </MarcoDeAcceso>
  ) : (
    <MarcoDeAcceso subtitulo="Te llevaremos a la página segura de acceso para validar tu identidad.">
      <AccesoPorRedireccion destino={destino} iniciarSesionPorRedireccion={auth.iniciarSesionPorRedireccion} />
    </MarcoDeAcceso>
  )
}

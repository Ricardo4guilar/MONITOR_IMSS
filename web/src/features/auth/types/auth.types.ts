export type Sesion = {
  usuario: string
}

/** Operaciones comunes a cualquier proveedor de identidad. */
type ServicioAuthBase = {
  cerrarSesion: () => Promise<void>
  /** Sesión vigente, o `null` si no hay o ya caducó. */
  sesionActual: () => Sesion | null
}

/** La app muestra su propio formulario y recibe usuario y contraseña (adaptador de desarrollo). */
export type ServicioAuthFormulario = ServicioAuthBase & {
  modo: 'formulario'
  iniciarSesion: (usuario: string, clave: string) => Promise<Sesion>
}

/**
 * La app nunca ve la contraseña: manda al usuario a la página de acceso del proveedor (Amazon Cognito)
 * y recibe de vuelta un código de un solo uso que canjea por la identidad.
 */
export type ServicioAuthRedireccion = ServicioAuthBase & {
  modo: 'redireccion'
  /** Sale hacia la página de acceso. `destino` es la ruta interna a la que volver al terminar. */
  iniciarSesionPorRedireccion: (destino: string) => Promise<void>
  /** Procesa la URL de regreso (`?code=…&state=…`), abre la sesión y devuelve la ruta a la que ir. */
  completarInicio: (urlDeRegreso: string) => Promise<{ sesion: Sesion; destino: string }>
}

/**
 * Contrato de autenticación. Las pantallas solo conocen esto: en desarrollo lo cumple un adaptador con
 * formulario y, al desplegar en AWS, Amazon Cognito por redirección.
 */
export type ServicioAuth = ServicioAuthFormulario | ServicioAuthRedireccion

export type ModoAuth = ServicioAuth['modo']

/** El inicio de sesión por redirección falló o no es de fiar. El mensaje es genérico a propósito: no revela el motivo. */
export class ErrorInicioSesion extends Error {
  constructor() {
    super('No se pudo completar el inicio de sesión. Intenta de nuevo.')
    this.name = 'ErrorInicioSesion'
  }
}

/** Usuario o contraseña incorrectos. El mensaje no dice cuál de los dos, a propósito. */
export class CredencialesInvalidas extends Error {
  constructor() {
    super('Usuario o contraseña incorrectos')
    this.name = 'CredencialesInvalidas'
  }
}

/** Demasiados intentos fallidos: hay que esperar `segundos` antes de volver a probar. */
export class SesionBloqueada extends Error {
  readonly segundos: number

  constructor(segundos: number) {
    super(`Demasiados intentos. Intenta de nuevo en ${segundos} segundos.`)
    this.name = 'SesionBloqueada'
    this.segundos = segundos
  }
}

/** El inicio de sesión no está configurado en este entorno (producción sin proveedor de identidad). */
export class AuthNoConfigurada extends Error {
  constructor() {
    super('El inicio de sesión no está disponible en este entorno.')
    this.name = 'AuthNoConfigurada'
  }
}

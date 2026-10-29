import { z } from 'zod'

/** Lo que se guarda al salir hacia Cognito y se consume (una sola vez) al volver. */
export const inicioPendienteSchema = z.object({
  state: z.string().min(1),
  nonce: z.string().min(1),
  verificador: z.string().min(1),
  /** Ruta interna a la que volver al terminar. */
  destino: z.string(),
  creadoEn: z.number(),
})

/** La sesión local: quién es y hasta cuándo. Nunca guarda tokens. */
export const sesionCognitoSchema = z.object({ usuario: z.string().min(1), expiraEn: z.number() })

/** Respuesta del endpoint `/oauth2/token`. Solo se usa el ID token; el de acceso y el de refresco se ignoran a propósito. */
export const respuestaTokensSchema = z.object({ id_token: z.string().min(1) })

/** Los datos del ID token que la app revisa. Cognito añade muchos más; aquí solo importan estos. */
export const cargaIdTokenSchema = z.object({
  iss: z.string(),
  aud: z.string(),
  token_use: z.literal('id'),
  nonce: z.string(),
  sub: z.string().min(1),
  exp: z.number(),
  email: z.string().min(1).optional(),
  'cognito:username': z.string().min(1).optional(),
})

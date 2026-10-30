import { z } from 'zod'

const entornoSchema = z.object({
  /** URL de «Publicar en la web» (CSV) de la hoja EntidadesFederativas. Sin ella se usa la copia local. */
  VITE_ENTIDADES_CSV_URL: z.string().optional(),
  /** Igual, para la hoja MetricasEntidad. */
  VITE_METRICAS_CSV_URL: z.string().optional(),
  /** Hoja de avance por día (serie de la gráfica de líneas). */
  VITE_AVANCE_CSV_URL: z.string().optional(),
  /** Hoja de métricas Septiembre-Octubre (clave-valor: una métrica por fila). */
  VITE_SEPOCT_CSV_URL: z.string().optional(),
  /** Hoja de métricas Noviembre-Diciembre (una fila de resumen). */
  VITE_NOVDIC_CSV_URL: z.string().optional(),
  /** Hoja del directorio de hospitales. */
  VITE_HOSPITALES_CSV_URL: z.string().optional(),
  /** Hoja del directorio de contactos médicos. */
  VITE_CONTACTOS_CSV_URL: z.string().optional(),
  /** Cognito (producción). Si faltan las tres, no se usa Cognito. Ninguna es secreta: son identificadores públicos. */
  VITE_COGNITO_DOMINIO: z.string().optional(),
  VITE_COGNITO_CLIENT_ID: z.string().optional(),
  VITE_COGNITO_USER_POOL_ID: z.string().optional(),
  /** Credencial del login por formulario (dev y demo de Vercel). No es secreta: viaja en el bundle. */
  VITE_DEV_USUARIO: z.string().optional(),
  VITE_DEV_CLAVE: z.string().optional(),
})

// Una por una, nunca `import.meta.env` completo: Vite sustituye cada acceso explícito por su valor, pero si
// se usa el objeto entero lo incrusta con TODAS las variables VITE_* dentro del código que se publica.
//
// VITE_DEV_USUARIO/CLAVE se incluyen también en producción para habilitar el login por formulario en la
// DEMO interna de Vercel (sin Cognito). ADVERTENCIA: la clave queda embebida en el JavaScript publicado y
// es legible por cualquiera; NO es seguridad real, solo evita compartir la preview abierta con el equipo.
// El despliegue público (AWS) usa Cognito y no depende de estas variables.
export const env = entornoSchema.parse({
  VITE_ENTIDADES_CSV_URL: import.meta.env.VITE_ENTIDADES_CSV_URL,
  VITE_METRICAS_CSV_URL: import.meta.env.VITE_METRICAS_CSV_URL,
  VITE_AVANCE_CSV_URL: import.meta.env.VITE_AVANCE_CSV_URL,
  VITE_SEPOCT_CSV_URL: import.meta.env.VITE_SEPOCT_CSV_URL,
  VITE_NOVDIC_CSV_URL: import.meta.env.VITE_NOVDIC_CSV_URL,
  VITE_HOSPITALES_CSV_URL: import.meta.env.VITE_HOSPITALES_CSV_URL,
  VITE_CONTACTOS_CSV_URL: import.meta.env.VITE_CONTACTOS_CSV_URL,
  VITE_COGNITO_DOMINIO: import.meta.env.VITE_COGNITO_DOMINIO,
  VITE_COGNITO_CLIENT_ID: import.meta.env.VITE_COGNITO_CLIENT_ID,
  VITE_COGNITO_USER_POOL_ID: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  VITE_DEV_USUARIO: import.meta.env.VITE_DEV_USUARIO,
  VITE_DEV_CLAVE: import.meta.env.VITE_DEV_CLAVE,
})

import { z } from 'zod'

// Las hojas traen números como texto: "9060", "685.92" o con comas de miles.
const numero = z
  .string()
  .transform((valor) => Number(valor.replace(/,/g, '')))
  .refine(Number.isFinite, 'no es un número')

const texto = z.string().trim().min(1)

export const filaAvanceSchema = z
  .object({
    DiaNum: numero,
    Fecha: texto,
    AgenteAcumuladoDia: numero,
    Agentesdia: numero,
    Restante: numero,
  })
  .transform((fila) => ({
    dia: fila.DiaNum,
    fecha: fila.Fecha,
    acumulado: fila.AgenteAcumuladoDia,
    instalados: fila.Agentesdia,
    restante: fila.Restante,
  }))

export const filaNovDicSchema = z
  .object({
    AcumuladoHoy: numero,
    MetaTotal: numero,
    MetaFinal: numero,
    FechaInicio: texto,
    FechaHoy: texto,
    FechaLimite: texto,
    DiasTranscurridos: numero,
    DiasRestantes: numero,
    PromDiarioInstalado: numero,
    PromDiarioRequerido: numero,
    Restante: numero,
  })
  .transform((fila) => ({
    acumuladoHoy: fila.AcumuladoHoy,
    metaTotal: fila.MetaTotal,
    metaFinal: fila.MetaFinal,
    fechaInicio: fila.FechaInicio,
    fechaHoy: fila.FechaHoy,
    fechaLimite: fila.FechaLimite,
    diasTranscurridos: fila.DiasTranscurridos,
    diasRestantes: fila.DiasRestantes,
    promDiarioInstalado: fila.PromDiarioInstalado,
    promDiarioRequerido: fila.PromDiarioRequerido,
    restante: fila.Restante,
  }))


// Porcentajes con signo: "68.12%" llega como texto y se guarda como 68.12 (escala 0-100).
const porcentajeTexto = z
  .string()
  .transform((valor) => Number(valor.replace(/[%,]/g, '')))
  .refine(Number.isFinite, 'no es un porcentaje')

// Tiempos en horas. La hoja los publica de dos maneras según cómo esté formateada la celda:
// un decimal de horas ("360.0208333") o una duración "h:mm:ss" ("304:36:00", que son 304.6 h).
// Las horas pueden pasar de 24, así que no es una hora del día sino una duración acumulada.
const horas = z
  .string()
  .transform((valor) => {
    const partes = valor.trim().split(':')
    if (partes.length >= 2) {
      const [h, m = '0', s = '0'] = partes
      return Number(h) + Number(m) / 60 + Number(s) / 3600
    }
    return Number(valor.replace(/,/g, ''))
  })
  .refine(Number.isFinite, 'no es una duración válida')

/**
 * Hoja «Métricas de proyecto Sept-Oct»: una métrica por fila (clave, valor).
 * Se lee ya convertida a objeto, porque cada clave es el nombre de un campo conocido.
 * Si falta alguna o no es numérica, la hoja entera se descarta: mejor avisar que mostrar cifras a medias.
 */
export const resumenSepOctSchema = z
  .object({
    MetaTotal: numero,
    TotalInstalados: numero,
    Progreso: porcentajeTexto,
    FaltanteMeta: numero,
    Visitas: numero,
    TiempoInvertido: horas,
    TiempoMuerto: horas,
    TiempoTotal: horas,
    TiempoEfectivo: porcentajeTexto,
  })
  .transform((hoja) => ({
    metaTotal: hoja.MetaTotal,
    totalInstalados: hoja.TotalInstalados,
    progreso: hoja.Progreso,
    faltanteMeta: hoja.FaltanteMeta,
    visitas: hoja.Visitas,
    tiempoInvertido: hoja.TiempoInvertido,
    tiempoMuerto: hoja.TiempoMuerto,
    tiempoTotal: hoja.TiempoTotal,
    tiempoEfectivo: hoja.TiempoEfectivo,
  }))

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
    TiempoInvertido: numero,
    TiempoMuerto: numero,
    TiempoTotal: numero,
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

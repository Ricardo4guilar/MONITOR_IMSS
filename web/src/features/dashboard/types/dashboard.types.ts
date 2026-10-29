/** Un día de la serie de instalación (hoja de avance por día). */
export type PuntoAvance = {
  /** 0 = día de arranque del proyecto. */
  dia: number
  /** Fecha tal como viene de la hoja, día/mes/año. */
  fecha: string
  /** Agentes instalados en total hasta ese día. */
  acumulado: number
  /** Agentes instalados solo ese día. */
  instalados: number
  /** Agentes que faltan para llegar a la meta. */
  restante: number
}

/** Resumen de la etapa Noviembre-Diciembre (una sola fila en la hoja). */
export type ResumenNovDic = {
  acumuladoHoy: number
  metaTotal: number
  metaFinal: number
  fechaInicio: string
  fechaHoy: string
  fechaLimite: string
  diasTranscurridos: number
  diasRestantes: number
  promDiarioInstalado: number
  promDiarioRequerido: number
  restante: number
}


/** Resumen de la etapa Septiembre-Octubre (la hoja trae una métrica por fila). */
export type ResumenSepOct = {
  metaTotal: number
  totalInstalados: number
  /** 0-100, tal como lo calcula la hoja. */
  progreso: number
  /** Agentes que faltan para la meta. */
  faltanteMeta: number
  visitas: number
  /** Tiempos en horas (la hoja no rotula la unidad; se asume por el orden de magnitud: 47 visitas, ~8 h cada una). */
  tiempoInvertido: number
  tiempoMuerto: number
  tiempoTotal: number
  /** 0-100: parte del tiempo total que fue trabajo efectivo. */
  tiempoEfectivo: number
}

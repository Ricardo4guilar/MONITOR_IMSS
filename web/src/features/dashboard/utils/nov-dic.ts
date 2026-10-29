import type { ResumenNovDic } from '@/features/dashboard/types/dashboard.types'

export type EstadoRitmo = 'por-encima' | 'por-debajo'

/** Porcentaje 0-100 de `parte` sobre `total`. Sin total no hay avance que mostrar. */
export function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.min(100, Math.max(0, (parte / total) * 100)) : 0
}

/** Cómo va el ritmo real de instalación frente al que se necesita para llegar a la meta a tiempo. */
export function estadoRitmo(resumen: Pick<ResumenNovDic, 'promDiarioInstalado' | 'promDiarioRequerido'>): EstadoRitmo {
  return resumen.promDiarioInstalado >= resumen.promDiarioRequerido ? 'por-encima' : 'por-debajo'
}

/** Días totales del periodo: los que ya pasaron más los que faltan. */
export function diasDelPeriodo(resumen: Pick<ResumenNovDic, 'diasTranscurridos' | 'diasRestantes'>): number {
  return resumen.diasTranscurridos + resumen.diasRestantes
}

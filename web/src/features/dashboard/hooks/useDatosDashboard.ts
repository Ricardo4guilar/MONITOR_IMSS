import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import {
  cargarAvanceDiario,
  cargarResumenNovDic,
  cargarResumenSepOct,
} from '@/features/dashboard/services/dashboard.service'
import { construirSerieAvance } from '@/features/dashboard/utils/serie-avance'
import { env } from '@/lib/env'
import { fuentesCsv } from '@/lib/fuentes-csv'

const RUTA_LOCAL = `${import.meta.env.BASE_URL}data`
const FUENTES_AVANCE = fuentesCsv(env.VITE_AVANCE_CSV_URL, `${RUTA_LOCAL}/avance_diario.csv`)
const FUENTES_SEPOCT = fuentesCsv(env.VITE_SEPOCT_CSV_URL, `${RUTA_LOCAL}/metricas_sep_oct.csv`)
const FUENTES_NOVDIC = fuentesCsv(env.VITE_NOVDIC_CSV_URL, `${RUTA_LOCAL}/metricas_nov_dic.csv`)

/** Datos del Dashboard: la serie diaria lista para graficar y los resúmenes de cada etapa. */
export function useDatosDashboard() {
  const avance = useQuery({ queryKey: ['dashboard', 'avance'], queryFn: () => cargarAvanceDiario(FUENTES_AVANCE) })
  const sepOct = useQuery({ queryKey: ['dashboard', 'sep-oct'], queryFn: () => cargarResumenSepOct(FUENTES_SEPOCT) })
  const novDic = useQuery({ queryKey: ['dashboard', 'nov-dic'], queryFn: () => cargarResumenNovDic(FUENTES_NOVDIC) })

  const serie = useMemo(() => construirSerieAvance(avance.data ?? []), [avance.data])

  return {
    serie,
    resumenSepOct: sepOct.data ?? null,
    resumenNovDic: novDic.data ?? null,
    cargandoAvance: avance.isPending,
    cargandoSepOct: sepOct.isPending,
    cargandoNovDic: novDic.isPending,
    /** La hoja respondió pero no hay datos aprovechables. */
    avanceVacio: !avance.isPending && serie.length === 0,
    sepOctVacio: !sepOct.isPending && sepOct.data == null,
    novDicVacio: !novDic.isPending && novDic.data == null,
  }
}

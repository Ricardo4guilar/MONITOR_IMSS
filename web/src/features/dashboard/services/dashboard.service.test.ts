import { afterEach, describe, expect, it, vi } from 'vitest'

import { cargarAvanceDiario, cargarResumenNovDic, cargarResumenSepOct } from '@/features/dashboard/services/dashboard.service'
import { fuentesCsv } from '@/lib/fuentes-csv'

const REMOTA = 'https://docs.google.com/spreadsheets/avance.csv'
const LOCAL = '/data/avance.csv'
const FUENTES = fuentesCsv(REMOTA, LOCAL)

const AVANCE = `DiaNum,Dia,Fecha,AgenteAcumuladoDia,Agentesdia,Restante
1,Día 1,10/9/2026,9060,0,15940
0,Día 0,9/9/2026,9060,9060,15940
`

const NOV_DIC = `ID,AcumuladoHoy,MetaTotal,MetaFinal,FechaInicio,FechaHoy,FechaLimite,DiasTranscurridos,DiasRestantes,PromDiarioInstalado,PromDiarioRequerido,Restante
E2,34296,25000,50000,9/9/2026,29/10/2026,31/12/2026,50,63,685.92,249.2698413,15704
`

function simular(porUrl: Record<string, string | null>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: RequestInfo | URL) => {
      const cuerpo = porUrl[String(url)]
      return Promise.resolve(
        cuerpo === undefined || cuerpo === null ? new Response('error', { status: 500 }) : new Response(cuerpo),
      )
    }),
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cargarAvanceDiario', () => {
  it('convierte las filas a números y las ordena por día', async () => {
    simular({ [REMOTA]: AVANCE })

    const serie = await cargarAvanceDiario(FUENTES)

    expect(serie?.map((p) => p.dia)).toEqual([0, 1])
    expect(serie?.[0]).toEqual({ dia: 0, fecha: '9/9/2026', acumulado: 9060, instalados: 9060, restante: 15940 })
  })

  it('descarta las filas con números inválidos', async () => {
    simular({ [REMOTA]: `${AVANCE}2,Día 2,11/9/2026,#N/A,0,15940\n` })

    expect(await cargarAvanceDiario(FUENTES)).toHaveLength(2)
  })

  it('cae a la copia local si la hoja publicada falla', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    simular({ [REMOTA]: null, [LOCAL]: AVANCE })

    expect(await cargarAvanceDiario(FUENTES)).toHaveLength(2)
  })

  it('devuelve null si ninguna fuente sirve', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    simular({ [REMOTA]: null, [LOCAL]: null })

    expect(await cargarAvanceDiario(FUENTES)).toBeNull()
  })
})

describe('cargarResumenNovDic', () => {
  it('lee la fila de resumen, incluidos los decimales', async () => {
    simular({ [REMOTA]: NOV_DIC })

    expect(await cargarResumenNovDic(FUENTES)).toMatchObject({
      acumuladoHoy: 34296,
      metaFinal: 50000,
      fechaLimite: '31/12/2026',
      diasTranscurridos: 50,
      diasRestantes: 63,
      promDiarioInstalado: 685.92,
      promDiarioRequerido: 249.2698413,
      restante: 15704,
    })
  })

  it('devuelve null si la hoja no trae ninguna fila válida', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    simular({ [REMOTA]: 'ID,AcumuladoHoy\nE2,abc\n', [LOCAL]: null })

    expect(await cargarResumenNovDic(FUENTES)).toBeNull()
  })
})

// Hoja clave-valor: una métrica por fila. La cabecera lleva un espacio tras «valor», como la hoja real.
const SEP_OCT = `metrica,valor 
MetaTotal,25000
TotalInstalados,17030
Progreso,68.12%
FaltanteMeta,7970
Visitas,47
TiempoInvertido,360.0208333
TiempoMuerto,23.9375
TiempoTotal,383.9583333
TiempoEfectivo,93.77%
`

describe('cargarResumenSepOct', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('arma el resumen a partir de las filas clave-valor, con porcentajes como número', async () => {
    simular({ [REMOTA]: SEP_OCT })

    expect(await cargarResumenSepOct(FUENTES)).toEqual({
      metaTotal: 25000,
      totalInstalados: 17030,
      progreso: 68.12,
      faltanteMeta: 7970,
      visitas: 47,
      tiempoInvertido: 360.0208333,
      tiempoMuerto: 23.9375,
      tiempoTotal: 383.9583333,
      tiempoEfectivo: 93.77,
    })
  })

  it('si la hoja publicada falla usa la copia local', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    simular({ [REMOTA]: null, [LOCAL]: SEP_OCT })

    expect(await cargarResumenSepOct(FUENTES)).toMatchObject({ totalInstalados: 17030 })
  })

  it('una hoja a la que le falta una métrica no sirve: se prefiere avisar a mostrar cifras a medias', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    simular({ [REMOTA]: SEP_OCT.replace('Visitas,47\n', ''), [LOCAL]: null })

    expect(await cargarResumenSepOct(FUENTES)).toBeNull()
  })

  it('una métrica que no es número invalida la hoja', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    simular({ [REMOTA]: SEP_OCT.replace('Visitas,47', 'Visitas,muchas'), [LOCAL]: null })

    expect(await cargarResumenSepOct(FUENTES)).toBeNull()
  })
})

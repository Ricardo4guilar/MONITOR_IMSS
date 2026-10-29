import { afterEach, describe, expect, it, vi } from 'vitest'

import { cargarEntidades, cargarMetricas, fuentesCsv } from '@/features/mapa/services/mapa.service'

const REMOTA = 'https://docs.google.com/spreadsheets/publicada.csv'
const LOCAL = '/data/local.csv'
const FUENTES = fuentesCsv(REMOTA, LOCAL)

const ENTIDADES_OK = 'NumeroEstado,Nombre,Clave,Region,TipoEspacio\n14,Jalisco,MXJAL,Norte/ Occidente,A\n'

function respuesta(cuerpo: string, estado = 200): Response {
  return new Response(cuerpo, { status: estado })
}

/** Simula el servidor: cada URL responde lo que diga el mapa; las demás, 404. */
function simular(porUrl: Record<string, () => Response | Promise<Response>>) {
  const fetchFalso = vi.fn((url: RequestInfo | URL) => {
    const atender = porUrl[String(url)]
    return Promise.resolve(atender ? atender() : respuesta('', 404))
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fuentesCsv', () => {
  it('pone primero la hoja publicada y después la copia local', () => {
    expect(fuentesCsv(REMOTA, LOCAL)).toEqual([
      { tipo: 'remota', url: REMOTA },
      { tipo: 'local', url: LOCAL },
    ])
  })

  it('sin URL publicada solo queda la copia local', () => {
    expect(fuentesCsv(undefined, LOCAL)).toEqual([{ tipo: 'local', url: LOCAL }])
    expect(fuentesCsv('', LOCAL)).toEqual([{ tipo: 'local', url: LOCAL }])
  })
})

describe('cargarEntidades', () => {
  it('lee la hoja publicada y no toca la copia local si respondió bien', async () => {
    const fetchFalso = simular({ [REMOTA]: () => respuesta(ENTIDADES_OK) })

    await expect(cargarEntidades(FUENTES)).resolves.toEqual([
      { clave: 'MXJAL', nombre: 'Jalisco', region: 'Norte/ Occidente' },
    ])
    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })

  it('cae a la copia local si la hoja responde un error HTTP', async () => {
    simular({ [REMOTA]: () => respuesta('error', 500), [LOCAL]: () => respuesta(ENTIDADES_OK) })

    await expect(cargarEntidades(FUENTES)).resolves.toHaveLength(1)
  })

  it('cae a la copia local si la hoja devuelve una página HTML (hoja privada)', async () => {
    simular({
      [REMOTA]: () => respuesta('<!DOCTYPE html><html><body>Inicia sesión</body></html>'),
      [LOCAL]: () => respuesta(ENTIDADES_OK),
    })

    await expect(cargarEntidades(FUENTES)).resolves.toHaveLength(1)
  })

  it('cae a la copia local si la hoja solo trae el encabezado', async () => {
    simular({
      [REMOTA]: () => respuesta('NumeroEstado,Nombre,Clave,Region,TipoEspacio\n'),
      [LOCAL]: () => respuesta(ENTIDADES_OK),
    })

    await expect(cargarEntidades(FUENTES)).resolves.toHaveLength(1)
  })

  it('cae a la copia local si la red falla', async () => {
    simular({
      [REMOTA]: () => Promise.reject(new TypeError('Failed to fetch')),
      [LOCAL]: () => respuesta(ENTIDADES_OK),
    })

    await expect(cargarEntidades(FUENTES)).resolves.toHaveLength(1)
  })

  it('devuelve null si ninguna fuente sirve, para que el mapa use sus regiones por defecto', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    simular({})

    await expect(cargarEntidades(FUENTES)).resolves.toBeNull()
  })

  it('descarta las filas sin clave', async () => {
    simular({
      [LOCAL]: () => respuesta('Nombre,Clave,Region\nSin clave,,Norte\nJalisco,MXJAL,Norte/ Occidente\n'),
    })

    await expect(cargarEntidades(fuentesCsv(undefined, LOCAL))).resolves.toEqual([
      { clave: 'MXJAL', nombre: 'Jalisco', region: 'Norte/ Occidente' },
    ])
  })
})

describe('cargarMetricas', () => {
  it('indexa por clave en mayúsculas y convierte los números', async () => {
    simular({
      [LOCAL]: () =>
        respuesta('clave_iso,hospitales,servicios,agentes,equipos\nmxjal,12,34,56,"1,234"\nMXCMX,,,,7\n'),
    })

    await expect(cargarMetricas(fuentesCsv(undefined, LOCAL))).resolves.toEqual({
      MXJAL: { hospitales: 12, servicios: 34, agentes: 56, equipos: 1234 },
      MXCMX: { hospitales: 0, servicios: 0, agentes: 0, equipos: 7 },
    })
  })

  it('trata un valor que no es número como cero', async () => {
    simular({ [LOCAL]: () => respuesta('clave_iso,hospitales,servicios,agentes,equipos\nMXJAL,n/a,#REF!,x,\n') })

    await expect(cargarMetricas(fuentesCsv(undefined, LOCAL))).resolves.toEqual({
      MXJAL: { hospitales: 0, servicios: 0, agentes: 0, equipos: 0 },
    })
  })

  it('devuelve un objeto vacío si ninguna fuente sirve: el mapa muestra ceros', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    simular({})

    await expect(cargarMetricas(FUENTES)).resolves.toEqual({})
  })
})

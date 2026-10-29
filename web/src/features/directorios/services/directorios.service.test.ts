import { afterEach, describe, expect, it, vi } from 'vitest'

import { cargarContactos, cargarHospitales } from '@/features/directorios/services/directorios.service'
import { fuentesCsv } from '@/lib/fuentes-csv'

const LOCAL = '/data/dir.csv'
const FUENTES = fuentesCsv(undefined, LOCAL)

const ENCABEZADO_H = 'CLUES,Nombre,Domicilio,EntidadRef,Municipio/Alcaldia,RegionRef,DiasServicio,Horario'
const ENCABEZADO_C = 'ID,Nombre,Puesto,Telefono,Correo,UnidadMedica,HospitalRef,MunicipioAlcaldia,EntidadRef'

function servir(cuerpo: string) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(cuerpo))))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cargarHospitales', () => {
  it('convierte la fila en un hospital con los días de servicio como lista', async () => {
    servir(
      `${ENCABEZADO_H}\nDFIMB002020,HOSPITAL GENERAL,"CALLE 1, COL. UNO",MXCMX,MIGUEL HIDALGO,Metropolitano,"DOMINGO, LUNES, MARTES",00:00 - 23:59\n`,
    )

    expect(await cargarHospitales(FUENTES)).toEqual([
      {
        clues: 'DFIMB002020',
        nombre: 'HOSPITAL GENERAL',
        domicilio: 'CALLE 1, COL. UNO',
        entidadId: 'MXCMX',
        municipio: 'MIGUEL HIDALGO',
        region: 'Metropolitano',
        diasServicio: ['DOMINGO', 'LUNES', 'MARTES'],
        horario: '00:00 - 23:59',
      },
    ])
  })

  it('limpia los espacios sobrantes de la región, que la hoja trae mal', async () => {
    servir(`${ENCABEZADO_H}\nA1,H,D,MXJAL,GDL,Norte/ Occidente ,LUNES,\n`)

    expect((await cargarHospitales(FUENTES))?.[0]?.region).toBe('Norte/ Occidente')
  })

  it('acepta un hospital sin horario ni días', async () => {
    servir(`${ENCABEZADO_H}\nA1,H,D,MXJAL,GDL,Metropolitano,,\n`)

    expect((await cargarHospitales(FUENTES))?.[0]).toMatchObject({ diasServicio: [], horario: '' })
  })

  it('descarta las filas sin CLUES', async () => {
    servir(`${ENCABEZADO_H}\n,Sin clave,D,MXJAL,GDL,Metropolitano,,\nA1,Con clave,D,MXJAL,GDL,Metropolitano,,\n`)

    expect((await cargarHospitales(FUENTES))?.map((h) => h.clues)).toEqual(['A1'])
  })

  it('devuelve null si la hoja no responde', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('x', { status: 500 }))))

    expect(await cargarHospitales(FUENTES)).toBeNull()
  })
})

describe('cargarContactos', () => {
  it('convierte la fila en un contacto', async () => {
    servir(
      `${ENCABEZADO_C}\nca9f3339,Ing. Rosana Barrera,,9811475446,ti@imssbienestar.gob.mx,HOSPITAL GENERAL,CCIMB001526,CAMPECHE,MXCAM\n`,
    )

    expect(await cargarContactos(FUENTES)).toEqual([
      {
        id: 'ca9f3339',
        nombre: 'Ing. Rosana Barrera',
        puesto: '',
        telefono: '9811475446',
        correo: 'ti@imssbienestar.gob.mx',
        unidadMedica: 'HOSPITAL GENERAL',
        hospitalClues: 'CCIMB001526',
        municipio: 'CAMPECHE',
        entidadId: 'MXCAM',
      },
    ])
  })

  it.each([
    ['coma al final', '"egarcia@imssbienestar.gob.mx,"', 'egarcia@imssbienestar.gob.mx'],
    ['espacio al final', 'd_muelitas@hotmail.com ', 'd_muelitas@hotmail.com'],
    ['punto y coma al final', 'ana@x.gob.mx;', 'ana@x.gob.mx'],
  ])('limpia el correo con %s', async (_caso, correo, esperado) => {
    servir(`${ENCABEZADO_C}\nid1,Ana,,555,${correo},U,H1,MUN,MXCAM\n`)

    expect((await cargarContactos(FUENTES))?.[0]?.correo).toBe(esperado)
  })

  it('acepta un contacto sin teléfono ni correo', async () => {
    servir(`${ENCABEZADO_C}\nid1,Ana,,,,U,H1,MUN,MXCAM\n`)

    expect((await cargarContactos(FUENTES))?.[0]).toMatchObject({ telefono: '', correo: '' })
  })

  it('recorta los espacios del CLUES del hospital al que apunta', async () => {
    servir(`${ENCABEZADO_C}\nid1,Ana,,555,,U, TCIMB000190,MUN,MXTAB\n`)

    expect((await cargarContactos(FUENTES))?.[0]?.hospitalClues).toBe('TCIMB000190')
  })

  it('descarta las filas sin nombre', async () => {
    servir(`${ENCABEZADO_C}\nid1,,,555,,U,H1,MUN,MXCAM\nid2,Ana,,555,,U,H1,MUN,MXCAM\n`)

    expect((await cargarContactos(FUENTES))?.map((c) => c.id)).toEqual(['id2'])
  })
})

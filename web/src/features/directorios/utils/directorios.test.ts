import { describe, expect, it } from 'vitest'

import type { Contacto, Hospital } from '@/features/directorios/types/directorios.types'
import {
  contactosDeHospital,
  entidadesPresentes,
  filtrarContactos,
  filtrarHospitales,
  hospitalDeContacto,
} from '@/features/directorios/utils/directorios'

const hospital = (clues: string, extra: Partial<Hospital> = {}): Hospital => ({
  clues,
  nombre: 'HOSPITAL GENERAL',
  domicilio: 'AV. REFORMA 10, CENTRO',
  entidadId: 'MXJAL',
  municipio: 'GUADALAJARA',
  region: 'Norte/ Occidente',
  diasServicio: [],
  horario: '',
  ...extra,
})

const contacto = (id: string, extra: Partial<Contacto> = {}): Contacto => ({
  id,
  nombre: 'Ana Pérez',
  puesto: '',
  telefono: '3312345678',
  correo: 'ana@imssbienestar.gob.mx',
  unidadMedica: 'HOSPITAL GENERAL',
  hospitalClues: 'A1',
  municipio: 'GUADALAJARA',
  entidadId: 'MXJAL',
  ...extra,
})

const HOSPITALES = [
  hospital('A1', { nombre: 'HOSPITAL CIVIL', municipio: 'GUADALAJARA' }),
  hospital('B2', { nombre: 'HOSPITAL INFANTIL', entidadId: 'MXCMX', municipio: 'TLALPAN', region: 'Metropolitano' }),
]

describe('filtrarHospitales', () => {
  const SIN_FILTROS = { texto: '', entidadId: '' }

  it('sin filtros devuelve todos', () => {
    expect(filtrarHospitales(HOSPITALES, SIN_FILTROS)).toHaveLength(2)
  })

  it.each([
    ['nombre', 'infantil', 'B2'],
    ['clues', 'a1', 'A1'],
    ['municipio', 'tlalpan', 'B2'],
    ['domicilio', 'reforma', 'A1'],
  ])('busca por %s sin distinguir mayúsculas ni acentos', (_campo, texto, esperado) => {
    expect(filtrarHospitales(HOSPITALES, { ...SIN_FILTROS, texto }).map((h) => h.clues)).toContain(esperado)
  })

  it('ignora los acentos al buscar', () => {
    const lista = [hospital('C3', { nombre: 'HOSPITAL DE LA MUJER', municipio: 'MÉRIDA' })]

    expect(filtrarHospitales(lista, { ...SIN_FILTROS, texto: 'merida' })).toHaveLength(1)
  })

  it('filtra por estado', () => {
    expect(filtrarHospitales(HOSPITALES, { ...SIN_FILTROS, entidadId: 'MXCMX' }).map((h) => h.clues)).toEqual(['B2'])
  })

  it('combina texto y estado', () => {
    expect(filtrarHospitales(HOSPITALES, { texto: 'hospital', entidadId: 'MXJAL' }).map((h) => h.clues)).toEqual(['A1'])
  })
})

describe('filtrarContactos', () => {
  const CONTACTOS = [
    contacto('c1', { nombre: 'Rosana Barrera', correo: 'rosana@imss.gob.mx' }),
    contacto('c2', { nombre: 'Luis López', telefono: '9991112222', entidadId: 'MXYUC', unidadMedica: 'HOSPITAL O’HORAN' }),
  ]

  it.each([
    ['nombre', 'barrera', 'c1'],
    ['correo', 'rosana@', 'c1'],
    ['teléfono', '99911', 'c2'],
    ['unidad médica', 'horan', 'c2'],
  ])('busca por %s', (_campo, texto, esperado) => {
    expect(filtrarContactos(CONTACTOS, { texto, entidadId: '' }).map((c) => c.id)).toEqual([esperado])
  })

  it('filtra por estado', () => {
    expect(filtrarContactos(CONTACTOS, { texto: '', entidadId: 'MXYUC' }).map((c) => c.id)).toEqual(['c2'])
  })
})

describe('cruce hospital ↔ contacto', () => {
  it('encuentra los contactos de un hospital por su CLUES', () => {
    const contactos = [contacto('c1'), contacto('c2', { hospitalClues: 'B2' }), contacto('c3')]

    expect(contactosDeHospital(contactos, 'A1').map((c) => c.id)).toEqual(['c1', 'c3'])
  })

  it('un hospital sin contactos devuelve una lista vacía', () => {
    expect(contactosDeHospital([contacto('c1')], 'Z9')).toEqual([])
  })

  it('encuentra el hospital de un contacto', () => {
    expect(hospitalDeContacto(HOSPITALES, contacto('c1', { hospitalClues: 'B2' }))?.nombre).toBe('HOSPITAL INFANTIL')
  })

  it('si el hospital no está en el directorio devuelve undefined', () => {
    expect(hospitalDeContacto(HOSPITALES, contacto('c1', { hospitalClues: 'Z9' }))).toBeUndefined()
  })
})

describe('entidadesPresentes', () => {
  it('lista cada estado una vez, con su nombre, ordenado alfabéticamente', () => {
    const lista = entidadesPresentes([{ entidadId: 'MXJAL' }, { entidadId: 'MXCMX' }, { entidadId: 'MXJAL' }])

    expect(lista).toEqual([
      { id: 'MXCMX', nombre: 'Ciudad de México' },
      { id: 'MXJAL', nombre: 'Jalisco' },
    ])
  })
})

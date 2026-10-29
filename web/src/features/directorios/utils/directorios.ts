import { MAPA_GEO } from '@/features/mapa/data/mapa-geo'
import type { Contacto, Hospital } from '@/features/directorios/types/directorios.types'

export type FiltrosDirectorio = {
  texto: string
  /** Clave ISO del estado; vacío = todos. */
  entidadId: string
}

/** Minúsculas y sin acentos, para que «merida» encuentre «MÉRIDA». */
function simplificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function coincide(campos: readonly string[], busqueda: string): boolean {
  return busqueda === '' || campos.some((campo) => simplificar(campo).includes(busqueda))
}

export function filtrarHospitales(hospitales: readonly Hospital[], filtros: FiltrosDirectorio): Hospital[] {
  const busqueda = simplificar(filtros.texto.trim())
  return hospitales.filter(
    (h) =>
      (filtros.entidadId === '' || h.entidadId === filtros.entidadId) &&
      coincide([h.nombre, h.clues, h.municipio, h.domicilio], busqueda),
  )
}

export function filtrarContactos(contactos: readonly Contacto[], filtros: FiltrosDirectorio): Contacto[] {
  const busqueda = simplificar(filtros.texto.trim())
  return contactos.filter(
    (c) =>
      (filtros.entidadId === '' || c.entidadId === filtros.entidadId) &&
      coincide([c.nombre, c.correo, c.telefono, c.unidadMedica, c.municipio], busqueda),
  )
}

/** Contactos que pertenecen a un hospital, por su CLUES. */
export function contactosDeHospital(contactos: readonly Contacto[], clues: string): Contacto[] {
  return contactos.filter((c) => c.hospitalClues === clues)
}

/** Hospital al que pertenece un contacto, o `undefined` si no está en el directorio. */
export function hospitalDeContacto(hospitales: readonly Hospital[], contacto: Contacto): Hospital | undefined {
  return hospitales.find((h) => h.clues === contacto.hospitalClues)
}

const NOMBRE_DE_ESTADO = new Map(MAPA_GEO.states.map((estado) => [estado.id, estado.name]))

/** Nombre del estado a partir de su clave ISO; si no se conoce, la propia clave. */
export function nombreDeEstado(id: string): string {
  return NOMBRE_DE_ESTADO.get(id) ?? id
}

/** Los estados que aparecen en una lista, sin repetir y ordenados por nombre, para el filtro. */
export function entidadesPresentes(items: readonly { entidadId: string }[]): { id: string; nombre: string }[] {
  const ids = [...new Set(items.map((item) => item.entidadId))].filter((id) => id !== '')
  return ids.map((id) => ({ id, nombre: nombreDeEstado(id) })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export type PreferenciaTema = 'claro' | 'oscuro' | 'sistema'

/** Tema que realmente se pinta: «sistema» ya se resolvió. */
export type Tema = 'claro' | 'oscuro'

/** Paleta de color de marca. NW = azul (la de origen); OG = verde institucional IMSS. */
export type PaletaTema = 'nw' | 'og'

export const CLAVE_TEMA = 'imss.tema'
export const CLAVE_PALETA = 'imss.paleta'

/** Oscuro es la identidad visual de la app: es lo que ve quien nunca eligió. */
const PREDETERMINADA: PreferenciaTema = 'oscuro'

/** Azul (NW) es la paleta de origen: es la que ve quien nunca eligió. */
const PALETA_PREDETERMINADA: PaletaTema = 'nw'

const esPreferencia = (valor: string | null): valor is PreferenciaTema =>
  valor === 'claro' || valor === 'oscuro' || valor === 'sistema'

export function resolverTema(preferencia: PreferenciaTema, sistemaPrefiereOscuro: boolean): Tema {
  if (preferencia === 'sistema') return sistemaPrefiereOscuro ? 'oscuro' : 'claro'
  return preferencia
}

/** Lee la preferencia guardada. Nunca lanza: un almacenamiento bloqueado o con basura no debe tumbar la app. */
export function leerPreferencia(almacen: Storage): PreferenciaTema {
  try {
    const guardada = almacen.getItem(CLAVE_TEMA)
    return esPreferencia(guardada) ? guardada : PREDETERMINADA
  } catch {
    return PREDETERMINADA
  }
}

export function guardarPreferencia(almacen: Storage, preferencia: PreferenciaTema): void {
  try {
    almacen.setItem(CLAVE_TEMA, preferencia)
  } catch {
    // Sin almacenamiento el tema vale solo para esta visita; no hay nada más que hacer.
  }
}

const esPaleta = (valor: string | null): valor is PaletaTema => valor === 'nw' || valor === 'og'

/** Lee la paleta guardada. Nunca lanza: un almacenamiento bloqueado o con basura cae en la predeterminada. */
export function leerPaleta(almacen: Storage): PaletaTema {
  try {
    const guardada = almacen.getItem(CLAVE_PALETA)
    return esPaleta(guardada) ? guardada : PALETA_PREDETERMINADA
  } catch {
    return PALETA_PREDETERMINADA
  }
}

export function guardarPaleta(almacen: Storage, paleta: PaletaTema): void {
  try {
    almacen.setItem(CLAVE_PALETA, paleta)
  } catch {
    // Sin almacenamiento la paleta vale solo para esta visita.
  }
}

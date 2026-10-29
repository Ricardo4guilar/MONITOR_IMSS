export type PreferenciaTema = 'claro' | 'oscuro' | 'sistema'

/** Tema que realmente se pinta: «sistema» ya se resolvió. */
export type Tema = 'claro' | 'oscuro'

export const CLAVE_TEMA = 'imss.tema'

/** Oscuro es la identidad visual de la app: es lo que ve quien nunca eligió. */
const PREDETERMINADA: PreferenciaTema = 'oscuro'

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

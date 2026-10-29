/** Unidad médica del directorio de hospitales. */
export type Hospital = {
  /** Clave Única de Establecimientos de Salud: identifica al hospital y lo une con sus contactos. */
  clues: string
  nombre: string
  domicilio: string
  /** Clave ISO del estado (MXCMX…), la misma del mapa. */
  entidadId: string
  municipio: string
  region: string
  /** Días de servicio, uno por elemento ("DOMINGO", "LUNES"…). */
  diasServicio: string[]
  /** "00:00 - 23:59", o vacío si la hoja no lo trae. */
  horario: string
}

/** Persona de contacto de una unidad médica. */
export type Contacto = {
  id: string
  nombre: string
  /** La hoja casi nunca lo trae. */
  puesto: string
  telefono: string
  correo: string
  unidadMedica: string
  /** CLUES del hospital al que pertenece. */
  hospitalClues: string
  municipio: string
  entidadId: string
}

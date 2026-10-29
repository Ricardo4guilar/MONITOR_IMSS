import { z } from 'zod'

import { normalizarRegion } from '@/features/mapa/utils/regiones'

// Las hojas traen celdas vacías o con espacios sobrantes: todo texto se recorta y por defecto es "".
const texto = z
  .string()
  .default('')
  .transform((valor) => valor.trim())

const obligatorio = z.string().trim().min(1)

// Correos sucios en la hoja: "ana@x.gob.mx,", "ana@x.gob.mx " o "ana@x.gob.mx;".
const correo = z
  .string()
  .default('')
  .transform((valor) => valor.trim().replace(/[,;\s]+$/, ''))

export const filaHospitalSchema = z
  .object({
    CLUES: obligatorio,
    Nombre: texto,
    Domicilio: texto,
    EntidadRef: texto,
    'Municipio/Alcaldia': texto,
    RegionRef: texto,
    DiasServicio: texto,
    Horario: texto,
  })
  .transform((fila) => ({
    clues: fila.CLUES,
    nombre: fila.Nombre,
    domicilio: fila.Domicilio,
    entidadId: fila.EntidadRef,
    municipio: fila['Municipio/Alcaldia'],
    region: normalizarRegion(fila.RegionRef),
    diasServicio: fila.DiasServicio.split(',')
      .map((dia) => dia.trim())
      .filter((dia) => dia !== ''),
    horario: fila.Horario,
  }))

export const filaContactoSchema = z
  .object({
    ID: obligatorio,
    Nombre: obligatorio,
    Puesto: texto,
    Telefono: texto,
    Correo: correo,
    UnidadMedica: texto,
    HospitalRef: texto,
    MunicipioAlcaldia: texto,
    EntidadRef: texto,
  })
  .transform((fila) => ({
    id: fila.ID,
    nombre: fila.Nombre,
    puesto: fila.Puesto,
    telefono: fila.Telefono,
    correo: fila.Correo,
    unidadMedica: fila.UnidadMedica,
    hospitalClues: fila.HospitalRef,
    municipio: fila.MunicipioAlcaldia,
    entidadId: fila.EntidadRef,
  }))

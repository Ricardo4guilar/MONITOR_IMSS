import { vi } from 'vitest'

import ENTIDADES_CSV from '../../public/data/entidades_data.csv?raw'

export { ENTIDADES_CSV }

/** Jalisco con las tres métricas que dibujan marcador y un número con separador de miles;
 *  CDMX solo con equipos (no dibuja marcador, igual que en el mapa original). */
export const METRICAS_CSV = `clave_iso,hospitales,servicios,agentes,equipos
MXJAL,12,34,56,"1,234"
MXCMX,0,0,0,7
MXAGU,0,0,0,0
`

// Las hojas de avance son datos en vivo que cambian a diario: los tests usan una muestra fija,
// nunca una copia de la hoja, para que las cifras esperadas no dependan del día en que corren.
export const AVANCE_CSV = `DiaNum,Dia,Fecha,AgenteAcumuladoDia,Agentesdia,Restante
0,Día 0,9/9/2026,9060,9060,15940
1,Día 1,10/9/2026,9060,0,15940
52,Día 52,31/10/2026,17148,0,7852
`

export const NOVDIC_CSV = `ID,AcumuladoHoy,MetaTotal,MetaFinal,FechaInicio,FechaHoy,FechaLimite,DiasTranscurridos,DiasRestantes,PromDiarioInstalado,PromDiarioRequerido,Restante
E2,34296,25000,50000,9/9/2026,29/10/2026,31/12/2026,50,63,685.92,249.2698413,15704
`

// Hoja clave-valor (una métrica por fila). La cabecera lleva un espacio tras «valor», igual que la hoja real.
export const SEPOCT_CSV = `metrica,valor 
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

/** Tres hospitales: uno con 24 h y dos contactos (A1), uno entre semana con un contacto (B2) y uno sin datos (C3). */
export const HOSPITALES_CSV = `CLUES,Nombre,Domicilio,EntidadRef,Municipio/Alcaldia,RegionRef,DiasServicio,Horario
A1,HOSPITAL CIVIL DE GUADALAJARA,"HOSPITAL 278, CENTRO",MXJAL,GUADALAJARA,Norte/ Occidente ,"DOMINGO, LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO",00:00 - 23:59
B2,HOSPITAL INFANTIL DE MEXICO,"DR. MARQUEZ 162, DOCTORES",MXCMX,TLALPAN,Metropolitano,"LUNES, MARTES, MIERCOLES, JUEVES, VIERNES",08:00 - 16:00
C3,HOSPITAL SIN CONTACTOS,"CALLE 60 100, CENTRO",MXYUC,MERIDA,Centro/ Golfo/ Sureste,,
`

/** Un contacto completo (c1), uno sin teléfono ni correo (c2) y uno de otro hospital (c3). */
export const CONTACTOS_CSV = `ID,Nombre,Puesto,Telefono,Correo,UnidadMedica,HospitalRef,MunicipioAlcaldia,EntidadRef
c1,Ing. Rosana Barrera,,3311111111,"rosana@imssbienestar.gob.mx,",HOSPITAL CIVIL DE GUADALAJARA,A1,GUADALAJARA,MXJAL
c2,Lic. Luis López,,,,HOSPITAL CIVIL DE GUADALAJARA,A1,GUADALAJARA,MXJAL
c3,Dra. Marta Ruiz,,5522222222,marta@imss.gob.mx,HOSPITAL INFANTIL DE MEXICO,B2,TLALPAN,MXCMX
`

/** Un cuerpo `null` simula que esa hoja está caída (HTTP 500). */
type Cuerpo = string | null

type Hojas = {
  entidades?: Cuerpo
  metricas?: Cuerpo
  avance?: Cuerpo
  novDic?: Cuerpo
  sepOct?: Cuerpo
  hospitales?: Cuerpo
  contactos?: Cuerpo
}

/** Sustituye `fetch` por un servidor falso de las hojas de la app (mapa, dashboard y directorios). */
export function simularHojas({
  entidades = ENTIDADES_CSV,
  metricas = METRICAS_CSV,
  avance = AVANCE_CSV,
  novDic = NOVDIC_CSV,
  sepOct = SEPOCT_CSV,
  hospitales = HOSPITALES_CSV,
  contactos = CONTACTOS_CSV,
}: Hojas = {}) {
  const atender = (cuerpo: Cuerpo) =>
    Promise.resolve(cuerpo === null ? new Response('error', { status: 500 }) : new Response(cuerpo))

  const fetchFalso = vi.fn((url: RequestInfo | URL) => {
    const direccion = String(url)
    if (direccion.includes('entidades_data.csv')) return atender(entidades)
    if (direccion.includes('metricas_entidad.csv')) return atender(metricas)
    if (direccion.includes('avance_diario.csv')) return atender(avance)
    if (direccion.includes('metricas_nov_dic.csv')) return atender(novDic)
    if (direccion.includes('metricas_sep_oct.csv')) return atender(sepOct)
    if (direccion.includes('directorio_hospitales.csv')) return atender(hospitales)
    if (direccion.includes('directorio_contactos.csv')) return atender(contactos)
    return Promise.resolve(new Response('', { status: 404 }))
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

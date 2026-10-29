import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { simularHojas } from '@/test/fixtures'
import { renderRuta } from '@/test/render-ruta'

const CIVIL = 'HOSPITAL CIVIL DE GUADALAJARA'
const INFANTIL = 'HOSPITAL INFANTIL DE MEXICO'

const detalle = () => screen.getByRole('complementary', { name: 'Detalle del directorio' })
const filas = () => within(screen.getByRole('tabpanel')).getAllByRole('row').slice(1) // sin el encabezado

/** Abre /directorios y espera a que carguen las hojas. */
async function abrir(ruta = '/directorios') {
  const usuario = userEvent.setup()
  renderRuta(ruta)
  await screen.findByRole('button', { name: CIVIL })
  return usuario
}

describe('navegación', () => {
  it('el menú lateral tiene un enlace a Directorios', () => {
    renderRuta('/dashboard')

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(nav).getByRole('link', { name: 'Directorios' })).toHaveAttribute('href', '/directorios')
  })

  it('en esta pantalla la barra superior busca hospitales y contactos, y no ofrece filtro de región', async () => {
    await abrir()

    expect(screen.getByRole('searchbox', { name: 'Buscar hospital o contacto' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Filtrar por región' })).not.toBeInTheDocument()
  })
})

describe('pestañas', () => {
  it('ofrece Hospitales y Contactos con su cantidad, y abre en Hospitales', async () => {
    await abrir()

    expect(screen.getByRole('tab', { name: /Hospitales/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Hospitales.*3/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Contactos.*3/ })).toBeInTheDocument()
  })

  it('la pestaña de la URL (?vista=contactos) abre Contactos', async () => {
    renderRuta('/directorios?vista=contactos')

    expect(await screen.findByRole('button', { name: 'Ing. Rosana Barrera' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Contactos/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('cambiar de pestaña muestra la otra tabla y limpia la selección', async () => {
    const usuario = await abrir()
    await usuario.click(screen.getByRole('button', { name: CIVIL }))

    await usuario.click(screen.getByRole('tab', { name: /Contactos/ }))

    expect(await screen.findByRole('button', { name: 'Dra. Marta Ruiz' })).toBeInTheDocument()
    expect(within(detalle()).getByText('Selecciona un registro')).toBeInTheDocument()
  })
})

describe('tabla de hospitales', () => {
  it('lista cada hospital con su estado, municipio, región y horario resumido', async () => {
    await abrir()

    expect(filas()).toHaveLength(3)
    const civil = filas().find((fila) => within(fila).queryByRole('button', { name: CIVIL }))
    expect(civil).toHaveTextContent('Jalisco')
    expect(civil).toHaveTextContent('GUADALAJARA')
    expect(civil).toHaveTextContent('Norte/ Occidente')
    expect(civil).toHaveTextContent('24 horas')
  })

  it('la búsqueda de la URL (?q=) filtra sin distinguir mayúsculas ni acentos', async () => {
    renderRuta('/directorios?q=merida')

    expect(await screen.findByRole('button', { name: 'HOSPITAL SIN CONTACTOS' })).toBeInTheDocument()
    expect(filas()).toHaveLength(1)
  })

  it('el estado de la URL (?estado=) filtra por entidad', async () => {
    renderRuta('/directorios?estado=MXCMX')

    expect(await screen.findByRole('button', { name: INFANTIL })).toBeInTheDocument()
    expect(filas()).toHaveLength(1)
  })

  it('escribir en el buscador de la barra superior filtra la tabla', async () => {
    const usuario = await abrir()

    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar hospital o contacto' }), 'infantil')

    expect(await screen.findByText('1 de 3 hospitales')).toBeInTheDocument()
  })

  it('sin coincidencias lo dice en lugar de dejar la tabla en blanco', async () => {
    renderRuta('/directorios?q=zzzz')

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument()
  })
})

describe('detalle de un hospital', () => {
  it('muestra domicilio, días, horario y los contactos del hospital', async () => {
    const usuario = await abrir()

    await usuario.click(screen.getByRole('button', { name: CIVIL }))

    const panel = detalle()
    expect(within(panel).getByRole('heading', { level: 2, name: CIVIL })).toBeInTheDocument()
    expect(within(panel).getByText('A1')).toBeInTheDocument()
    expect(within(panel).getByText('HOSPITAL 278, CENTRO')).toBeInTheDocument()
    expect(within(panel).getByText('Todos los días')).toBeInTheDocument()
    expect(within(panel).getByText('24 horas')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Ing. Rosana Barrera' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Lic. Luis López' })).toBeInTheDocument()
  })

  it('los contactos con datos tienen enlaces para llamar y escribir, y los que no, lo avisan', async () => {
    const usuario = await abrir()

    await usuario.click(screen.getByRole('button', { name: CIVIL }))

    const panel = detalle()
    expect(within(panel).getByRole('link', { name: '3311111111' })).toHaveAttribute('href', 'tel:3311111111')
    expect(within(panel).getByRole('link', { name: 'rosana@imssbienestar.gob.mx' })).toHaveAttribute(
      'href',
      'mailto:rosana@imssbienestar.gob.mx',
    )
    expect(within(panel).getByText('Sin teléfono')).toBeInTheDocument()
    expect(within(panel).getByText('Sin correo')).toBeInTheDocument()
  })

  it('un hospital sin contactos lo dice', async () => {
    const usuario = await abrir()

    await usuario.click(screen.getByRole('button', { name: 'HOSPITAL SIN CONTACTOS' }))

    expect(within(detalle()).getByText('Sin contactos registrados')).toBeInTheDocument()
    // Días de servicio y horario: la hoja no trae ninguno de los dos para este hospital.
    expect(within(detalle()).getAllByText('Sin dato', { selector: 'dd' })).toHaveLength(2)
  })

  it('desde un contacto del detalle se salta a la pestaña de Contactos con ese contacto elegido', async () => {
    const usuario = await abrir()
    await usuario.click(screen.getByRole('button', { name: CIVIL }))

    await usuario.click(within(detalle()).getByRole('button', { name: 'Ing. Rosana Barrera' }))

    expect(await screen.findByRole('tab', { name: /Contactos/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(detalle()).getByRole('heading', { level: 2, name: 'Ing. Rosana Barrera' })).toBeInTheDocument()
  })
})

describe('tabla y detalle de contactos', () => {
  async function abrirContactos() {
    const usuario = userEvent.setup()
    renderRuta('/directorios?vista=contactos')
    await screen.findByRole('button', { name: 'Ing. Rosana Barrera' })
    return usuario
  }

  it('lista cada contacto con su unidad médica, estado y datos de contacto', async () => {
    await abrirContactos()

    expect(filas()).toHaveLength(3)
    const marta = filas().find((fila) => within(fila).queryByRole('button', { name: 'Dra. Marta Ruiz' }))
    expect(marta).toHaveTextContent(INFANTIL)
    expect(marta).toHaveTextContent('Ciudad de México')
    expect(within(marta as HTMLElement).getByRole('link', { name: '5522222222' })).toHaveAttribute('href', 'tel:5522222222')
  })

  it('busca por correo', async () => {
    renderRuta('/directorios?vista=contactos&q=marta@')

    expect(await screen.findByRole('button', { name: 'Dra. Marta Ruiz' })).toBeInTheDocument()
    expect(filas()).toHaveLength(1)
  })

  it('el detalle de un contacto muestra su hospital y permite saltar a él', async () => {
    const usuario = await abrirContactos()

    await usuario.click(screen.getByRole('button', { name: 'Dra. Marta Ruiz' }))
    await usuario.click(within(detalle()).getByRole('button', { name: INFANTIL }))

    expect(await screen.findByRole('tab', { name: /Hospitales/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(detalle()).getByRole('heading', { level: 2, name: INFANTIL })).toBeInTheDocument()
  })
})

describe('cuando las hojas fallan', () => {
  it('avisa en lugar de dejar la pantalla en blanco', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    simularHojas({ hospitales: null, contactos: null })
    renderRuta('/directorios')

    expect(await screen.findByText('No se pudo cargar el directorio')).toBeInTheDocument()
  })
})

describe('mientras cargan las hojas', () => {
  /** Hace que una hoja nunca responda, para ver la pantalla en estado de carga. */
  function hojaQueNuncaLlega(hoja: 'hospitales' | 'contactos') {
    const base = simularHojas()
    const sinRespuesta = new Promise<Response>(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn((url: RequestInfo | URL) =>
        String(url).includes(`directorio_${hoja}.csv`) ? sinRespuesta : base(url),
      ),
    )
  }

  it('muestra de inmediato la estructura (pestañas, filtro y tabla) en lugar de una pantalla en blanco', async () => {
    hojaQueNuncaLlega('hospitales')
    renderRuta('/directorios')

    expect(await screen.findByRole('tab', { name: /Hospitales/ })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Cargando hospitales' })).toHaveAttribute('aria-busy', 'true')
  })

  it('dibuja filas de esqueleto con los encabezados reales de la tabla', async () => {
    hojaQueNuncaLlega('hospitales')
    renderRuta('/directorios')

    const tabla = await screen.findByRole('table', { name: 'Cargando hospitales' })
    expect(within(tabla).getByRole('columnheader', { name: 'Hospital' })).toBeInTheDocument()
    expect(within(tabla).getAllByRole('row').length).toBeGreaterThan(5)
  })

  it('al terminar de cargar, el esqueleto desaparece y queda la tabla real', async () => {
    renderRuta('/directorios')

    await screen.findByRole('button', { name: CIVIL })

    expect(screen.queryByRole('table', { name: 'Cargando hospitales' })).not.toBeInTheDocument()
  })

  it('los hospitales se muestran en cuanto llegan, aunque los contactos sigan cargando', async () => {
    hojaQueNuncaLlega('contactos')
    renderRuta('/directorios')

    expect(await screen.findByRole('button', { name: CIVIL })).toBeInTheDocument()
  })

  it('la pestaña cuya hoja sigue cargando muestra su esqueleto', async () => {
    hojaQueNuncaLlega('contactos')
    const usuario = userEvent.setup()
    renderRuta('/directorios')
    await screen.findByRole('button', { name: CIVIL })

    await usuario.click(screen.getByRole('tab', { name: /Contactos/ }))

    expect(await screen.findByRole('table', { name: 'Cargando contactos' })).toBeInTheDocument()
  })

  it('si solo una hoja falla, la otra pestaña sigue sirviendo y la rota lo avisa', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    simularHojas({ contactos: null })
    const usuario = userEvent.setup()
    renderRuta('/directorios')
    await screen.findByRole('button', { name: CIVIL })

    await usuario.click(screen.getByRole('tab', { name: /Contactos/ }))

    expect(await screen.findByText('No se pudieron cargar los contactos')).toBeInTheDocument()
  })
})

describe('seleccionar con un clic en cualquier parte de la fila', () => {
  const celdaDe = (fila: HTMLElement, texto: string) => within(fila).getByText(texto)

  it('en hospitales, un clic en el municipio abre el detalle', async () => {
    const usuario = await abrir()
    const fila = filas().find((f) => within(f).queryByRole('button', { name: CIVIL }))

    await usuario.click(celdaDe(fila as HTMLElement, 'GUADALAJARA'))

    expect(within(detalle()).getByRole('heading', { level: 2, name: CIVIL })).toBeInTheDocument()
  })

  it('en hospitales, un clic en el horario abre el detalle', async () => {
    const usuario = await abrir()
    const fila = filas().find((f) => within(f).queryByRole('button', { name: INFANTIL }))

    await usuario.click(celdaDe(fila as HTMLElement, '08:00 - 16:00'))

    expect(within(detalle()).getByRole('heading', { level: 2, name: INFANTIL })).toBeInTheDocument()
  })

  it('en contactos, un clic en la unidad médica abre el detalle', async () => {
    const usuario = userEvent.setup()
    renderRuta('/directorios?vista=contactos')
    await screen.findByRole('button', { name: 'Dra. Marta Ruiz' })
    const fila = filas().find((f) => within(f).queryByRole('button', { name: 'Dra. Marta Ruiz' }))

    // La unidad médica está dos veces en la fila (columna para pantallas grandes y texto bajo el nombre para móvil):
    // se pulsa la celda de la columna, que es donde haría clic quien usa una pantalla grande.
    await usuario.click(within(fila as HTMLElement).getAllByText(INFANTIL).at(-1) as HTMLElement)

    expect(within(detalle()).getByRole('heading', { level: 2, name: 'Dra. Marta Ruiz' })).toBeInTheDocument()
  })

  it('un clic en el teléfono llama, no abre el detalle: los enlaces conservan su función', async () => {
    const usuario = userEvent.setup()
    renderRuta('/directorios?vista=contactos')
    await screen.findByRole('button', { name: 'Dra. Marta Ruiz' })

    await usuario.click(screen.getByRole('link', { name: '5522222222' }))

    expect(within(detalle()).getByText('Selecciona un registro')).toBeInTheDocument()
  })

  it('las filas avisan que se pueden pulsar', async () => {
    await abrir()

    expect(filas()[0]).toHaveClass('cursor-pointer')
  })

  it('la fila elegida queda marcada como seleccionada', async () => {
    const usuario = await abrir()
    const fila = filas().find((f) => within(f).queryByRole('button', { name: CIVIL })) as HTMLElement

    await usuario.click(celdaDe(fila, 'GUADALAJARA'))

    expect(fila).toHaveAttribute('aria-selected', 'true')
  })
})

describe('en pantallas pequeñas', () => {
  function simularMovil() {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
    )
  }

  it('el detalle no ocupa una columna: no hay panel hasta elegir un registro', async () => {
    simularMovil()
    renderRuta('/directorios')
    await screen.findByRole('button', { name: CIVIL })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Detalle del directorio' })).not.toBeInTheDocument()
  })

  it('elegir un hospital abre su detalle como panel inferior', async () => {
    simularMovil()
    const usuario = userEvent.setup()
    renderRuta('/directorios')
    await usuario.click(await screen.findByRole('button', { name: CIVIL }))

    const panel = await screen.findByRole('dialog', { name: 'Detalle del directorio' })

    expect(within(panel).getByRole('heading', { level: 2, name: CIVIL })).toBeInTheDocument()
    expect(within(panel).getByText('Todos los días')).toBeInTheDocument()
  })

  it('cerrar el panel (Escape) deja la tabla sin selección', async () => {
    simularMovil()
    const usuario = userEvent.setup()
    renderRuta('/directorios')
    await usuario.click(await screen.findByRole('button', { name: CIVIL }))
    await screen.findByRole('dialog')

    await usuario.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: CIVIL })).toHaveAttribute('aria-pressed', 'false')
  })
})

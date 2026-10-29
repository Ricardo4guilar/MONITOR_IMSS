import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { simularHojas } from '@/test/fixtures'
import { renderRuta } from '@/test/render-ruta'

const JALISCO = 'Jalisco, región Norte/ Occidente'

/** Abre /mapa y espera a que las hojas terminen de cargar (el nombre del estado trae su región real). */
async function abrirMapa(ruta = '/mapa') {
  const usuario = userEvent.setup()
  renderRuta(ruta)
  await screen.findByRole('button', { name: JALISCO })
  return usuario
}

const areaDelMapa = () => screen.getByRole('region', { name: 'Mapa de México' })
const panelDeDetalle = () => screen.getByRole('complementary', { name: 'Detalle del estado' })

describe('MapaPage', () => {
  it('dibuja los 32 estados con su región real', async () => {
    await abrirMapa()

    expect(within(areaDelMapa()).getAllByRole('button', { name: /, región / })).toHaveLength(32)
    expect(screen.getByRole('button', { name: 'Ciudad de México, región Metropolitano' })).toBeInTheDocument()
  })

  it('muestra la leyenda con las cuatro regiones oficiales', async () => {
    await abrirMapa()

    const leyenda = screen.getByRole('group', { name: 'Leyenda de regiones' })
    expect(within(leyenda).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Norte/ Occidente',
      'Metropolitano',
      'Centro/Sur',
      'Centro/ Golfo/ Sureste',
    ])
  })

  it('cuenta los estados visibles', async () => {
    await abrirMapa()

    expect(within(areaDelMapa()).getByText('32 estados visibles')).toBeInTheDocument()
  })

  describe('selección y detalle', () => {
    it('al elegir un estado muestra su detalle con capital y métricas', async () => {
      const usuario = await abrirMapa()

      await usuario.click(screen.getByRole('button', { name: JALISCO }))

      const panel = panelDeDetalle()
      expect(within(panel).getByRole('heading', { level: 2, name: 'Jalisco' })).toBeInTheDocument()
      expect(within(panel).getByText('Guadalajara')).toBeInTheDocument()
      expect(within(panel).getByText('Hospitales identificados').nextElementSibling).toHaveTextContent('12')
      expect(within(panel).getByText('Servicios realizados').nextElementSibling).toHaveTextContent('34')
      expect(within(panel).getByText('Agentes instalados').nextElementSibling).toHaveTextContent('56')
      // Con separador de miles, como el original (es-MX).
      expect(within(panel).getByText('Equipos inventariados').nextElementSibling).toHaveTextContent('1,234')
    })

    it('marca como pulsado el estado seleccionado', async () => {
      const usuario = await abrirMapa()
      const jalisco = screen.getByRole('button', { name: JALISCO })

      await usuario.click(jalisco)

      expect(jalisco).toHaveAttribute('aria-pressed', 'true')
    })

    it('un estado sin métricas en la hoja muestra ceros', async () => {
      const usuario = await abrirMapa()

      await usuario.click(screen.getByRole('button', { name: 'Zacatecas, región Norte/ Occidente' }))

      expect(within(panelDeDetalle()).getByText('Hospitales identificados').nextElementSibling).toHaveTextContent('0')
    })

    it('Escape limpia la selección', async () => {
      const usuario = await abrirMapa()
      await usuario.click(screen.getByRole('button', { name: JALISCO }))

      await usuario.keyboard('{Escape}')

      expect(within(panelDeDetalle()).getByText('Selecciona un estado')).toBeInTheDocument()
    })

    it('el botón «Volver al mapa» limpia la selección', async () => {
      const usuario = await abrirMapa()
      await usuario.click(screen.getByRole('button', { name: JALISCO }))

      await usuario.click(within(panelDeDetalle()).getByRole('button', { name: 'Volver al mapa' }))

      expect(within(panelDeDetalle()).getByText('Selecciona un estado')).toBeInTheDocument()
    })

    it('se puede elegir un estado con el teclado', async () => {
      const usuario = await abrirMapa()

      screen.getByRole('button', { name: JALISCO }).focus()
      await usuario.keyboard('{Enter}')

      expect(within(panelDeDetalle()).getByRole('heading', { level: 2, name: 'Jalisco' })).toBeInTheDocument()
    })
  })

  describe('tooltip', () => {
    it('al pasar el cursor muestra nombre, región y capital', async () => {
      const usuario = await abrirMapa()

      await usuario.hover(screen.getByRole('button', { name: JALISCO }))

      const tooltip = screen.getByRole('tooltip')
      expect(within(tooltip).getByText('Jalisco')).toBeInTheDocument()
      expect(tooltip).toHaveTextContent('Norte/ Occidente · Capital: Guadalajara')
    })

    it('desaparece al sacar el cursor', async () => {
      const usuario = await abrirMapa()
      const jalisco = screen.getByRole('button', { name: JALISCO })

      await usuario.hover(jalisco)
      await usuario.unhover(jalisco)

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  describe('filtros', () => {
    it('apagar una región en la leyenda atenúa sus estados y baja el contador', async () => {
      const usuario = await abrirMapa()

      await usuario.click(within(screen.getByRole('group', { name: 'Leyenda de regiones' })).getByRole('button', { name: 'Metropolitano' }))

      expect(screen.getByRole('button', { name: 'Ciudad de México, región Metropolitano' })).toHaveAttribute('data-atenuado', 'true')
      expect(screen.getByRole('button', { name: JALISCO })).not.toHaveAttribute('data-atenuado')
      expect(within(areaDelMapa()).getByText('30 estados visibles')).toBeInTheDocument()
    })

    it('volver a pulsar la región la enciende otra vez', async () => {
      const usuario = await abrirMapa()
      const boton = within(screen.getByRole('group', { name: 'Leyenda de regiones' })).getByRole('button', { name: 'Metropolitano' })

      await usuario.click(boton)
      await usuario.click(boton)

      expect(within(areaDelMapa()).getByText('32 estados visibles')).toBeInTheDocument()
      expect(boton).toHaveAttribute('aria-pressed', 'true')
    })

    it('la búsqueda de la URL (?q=) deja solo los estados que coinciden', async () => {
      renderRuta('/mapa?q=guadalajara')

      expect(await within(areaDelMapa()).findByText('1 estado visible')).toBeInTheDocument()
    })

    it('la región de la URL (?region=) deja solo esa región', async () => {
      renderRuta('/mapa?region=Metropolitano')

      expect(await within(areaDelMapa()).findByText('2 estados visibles')).toBeInTheDocument()
    })

    it('escribir en el buscador de la barra superior filtra el mapa', async () => {
      const usuario = await abrirMapa()

      await usuario.type(screen.getByRole('searchbox', { name: 'Buscar estado o entidad' }), 'jalis')

      expect(await within(areaDelMapa()).findByText('1 estado visible')).toBeInTheDocument()
    })

    it('un estado atenuado no se puede elegir', async () => {
      const usuario = await abrirMapa('/mapa?region=Metropolitano')
      expect(within(areaDelMapa()).getByText('2 estados visibles')).toBeInTheDocument()

      await usuario.click(screen.getByRole('button', { name: JALISCO }))

      expect(within(panelDeDetalle()).getByText('Selecciona un estado')).toBeInTheDocument()
    })
  })

  describe('zoom', () => {
    it('acercar sube el zoom un 40 % y habilita alejar', async () => {
      const usuario = await abrirMapa()
      const alejar = screen.getByRole('button', { name: 'Alejar' })
      expect(alejar).toBeDisabled()

      await usuario.click(screen.getByRole('button', { name: 'Acercar' }))

      expect(screen.getByText('140%')).toBeInTheDocument()
      expect(alejar).toBeEnabled()
    })

    it('«Tamaño real» vuelve al 100 %', async () => {
      const usuario = await abrirMapa()
      await usuario.click(screen.getByRole('button', { name: 'Acercar' }))

      await usuario.click(screen.getByRole('button', { name: 'Tamaño real' }))

      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('no acerca más allá del 600 %', async () => {
      const usuario = await abrirMapa()
      const acercar = screen.getByRole('button', { name: 'Acercar' })

      for (let i = 0; i < 12; i++) {
        if (acercar.hasAttribute('disabled')) break
        await usuario.click(acercar)
      }

      expect(screen.getByText('600%')).toBeInTheDocument()
      expect(acercar).toBeDisabled()
    })

    it('«Restablecer vista» limpia selección, filtros de leyenda y zoom', async () => {
      const usuario = await abrirMapa()
      await usuario.click(screen.getByRole('button', { name: JALISCO }))
      await usuario.click(screen.getByRole('button', { name: 'Acercar' }))
      await usuario.click(within(screen.getByRole('group', { name: 'Leyenda de regiones' })).getByRole('button', { name: 'Metropolitano' }))

      await usuario.click(screen.getByRole('button', { name: 'Restablecer vista' }))

      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(within(areaDelMapa()).getByText('32 estados visibles')).toBeInTheDocument()
      expect(within(panelDeDetalle()).getByText('Selecciona un estado')).toBeInTheDocument()
    })
  })

  describe('marcadores', () => {
    it('solo dibuja marcador en los estados con hospitales, servicios o agentes', async () => {
      await abrirMapa()

      const marcadores = [...areaDelMapa().querySelectorAll('[data-marcador]')]
      expect(marcadores.map((m) => m.getAttribute('data-marcador'))).toEqual(['MXJAL'])
    })
  })

  describe('cuando las hojas fallan', () => {
    it('usa la copia local si la hoja de métricas no responde, y muestra ceros', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      simularHojas({ metricas: null })
      const usuario = userEvent.setup()
      renderRuta('/mapa')
      await screen.findByRole('button', { name: JALISCO })

      await usuario.click(screen.getByRole('button', { name: JALISCO }))

      expect(within(panelDeDetalle()).getByText('Hospitales identificados').nextElementSibling).toHaveTextContent('0')
      expect(areaDelMapa().querySelectorAll('[data-marcador]')).toHaveLength(0)
    })

    it('si no llega la tabla de entidades dibuja el mapa con las regiones que trae por defecto', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      simularHojas({ entidades: null })
      renderRuta('/mapa')

      expect(await screen.findByRole('button', { name: 'Jalisco, región Occidente' })).toBeInTheDocument()
      expect(within(areaDelMapa()).getAllByRole('button', { name: /, región / })).toHaveLength(32)
    })
  })
})

describe('en pantallas pequeñas', () => {
  it('elegir un estado abre su detalle como panel inferior', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
    )
    const usuario = userEvent.setup()
    renderRuta('/mapa')
    await usuario.click(await screen.findByRole('button', { name: JALISCO }))

    const panel = await screen.findByRole('dialog', { name: 'Detalle del estado' })

    expect(within(panel).getByRole('heading', { level: 2, name: 'Jalisco' })).toBeInTheDocument()
    expect(within(panel).getByText('Guadalajara')).toBeInTheDocument()
  })
})

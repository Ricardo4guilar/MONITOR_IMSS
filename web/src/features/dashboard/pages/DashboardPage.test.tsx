import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { simularHojas } from '@/test/fixtures'
import { renderRuta } from '@/test/render-ruta'

const TITULO_AVANCE = 'Avance de instalación: Sep - Oct 2026'
const TITULO_NOV_DIC = 'Métricas Noviembre-Diciembre'
const TITULO_SEP_OCT = 'Métricas de proyecto Sept-Oct'

const panel = (nombre: string) => screen.getByRole('region', { name: nombre })

describe('DashboardPage', () => {
  it('presenta los tres paneles', () => {
    renderRuta('/dashboard')

    for (const titulo of [TITULO_AVANCE, TITULO_SEP_OCT, TITULO_NOV_DIC]) {
      expect(panel(titulo)).toBeInTheDocument()
    }
  })

  it('pone primero la gráfica de avance, que es la protagonista', () => {
    renderRuta('/dashboard')

    const principal = panel(TITULO_AVANCE)
    for (const titulo of [TITULO_SEP_OCT, TITULO_NOV_DIC]) {
      expect(principal.compareDocumentPosition(panel(titulo)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('pone las métricas de Sept-Oct antes que las de Nov-Dic, en orden cronológico', () => {
    renderRuta('/dashboard')

    expect(
      panel(TITULO_SEP_OCT).compareDocumentPosition(panel(TITULO_NOV_DIC)) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('no ofrece buscador ni filtro de región: aquí no filtran nada', () => {
    renderRuta('/dashboard')

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Filtrar por región' })).not.toBeInTheDocument()
  })

  describe('gráfica de avance', () => {
    it('explica las series con una leyenda', () => {
      renderRuta('/dashboard')

      const leyenda = within(panel(TITULO_AVANCE)).getByRole('list', { name: 'Leyenda de la gráfica' })

      expect(within(leyenda).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        'Agentes instalados',
        'Meta',
        'Proyección',
      ])
    })

    it('se anuncia con un resumen de lo que muestra, tomado de la hoja', async () => {
      renderRuta('/dashboard')

      const grafica = await within(panel(TITULO_AVANCE)).findByRole('img', { name: /Gráfica de líneas/ })

      expect(grafica).toHaveAccessibleName(/del 9\/9\/2026 al 31\/10\/2026/)
      expect(grafica).toHaveAccessibleName(/17,148/)
      expect(grafica).toHaveAccessibleName(/25,000/)
    })

    it('mientras carga se marca como ocupada', () => {
      renderRuta('/dashboard')

      expect(panel(TITULO_AVANCE)).toHaveAttribute('aria-busy', 'true')
    })

    it('si la hoja no responde avisa en lugar de dejar el panel en blanco', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      simularHojas({ avance: null })
      renderRuta('/dashboard')

      expect(await within(panel(TITULO_AVANCE)).findByText('No se pudo cargar el avance')).toBeInTheDocument()
    })
  })

  describe('métricas Noviembre-Diciembre', () => {
    it('expresa el avance hacia la meta final como barra de progreso', async () => {
      renderRuta('/dashboard')

      const barra = await within(panel(TITULO_NOV_DIC)).findByRole('progressbar', { name: 'Avance hacia la meta final' })

      expect(barra).toHaveAttribute('aria-valuenow', '68.592')
      expect(within(panel(TITULO_NOV_DIC)).getByText('68.6%')).toBeInTheDocument()
      expect(within(panel(TITULO_NOV_DIC)).getByText('34,296 de 50,000 agentes')).toBeInTheDocument()
    })

    it('muestra el tiempo transcurrido del periodo', async () => {
      renderRuta('/dashboard')

      const barra = await within(panel(TITULO_NOV_DIC)).findByRole('progressbar', { name: 'Tiempo transcurrido' })

      expect(barra).toHaveAttribute('aria-valuenow', String((50 / 113) * 100))
      expect(within(panel(TITULO_NOV_DIC)).getByText('Día 50 de 113 · límite 31/12/2026')).toBeInTheDocument()
    })

    it('compara el ritmo real contra el requerido y dice cuál va por delante', async () => {
      renderRuta('/dashboard')

      await within(panel(TITULO_NOV_DIC)).findByRole('progressbar', { name: 'Ritmo de instalación' })

      expect(within(panel(TITULO_NOV_DIC)).getByText('685.9 agentes/día instalados')).toBeInTheDocument()
      expect(within(panel(TITULO_NOV_DIC)).getByText('249.3 agentes/día requeridos')).toBeInTheDocument()
      expect(within(panel(TITULO_NOV_DIC)).getByText('Por encima del ritmo requerido')).toBeInTheDocument()
    })

    it('si el ritmo real no alcanza el requerido lo advierte', async () => {
      simularHojas({
        novDic: NOVDIC_LENTO,
      })
      renderRuta('/dashboard')

      expect(await within(panel(TITULO_NOV_DIC)).findByText('Por debajo del ritmo requerido')).toBeInTheDocument()
    })

    it('si la hoja no responde avisa en lugar de dejar el panel en blanco', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      simularHojas({ novDic: null })
      renderRuta('/dashboard')

      expect(await within(panel(TITULO_NOV_DIC)).findByText('No se pudo cargar el resumen')).toBeInTheDocument()
    })
  })

  describe('métricas de proyecto Sept-Oct', () => {
    it('expresa el avance hacia la meta como barra de progreso con el porcentaje de la hoja', async () => {
      renderRuta('/dashboard')

      const barra = await within(panel(TITULO_SEP_OCT)).findByRole('progressbar', { name: 'Avance hacia la meta' })

      expect(barra).toHaveAttribute('aria-valuenow', '68.12')
      expect(within(panel(TITULO_SEP_OCT)).getByText('68.1%')).toBeInTheDocument()
      expect(within(panel(TITULO_SEP_OCT)).getByText('17,030 de 25,000 agentes')).toBeInTheDocument()
    })

    it('muestra qué parte del tiempo fue efectiva', async () => {
      renderRuta('/dashboard')

      const barra = await within(panel(TITULO_SEP_OCT)).findByRole('progressbar', { name: 'Tiempo efectivo' })

      expect(barra).toHaveAttribute('aria-valuenow', '93.77')
      expect(within(panel(TITULO_SEP_OCT)).getByText('93.8%')).toBeInTheDocument()
      expect(within(panel(TITULO_SEP_OCT)).getByText('360.0 h invertidas de 384.0 h totales')).toBeInTheDocument()
    })

    it('resume visitas, agentes que faltan y tiempo muerto', async () => {
      renderRuta('/dashboard')

      await within(panel(TITULO_SEP_OCT)).findByRole('progressbar', { name: 'Tiempo efectivo' })
      const cifras = within(panel(TITULO_SEP_OCT))

      expect(cifras.getByText('Visitas').nextElementSibling).toHaveTextContent('47')
      expect(cifras.getByText('Faltan').nextElementSibling).toHaveTextContent('7,970')
      expect(cifras.getByText('Tiempo muerto').nextElementSibling).toHaveTextContent('23.9 h')
    })

    it('mientras carga se marca como ocupado', () => {
      renderRuta('/dashboard')

      expect(panel(TITULO_SEP_OCT)).toHaveAttribute('aria-busy', 'true')
    })

    it('si la hoja no responde avisa en lugar de dejar el panel en blanco', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      simularHojas({ sepOct: null })
      renderRuta('/dashboard')

      expect(await within(panel(TITULO_SEP_OCT)).findByText('No se pudieron cargar las métricas')).toBeInTheDocument()
    })
  })
})

// Mismo resumen, pero con 100 agentes/día instalados frente a 249 requeridos.
const NOVDIC_LENTO = `ID,AcumuladoHoy,MetaTotal,MetaFinal,FechaInicio,FechaHoy,FechaLimite,DiasTranscurridos,DiasRestantes,PromDiarioInstalado,PromDiarioRequerido,Restante
E2,5000,25000,50000,9/9/2026,29/10/2026,31/12/2026,50,63,100,249.2698413,45000
`

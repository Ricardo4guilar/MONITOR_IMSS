import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LogoImss } from '@/components/compartidos/LogoImss'

describe('LogoImss', () => {
  it('se anuncia como imagen con el nombre de la institución', () => {
    const { getByRole } = render(<LogoImss />)

    expect(getByRole('img', { name: 'IMSS Bienestar' })).toBeInTheDocument()
  })

  it('se pinta con el color del texto, no con uno fijo, para verse blanco sobre el tema oscuro', () => {
    const { getByRole } = render(<LogoImss />)

    expect(getByRole('img', { name: 'IMSS Bienestar' })).toHaveClass('bg-foreground')
  })
})

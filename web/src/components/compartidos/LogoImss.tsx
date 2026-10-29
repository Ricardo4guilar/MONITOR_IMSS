import { cn } from '@/lib/utils'
import logoUrl from '@/assets/imss-logo.svg'

type LogoImssProps = {
  className?: string
}

/**
 * Logo del IMSS usado como máscara: la silueta se pinta con el color del texto del tema,
 * así se ve blanco sobre el fondo oscuro sin mantener una segunda versión del archivo.
 */
export function LogoImss({ className }: LogoImssProps) {
  return (
    <span
      role="img"
      aria-label="IMSS Bienestar"
      className={cn('inline-block aspect-square bg-foreground', className)}
      style={{
        maskImage: `url(${logoUrl})`,
        WebkitMaskImage: `url(${logoUrl})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}

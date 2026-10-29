import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { rutas } from '@/app/router/routes'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { crearAuthDesarrollo, CLAVE_DE_ALMACEN } from '@/features/auth/services/auth.desarrollo'
import type { ServicioAuth } from '@/features/auth/types/auth.types'
import { ThemeProvider } from '@/features/tema/ThemeProvider'
import { crearQueryClient } from '@/lib/query-client'

export const USUARIO_PRUEBA = 'imss_general'
export const CLAVE_PRUEBA = 'clave-de-prueba'

/** Almacén en memoria con la interfaz de sessionStorage: cada prueba parte de cero. */
export function almacenEnMemoria(): Storage {
  const datos = new Map<string, string>()
  return {
    get length() {
      return datos.size
    },
    clear: () => datos.clear(),
    getItem: (clave) => datos.get(clave) ?? null,
    key: (indice) => [...datos.keys()][indice] ?? null,
    removeItem: (clave) => void datos.delete(clave),
    setItem: (clave, valor) => void datos.set(clave, valor),
  }
}

/** Auth real de desarrollo, sin pausas, con o sin sesión ya abierta. */
export function crearAuthDePrueba(conSesion: boolean): ServicioAuth {
  const almacen = almacenEnMemoria()
  if (conSesion) {
    almacen.setItem(CLAVE_DE_ALMACEN, JSON.stringify({ usuario: USUARIO_PRUEBA, expiraEn: Date.now() + 3_600_000 }))
  }
  return crearAuthDesarrollo({ usuario: USUARIO_PRUEBA, clave: CLAVE_PRUEBA, almacen, esperaMs: 0 })
}

type Opciones = {
  /** Por defecto la prueba entra ya autenticada; pásalo en `false` para ver el login. */
  conSesion?: boolean
  /** Para probar casos que el adaptador real no produce (carga lenta, auth no configurada…). */
  auth?: ServicioAuth
}

/** Monta la app completa (tema + datos + auth + layout + rutas) en la ruta indicada, sin navegador. */
export function renderRuta(ruta: string, { conSesion = true, auth }: Opciones = {}) {
  const servicio = auth ?? crearAuthDePrueba(conSesion)
  const queryClient = crearQueryClient()
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  return {
    servicio,
    queryClient,
    ...render(
      <ThemeProvider almacen={almacenEnMemoria()}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider servicio={servicio}>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>,
    ),
  }
}

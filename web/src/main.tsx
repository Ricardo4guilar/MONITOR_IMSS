import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'

import { rutas } from '@/app/router/routes'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { crearServicioAuth } from '@/features/auth/services/auth'
import { ThemeProvider } from '@/features/tema/ThemeProvider'
import { crearQueryClient } from '@/lib/query-client'
import './index.css'

const router = createBrowserRouter(rutas)
const queryClient = crearQueryClient()
const servicioAuth = crearServicioAuth()

const raiz = document.getElementById('root')
if (!raiz) throw new Error('No se encontró el elemento #root en index.html')

createRoot(raiz).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider servicio={servicioAuth}>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)

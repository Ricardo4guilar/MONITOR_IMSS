import { Navigate, type RouteObject } from 'react-router'

import { AppShell } from '@/app/layouts/AppShell'
import type { RouteHandle } from '@/app/router/route-handle'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { CallbackPage } from '@/features/auth/pages/CallbackPage'
import { RutaProtegida } from '@/features/auth/RutaProtegida'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { DirectoriosPage } from '@/features/directorios/pages/DirectoriosPage'
import { MapaPage } from '@/features/mapa/pages/MapaPage'
import { AjustesPage } from '@/features/ajustes/pages/AjustesPage'

const handleDashboard: RouteHandle = {
  titulo: 'Dashboard — IMSS Bienestar',
  subtitulo: 'Avance del proyecto de instalación de agentes',
  // El Dashboard muestra totales del proyecto, no por estado: buscar o filtrar región no tiene efecto aquí.
  buscador: false,
  filtroRegion: false,
}

const handleMapa: RouteHandle = {
  titulo: 'Mapa de México — IMSS Bienestar',
  subtitulo: '32 estados · Haz clic en un estado para ver detalle',
}

const handleDirectorios: RouteHandle = {
  titulo: 'Directorios — IMSS Bienestar',
  subtitulo: 'Hospitales y contactos médicos',
  busqueda: 'Buscar hospital o contacto',
  filtroRegion: false,
}

const handleAjustes: RouteHandle = {
  titulo: 'Ajustes — IMSS Bienestar',
  subtitulo: 'Apariencia y sesión',
  buscador: false,
  filtroRegion: false,
}

export const rutas: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  // Pública a propósito: aquí vuelve Cognito y es donde se abre la sesión.
  { path: '/auth/callback', element: <CallbackPage /> },
  {
    // Todo lo que está aquí dentro exige sesión; sin ella se redirige a /login.
    element: <RutaProtegida />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage />, handle: handleDashboard },
          { path: 'mapa', element: <MapaPage />, handle: handleMapa },
          { path: 'directorios', element: <DirectoriosPage />, handle: handleDirectorios },
          { path: 'ajustes', element: <AjustesPage />, handle: handleAjustes },
        ],
      },
    ],
  },
]

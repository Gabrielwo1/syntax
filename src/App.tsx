import React from 'react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('App crash:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
          <div className="max-w-lg w-full bg-white rounded-xl shadow p-6 text-center">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Algo deu errado</h1>
            <p className="text-slate-500 text-sm mb-4">Recarregue a página ou entre em contato com o suporte.</p>
            <pre className="text-xs text-left bg-slate-100 rounded p-3 overflow-auto text-red-500">
              {(this.state.error as Error).message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import SiteDetail from './pages/SiteDetail'
import CRM from './pages/CRM'
import Financeiro from './pages/Financeiro'
import Tasks from './pages/Tasks'
import PDFs from './pages/PDFs'
import Repository from './pages/Repository'
import Users from './pages/Users'
import SocialMedia from './pages/SocialMedia'

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Carregando...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />

  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading, initialized } = useAuth()

  if (loading || initialized === null) return <LoadingSpinner />

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics/:siteId"
        element={
          <ProtectedRoute>
            <SiteDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <ProtectedRoute>
            <CRM />
          </ProtectedRoute>
        }
      />
      <Route
        path="/financeiro"
        element={
          <ProtectedRoute>
            <Financeiro />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tarefas"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pdfs"
        element={
          <ProtectedRoute>
            <PDFs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/repositorio"
        element={
          <ProtectedRoute>
            <Repository />
          </ProtectedRoute>
        }
      />
      <Route
        path="/social-media"
        element={
          <ProtectedRoute>
            <SocialMedia />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute adminOnly>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

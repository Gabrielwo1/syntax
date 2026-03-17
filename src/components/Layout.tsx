import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import {
  LayoutDashboard,
  BarChart2,
  Users2,
  DollarSign,
  CheckSquare,
  FileText,
  Image,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Zap,
  Share2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
  permission?: string
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart2 size={18} />, permission: 'analytics' },
  { to: '/crm', label: 'CRM', icon: <Users2 size={18} />, permission: 'crm' },
  { to: '/financeiro', label: 'Financeiro', icon: <DollarSign size={18} />, permission: 'financeiro' },
  { to: '/tarefas', label: 'Tarefas', icon: <CheckSquare size={18} />, permission: 'tarefas' },
  { to: '/pdfs', label: 'PDFs', icon: <FileText size={18} />, permission: 'pdfs' },
  { to: '/repositorio', label: 'Repositório', icon: <Image size={18} />, permission: 'repositorio' },
  { to: '/social-media', label: 'Social Media', icon: <Share2 size={18} /> },
  { to: '/usuarios', label: 'Usuários', icon: <Users size={18} />, adminOnly: true },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, permissions, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
      toast.success('Sessão encerrada')
    } catch {
      toast.error('Erro ao sair')
    }
  }

  const userName = user?.user_metadata?.name || user?.email || 'Usuário'
  const userRole = user?.user_metadata?.role === 'admin' ? 'Administrador' : 'Membro'
  const userInitials = userName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  const visibleItems = navItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    if (item.permission && !isAdmin && !permissions.includes(item.permission)) return false
    return true
  })

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Zap size={16} />
          </div>
          <div>
            <p className="text-white font-bold text-base tracking-tight">Syntax</p>
            <p className="text-slate-400 text-xs">Plataforma de Gestão</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="text-indigo-300" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700/30 mb-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
            <p className="text-slate-400 text-xs">{userRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-700/60 hover:text-red-400 transition-all duration-150"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-60 flex-shrink-0 h-full"
        style={{ backgroundColor: '#0f172a' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative flex flex-col w-64 h-full shadow-2xl"
            style={{ backgroundColor: '#0f172a' }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header
          className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-slate-200 bg-white"
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <Zap size={14} />
            </div>
            <span className="font-bold text-slate-800">Syntax</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

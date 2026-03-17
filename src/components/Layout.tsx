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
  Share2,
  Receipt,
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
  { to: '/orcamento', label: 'Orçamentos', icon: <Receipt size={18} /> },
  { to: '/social-media', label: 'Social Media', icon: <Share2 size={18} /> },
  { to: '/usuarios', label: 'Usuários', icon: <Users size={18} />, adminOnly: true },
]

// ─── Syntax Logo SVG ──────────────────────────────────────────────────────────
// Recreated from brand image: two opposing chevrons (angular S shape)
// with 4 green facets each — deep shadow → bright lime
function SyntaxLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Upper right-pointing chevron */}
      <polygon points="5,5 22,5 22,26 5,26"       fill="#0a3010" />
      <polygon points="22,5 42,5 42,26 22,26"      fill="#165018" />
      <polygon points="42,5 68,26 42,26"           fill="#28882e" />
      <polygon points="42,26 68,26 42,47 22,47"    fill="#52cc2c" />
      {/* Lower left-pointing chevron */}
      <polygon points="95,53 78,53 78,74 95,74"    fill="#0a3010" />
      <polygon points="78,53 58,53 58,74 78,74"    fill="#165018" />
      <polygon points="58,53 32,74 58,74"          fill="#28882e" />
      <polygon points="58,74 32,74 58,95 78,95"    fill="#52cc2c" />
    </svg>
  )
}

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
      {/* Logo header */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <SyntaxLogo size={36} />
          <div>
            <p className="text-white font-bold text-base tracking-widest uppercase">Syntax</p>
            <p className="text-zinc-500 text-xs">Plataforma de Gestão</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="text-emerald-300" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-800/50 mb-2 border border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-50 text-sm font-medium truncate">{userName}</p>
            <p className="text-zinc-500 text-xs">{userRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 transition-all duration-150"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 h-full bg-zinc-950 border-r border-zinc-800">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 h-full bg-zinc-950 border-r border-zinc-800 shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1">
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <SyntaxLogo size={28} />
            <span className="font-bold text-zinc-50 tracking-widest uppercase text-sm">Syntax</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  )
}

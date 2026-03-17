import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Users2,
  DollarSign,
  CheckSquare,
  Globe,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  BarChart2,
  FileText,
  Image,
  Loader2,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { crmApi, financeiroApi, tasksApi, sitesApi } from '../lib/api'
import type { Lead, FinancialEntry, Task, Site } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  trend?: { value: number; positive: boolean }
  subtitle?: string
}

function StatCard({ title, value, icon, color, trend, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trend.value}% este mês</span>
          </div>
        )}
      </div>
    </div>
  )
}

const MODULES = [
  { to: '/analytics', label: 'Analytics', desc: 'Sites e métricas de acesso', icon: <BarChart2 size={20} />, color: 'bg-blue-50 text-blue-600' },
  { to: '/crm', label: 'CRM', desc: 'Gestão de leads e clientes', icon: <Users2 size={20} />, color: 'bg-violet-50 text-violet-600' },
  { to: '/financeiro', label: 'Financeiro', desc: 'Contas a pagar e receber', icon: <DollarSign size={20} />, color: 'bg-emerald-50 text-emerald-600' },
  { to: '/tarefas', label: 'Tarefas', desc: 'Gestão de tarefas e projetos', icon: <CheckSquare size={20} />, color: 'bg-amber-50 text-amber-600' },
  { to: '/pdfs', label: 'PDFs', desc: 'Repositório de documentos', icon: <FileText size={20} />, color: 'bg-rose-50 text-rose-600' },
  { to: '/repositorio', label: 'Repositório', desc: 'Imagens e mídias sociais', icon: <Image size={20} />, color: 'bg-cyan-50 text-cyan-600' },
]

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function Dashboard() {
  const { user, isAdmin, permissions } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [sites, setSites] = useState<Site[]>([])

  const canAccess = (perm: string) => isAdmin || permissions.includes(perm)

  useEffect(() => {
    const fetches: Promise<void>[] = []

    if (canAccess('crm')) {
      fetches.push(crmApi.getLeads().then(r => setLeads(r.leads)).catch(() => {}))
    }
    if (canAccess('financeiro')) {
      fetches.push(financeiroApi.getEntries().then(r => setEntries(r.entries)).catch(() => {}))
    }
    if (canAccess('tarefas')) {
      fetches.push(tasksApi.getTasks().then(r => setTasks(r.tasks)).catch(() => {}))
    }
    if (canAccess('analytics')) {
      fetches.push(sitesApi.list().then(r => setSites(r.sites)).catch(() => {}))
    }

    Promise.all(fetches).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalReceivable = entries
    .filter(e => e.type === 'receivable' && e.status === 'pending')
    .reduce((s, e) => s + e.amount, 0)

  const pendingTasks = tasks.filter(t => t.status !== 'completed').length
  const activeTasks = tasks.filter(t => t.status === 'in_progress').length

  // Build monthly revenue chart from paid receivable entries
  const revenueByMonth: Record<string, number> = {}
  entries
    .filter(e => e.type === 'receivable' && e.status === 'paid')
    .forEach(e => {
      try {
        const month = format(parseISO(e.dueDate), 'MMM', { locale: ptBR })
        revenueByMonth[month] = (revenueByMonth[month] || 0) + e.amount
      } catch { /* skip */ }
    })
  const chartData = Object.entries(revenueByMonth).map(([month, amount]) => ({ month, amount }))

  const recentLeads = leads.slice(0, 5)
  const recentTasks = tasks.slice(0, 5)

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'

  const visibleModules = MODULES.filter(m => {
    const perm = m.label.toLowerCase().replace('ó', 'o')
    if (m.to === '/analytics') return canAccess('analytics')
    if (m.to === '/crm') return canAccess('crm')
    if (m.to === '/financeiro') return canAccess('financeiro')
    if (m.to === '/tarefas') return canAccess('tarefas')
    if (m.to === '/pdfs') return canAccess('pdfs')
    if (m.to === '/repositorio') return canAccess('repositorio')
    return true
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-800">
          Olá, {userName.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
            {canAccess('crm') && (
              <StatCard
                title="Total de Leads"
                value={leads.length}
                icon={<Users2 size={20} className="text-violet-600" />}
                color="bg-violet-50"
                subtitle={`${leads.filter(l => l.stage === 'novo').length} novos`}
              />
            )}
            {canAccess('financeiro') && (
              <StatCard
                title="A Receber"
                value={formatCurrency(totalReceivable)}
                icon={<DollarSign size={20} className="text-emerald-600" />}
                color="bg-emerald-50"
                subtitle="Entradas pendentes"
              />
            )}
            {canAccess('tarefas') && (
              <StatCard
                title="Tarefas Ativas"
                value={pendingTasks}
                icon={<CheckSquare size={20} className="text-amber-600" />}
                color="bg-amber-50"
                subtitle={`${activeTasks} em progresso`}
              />
            )}
            {canAccess('analytics') && (
              <StatCard
                title="Sites Monitorados"
                value={sites.length}
                icon={<Globe size={20} className="text-blue-600" />}
                color="bg-blue-50"
                subtitle="Sites ativos"
              />
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-7">
            {/* Revenue chart */}
            {canAccess('financeiro') && chartData.length > 0 && (
              <div className="xl:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800">Receita Recebida</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Por mês de vencimento</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), 'Receita']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent leads */}
            {canAccess('crm') && recentLeads.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">Leads Recentes</h3>
                  <button onClick={() => navigate('/crm')} className="text-indigo-600 text-xs font-medium flex items-center gap-1 hover:text-indigo-700">
                    Ver todos <ArrowRight size={12} />
                  </button>
                </div>
                <div className="space-y-3">
                  {recentLeads.map(lead => (
                    <div key={lead.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-xs font-bold flex-shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{lead.name}</p>
                        <p className="text-xs text-slate-400 truncate">{lead.company || lead.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        lead.stage === 'fechado' ? 'bg-emerald-100 text-emerald-700' :
                        lead.stage === 'perdido' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {lead.stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tasks & Modules */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Recent tasks */}
            {canAccess('tarefas') && recentTasks.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">Tarefas Recentes</h3>
                  <button onClick={() => navigate('/tarefas')} className="text-indigo-600 text-xs font-medium flex items-center gap-1 hover:text-indigo-700">
                    Ver todas <ArrowRight size={12} />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {recentTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.status === 'completed' ? 'bg-emerald-500' :
                        task.status === 'in_progress' ? 'bg-amber-500' :
                        'bg-slate-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 truncate">{task.name}</p>
                        {task.project && <p className="text-xs text-slate-400">{task.project}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Module shortcuts */}
            <div className={`${canAccess('tarefas') && recentTasks.length > 0 ? 'xl:col-span-2' : 'xl:col-span-3'} bg-white rounded-xl p-5 shadow-sm border border-slate-100`}>
              <h3 className="font-semibold text-slate-800 mb-4">Módulos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visibleModules.map(mod => (
                  <button
                    key={mod.to}
                    onClick={() => navigate(mod.to)}
                    className="flex flex-col items-start gap-3 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-150 text-left group"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${mod.color}`}>
                      {mod.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">{mod.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-tight">{mod.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

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
  Trophy,
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
import { format, parseISO, isToday, startOfWeek, isAfter } from 'date-fns'
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
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-zinc-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-zinc-50 mt-0.5">{value}</p>
        {subtitle && <p className="text-zinc-500 text-xs mt-0.5">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-rose-400'}`}>
            {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trend.value}% este mês</span>
          </div>
        )}
      </div>
    </div>
  )
}

const MODULES = [
  { to: '/analytics', label: 'Analytics', desc: 'Sites e métricas de acesso', icon: <BarChart2 size={20} />, color: 'bg-blue-500/10 text-blue-600' },
  { to: '/crm', label: 'CRM', desc: 'Gestão de leads e clientes', icon: <Users2 size={20} />, color: 'bg-violet-500/10 text-violet-600' },
  { to: '/financeiro', label: 'Financeiro', desc: 'Contas a pagar e receber', icon: <DollarSign size={20} />, color: 'bg-emerald-500/10 text-emerald-600' },
  { to: '/tarefas', label: 'Tarefas', desc: 'Gestão de tarefas e projetos', icon: <CheckSquare size={20} />, color: 'bg-amber-500/10 text-amber-400' },
  { to: '/pdfs', label: 'PDFs', desc: 'Repositório de documentos', icon: <FileText size={20} />, color: 'bg-rose-50 text-rose-600' },
  { to: '/repositorio', label: 'Repositório', desc: 'Imagens e mídias sociais', icon: <Image size={20} />, color: 'bg-cyan-50 text-cyan-600' },
]

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

type LeaderboardPeriod = 'hoje' | 'semana'

interface RankEntry {
  name: string
  count: number
}

export default function Dashboard() {
  const { user, isAdmin, permissions } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [lbPeriod, setLbPeriod] = useState<LeaderboardPeriod>('hoje')

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

  // Build leaderboard from stage_change activities
  const weekStart = startOfWeek(new Date(), { locale: ptBR })
  const moveCount: Record<string, number> = {}
  leads.forEach(lead => {
    (lead.activities || []).forEach(a => {
      if (a.type !== 'stage_change') return
      const mover = a.movedBy || 'Desconhecido'
      const ts = a.at || a.createdAt
      if (!ts) return
      let include = false
      try {
        const d = parseISO(ts)
        include = lbPeriod === 'hoje' ? isToday(d) : isAfter(d, weekStart)
      } catch { return }
      if (include) moveCount[mover] = (moveCount[mover] || 0) + 1
    })
  })
  const leaderboard: RankEntry[] = Object.entries(moveCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

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
        <h1 className="text-2xl font-bold text-zinc-50">
          Olá, {userName.split(' ')[0]} 👋
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
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
                color="bg-violet-500/10"
                subtitle={`${leads.filter(l => l.stage === 'novo').length} novos`}
              />
            )}
            {canAccess('financeiro') && (
              <StatCard
                title="A Receber"
                value={formatCurrency(totalReceivable)}
                icon={<DollarSign size={20} className="text-emerald-600" />}
                color="bg-emerald-500/10"
                subtitle="Entradas pendentes"
              />
            )}
            {canAccess('tarefas') && (
              <StatCard
                title="Tarefas Ativas"
                value={pendingTasks}
                icon={<CheckSquare size={20} className="text-amber-400" />}
                color="bg-amber-500/10"
                subtitle={`${activeTasks} em progresso`}
              />
            )}
            {canAccess('analytics') && (
              <StatCard
                title="Sites Monitorados"
                value={sites.length}
                icon={<Globe size={20} className="text-blue-600" />}
                color="bg-blue-500/10"
                subtitle="Sites ativos"
              />
            )}
          </div>

          {/* CRM Leaderboard */}
          {canAccess('crm') && (
            <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10 mb-7">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" />
                  <h3 className="font-semibold text-zinc-50">Ranking CRM</h3>
                  <span className="text-zinc-500 text-xs">— leads movimentados</span>
                </div>
                <div className="flex rounded-lg border border-zinc-700 overflow-hidden text-xs font-medium">
                  <button
                    onClick={() => setLbPeriod('hoje')}
                    className={`px-3 py-1.5 transition-colors ${lbPeriod === 'hoje' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => setLbPeriod('semana')}
                    className={`px-3 py-1.5 transition-colors ${lbPeriod === 'semana' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Esta semana
                  </button>
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-6">
                  Nenhuma movimentação {lbPeriod === 'hoje' ? 'hoje' : 'esta semana'}.
                </p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {leaderboard.map((entry, i) => {
                    const podium = ['🥇', '🥈', '🥉']
                    const isTop3 = i < 3
                    return (
                      <div
                        key={entry.name}
                        title={`${entry.name} — ${entry.count} ${entry.count === 1 ? 'movimentação' : 'movimentações'}`}
                        className="flex flex-col items-center gap-1.5"
                      >
                        {/* Avatar — mesmo estilo do card do CRM */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-sm font-bold text-indigo-400 select-none">
                            {getInitials(entry.name)}
                          </div>
                          {/* Badge de quantidade */}
                          <span className={`absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold leading-none ${
                            isTop3 ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-700 text-zinc-200'
                          }`}>
                            {entry.count}
                          </span>
                        </div>
                        {/* Nome abreviado + medalha */}
                        <div className="flex items-center gap-0.5">
                          {podium[i] && <span className="text-[11px] leading-none">{podium[i]}</span>}
                          <span className="text-[11px] text-zinc-400 max-w-[60px] truncate leading-tight">
                            {entry.name.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-7">
            {/* Revenue chart */}
            {canAccess('financeiro') && chartData.length > 0 && (
              <div className="xl:col-span-2 bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-50">Receita Recebida</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">Por mês de vencimento</p>
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
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-zinc-50">Leads Recentes</h3>
                  <button onClick={() => navigate('/crm')} className="text-emerald-500 text-xs font-medium flex items-center gap-1 hover:text-emerald-400">
                    Ver todos <ArrowRight size={12} />
                  </button>
                </div>
                <div className="space-y-3">
                  {recentLeads.map(lead => (
                    <div key={lead.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-600 text-xs font-bold flex-shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{lead.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{lead.company || lead.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        lead.stage === 'fechado' ? 'bg-emerald-500/20 text-emerald-400' :
                        lead.stage === 'perdido' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-zinc-800 text-zinc-300'
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
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-zinc-50">Tarefas Recentes</h3>
                  <button onClick={() => navigate('/tarefas')} className="text-emerald-500 text-xs font-medium flex items-center gap-1 hover:text-emerald-400">
                    Ver todas <ArrowRight size={12} />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {recentTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-950">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.status === 'completed' ? 'bg-emerald-500/100' :
                        task.status === 'in_progress' ? 'bg-amber-500/100' :
                        'bg-slate-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-100 truncate">{task.name}</p>
                        {task.project && <p className="text-xs text-zinc-500">{task.project}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Module shortcuts */}
            <div className={`${canAccess('tarefas') && recentTasks.length > 0 ? 'xl:col-span-2' : 'xl:col-span-3'} bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10`}>
              <h3 className="font-semibold text-zinc-50 mb-4">Módulos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visibleModules.map(mod => (
                  <button
                    key={mod.to}
                    onClick={() => navigate(mod.to)}
                    className="flex flex-col items-start gap-3 p-4 rounded-xl border border-zinc-800 hover:border-emerald-700 hover:bg-emerald-900/20/50 transition-all duration-150 text-left group"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${mod.color}`}>
                      {mod.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-400">{mod.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-tight">{mod.desc}</p>
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

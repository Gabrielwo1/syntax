import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  DollarSign,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Trophy,
  Loader2,
  Palette,
  CalendarDays,
  Clock,
  AlertCircle,
  Users2,
  CircleDot,
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
import { format, parseISO, isToday, startOfWeek, startOfMonth, isAfter, isFuture, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { crmApi, financeiroApi, tasksApi, socialApi, meetingsApi } from '../lib/api'
import type { Lead, FinancialEntry, Task, ArtRequest, Meeting } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

type LeaderboardPeriod = 'hoje' | 'semana' | 'mes' | 'total'

interface RankEntry { name: string; count: number }

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-[11px] text-zinc-500 leading-tight">{label}</span>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  to,
  label = 'Ver todos',
}: {
  icon: React.ReactNode
  title: string
  to?: string
  label?: string
}) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-zinc-50 text-sm">{title}</h3>
      </div>
      {to && (
        <button
          onClick={() => navigate(to)}
          className="text-emerald-500 text-xs font-medium flex items-center gap-1 hover:text-emerald-400 transition-colors"
        >
          {label} <ArrowRight size={11} />
        </button>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user, isAdmin, permissions } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [requests, setRequests] = useState<ArtRequest[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [lbPeriod, setLbPeriod] = useState<LeaderboardPeriod>('hoje')

  const canAccess = (perm: string) => isAdmin || permissions.includes(perm)

  useEffect(() => {
    const fetches: Promise<void>[] = []
    if (canAccess('crm'))        fetches.push(crmApi.getLeads().then(r => setLeads(r.leads)).catch(() => {}))
    if (canAccess('financeiro')) fetches.push(financeiroApi.getEntries().then(r => setEntries(r.entries)).catch(() => {}))
    if (canAccess('tarefas'))    fetches.push(tasksApi.getTasks().then(r => setTasks(r.tasks)).catch(() => {}))
    if (canAccess('social'))     fetches.push(socialApi.listRequests().then(r => setRequests(r.requests)).catch(() => {}))
    fetches.push(meetingsApi.list().then(r => setMeetings(r.meetings)).catch(() => {}))
    Promise.all(fetches).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Financeiro ────────────────────────────────────────────────────────────
  const receivablePending = entries.filter(e => e.type === 'receivable' && e.status === 'pending')
  const payablePending    = entries.filter(e => e.type === 'payable'    && e.status === 'pending')
  const overdue           = entries.filter(e => e.status === 'overdue')
  const totalReceivable   = receivablePending.reduce((s, e) => s + e.amount, 0)
  const totalPayable      = payablePending.reduce((s, e) => s + e.amount, 0)

  const revenueByMonth: Record<string, number> = {}
  entries.filter(e => e.type === 'receivable' && e.status === 'paid').forEach(e => {
    try {
      const m = format(parseISO(e.dueDate), 'MMM', { locale: ptBR })
      revenueByMonth[m] = (revenueByMonth[m] || 0) + e.amount
    } catch { /* skip */ }
  })
  const chartData = Object.entries(revenueByMonth).map(([month, amount]) => ({ month, amount }))
  const recentEntries = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4)

  // ── Tarefas ───────────────────────────────────────────────────────────────
  const notStarted  = tasks.filter(t => t.status === 'not_started').length
  const inProgress  = tasks.filter(t => t.status === 'in_progress').length
  const completed   = tasks.filter(t => t.status === 'completed').length
  const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  // ── Social Media ──────────────────────────────────────────────────────────
  const reqPendente    = requests.filter(r => r.status === 'pendente').length
  const reqAndamento   = requests.filter(r => r.status === 'em_andamento').length
  const reqEntregue    = requests.filter(r => r.status === 'entregue').length
  const recentRequests = [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4)

  // ── Reuniões ──────────────────────────────────────────────────────────────
  const upcomingMeetings = meetings
    .filter(m => { try { return isFuture(parseISO(`${m.date}T${m.time}`)) } catch { return false } })
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 4)
  const todayMeetings = meetings.filter(m => { try { return isToday(parseISO(m.date)) } catch { return false } })

  // ── CRM Leaderboard ───────────────────────────────────────────────────────
  const weekStart  = startOfWeek(new Date(), { locale: ptBR })
  const monthStart = startOfMonth(new Date())
  const moveCount: Record<string, number> = {}
  leads.forEach(lead => {
    if (!lead.movedBy) return
    const ts = lead.updatedAt || lead.createdAt
    let include = lbPeriod === 'total'
    if (!include && ts) {
      try {
        const d = parseISO(ts)
        if      (lbPeriod === 'hoje')  include = isToday(d)
        else if (lbPeriod === 'semana') include = isAfter(d, weekStart)
        else if (lbPeriod === 'mes')   include = isAfter(d, monthStart)
      } catch { /* skip */ }
    }
    if (include) moveCount[lead.movedBy] = (moveCount[lead.movedBy] || 0) + 1
  })
  const leaderboard: RankEntry[] = Object.entries(moveCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'

  const STAGE_LABEL: Record<string, string> = {
    novo: 'Novo', contato: 'Contato', proposta: 'Proposta',
    negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-zinc-50">Olá, {userName.split(' ')[0]} 👋</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Ranking CRM ─────────────────────────────────────────────────── */}
          {canAccess('crm') && (
            <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-400" />
                  <h3 className="font-semibold text-zinc-50 text-sm">Ranking CRM</h3>
                  <span className="text-zinc-500 text-xs">— leads movimentados</span>
                </div>
                <div className="flex rounded-lg border border-zinc-700 overflow-hidden text-xs font-medium">
                  {(['hoje', 'semana', 'mes', 'total'] as LeaderboardPeriod[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setLbPeriod(p)}
                      className={`px-3 py-1.5 transition-colors ${lbPeriod === p ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Total'}
                    </button>
                  ))}
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">
                  Nenhuma movimentação {lbPeriod === 'hoje' ? 'hoje' : lbPeriod === 'semana' ? 'esta semana' : lbPeriod === 'mes' ? 'este mês' : 'registrada'}.
                </p>
              ) : (
                <div className="flex flex-wrap gap-5">
                  {leaderboard.map((entry, i) => {
                    const podium = ['🥇', '🥈', '🥉']
                    const isTop3 = i < 3
                    return (
                      <div
                        key={entry.name}
                        title={`${entry.name} — ${entry.count} ${entry.count === 1 ? 'movimentação' : 'movimentações'}`}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-sm font-bold text-indigo-400 select-none">
                            {getInitials(entry.name)}
                          </div>
                          <span className={`absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold leading-none ${isTop3 ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-700 text-zinc-200'}`}>
                            {entry.count}
                          </span>
                        </div>
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

          {/* ── Financeiro + Tarefas ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Financeiro */}
            {canAccess('financeiro') && (
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
                <SectionHeader
                  icon={<DollarSign size={15} className="text-emerald-500" />}
                  title="Financeiro"
                  to="/financeiro"
                />

                {/* Mini stats */}
                <div className="flex gap-6 mb-5 pb-4 border-b border-zinc-800">
                  <MiniStat label="A receber" value={formatCurrency(totalReceivable)} color="text-emerald-400" />
                  <MiniStat label="A pagar"   value={formatCurrency(totalPayable)}    color="text-rose-400" />
                  <MiniStat label="Vencidos"  value={overdue.length}                  color={overdue.length > 0 ? 'text-amber-400' : 'text-zinc-400'} />
                </div>

                {/* Chart */}
                {chartData.length > 0 ? (
                  <div>
                    <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider">Receita recebida por mês</p>
                    <ResponsiveContainer width="100%" height={130}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v: number) => [formatCurrency(v), 'Receita']}
                          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: '#a1a1aa' }}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#gRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  /* Recent entries fallback */
                  <div className="space-y-2">
                    {recentEntries.map(e => (
                      <div key={e.id} className="flex items-center gap-3 py-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${e.type === 'receivable' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <p className="text-sm text-zinc-200 truncate flex-1">{e.description}</p>
                        <span className={`text-xs font-medium flex-shrink-0 ${e.type === 'receivable' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tarefas */}
            {canAccess('tarefas') && (
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
                <SectionHeader
                  icon={<CheckSquare size={15} className="text-amber-400" />}
                  title="Tarefas"
                  to="/tarefas"
                />

                {/* Mini stats */}
                <div className="flex gap-6 mb-5 pb-4 border-b border-zinc-800">
                  <MiniStat label="Não iniciadas" value={notStarted}  color="text-zinc-300" />
                  <MiniStat label="Em progresso"  value={inProgress}  color="text-amber-400" />
                  <MiniStat label="Concluídas"    value={completed}   color="text-emerald-400" />
                </div>

                {/* Task list */}
                {recentTasks.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">Nenhuma tarefa.</p>
                ) : (
                  <div className="space-y-2">
                    {recentTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 py-1 px-2 rounded-lg hover:bg-zinc-950 transition-colors">
                        <CircleDot size={13} className={`flex-shrink-0 ${
                          task.status === 'completed'  ? 'text-emerald-500' :
                          task.status === 'in_progress' ? 'text-amber-400'   : 'text-zinc-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-100 truncate">{task.name}</p>
                          {task.project && <p className="text-[11px] text-zinc-500">{task.project}</p>}
                        </div>
                        {task.priority === 'urgent' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/20 text-rose-400 rounded font-medium flex-shrink-0">urgente</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Social Media + Reuniões ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Social Media */}
            {canAccess('social') && (
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
                <SectionHeader
                  icon={<Palette size={15} className="text-pink-400" />}
                  title="Social Media"
                  to="/social"
                />

                {/* Mini stats */}
                <div className="flex gap-6 mb-5 pb-4 border-b border-zinc-800">
                  <MiniStat label="Pendentes"   value={reqPendente}  color="text-amber-400" />
                  <MiniStat label="Em andamento" value={reqAndamento} color="text-blue-400" />
                  <MiniStat label="Entregues"   value={reqEntregue}  color="text-emerald-400" />
                </div>

                {/* Recent requests */}
                {recentRequests.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">Nenhuma solicitação.</p>
                ) : (
                  <div className="space-y-2">
                    {recentRequests.map(req => (
                      <div key={req.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-zinc-950 transition-colors">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          req.status === 'pendente'    ? 'bg-amber-400' :
                          req.status === 'em_andamento' ? 'bg-blue-400'  : 'bg-emerald-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-100 truncate">{req.client}</p>
                          <p className="text-[11px] text-zinc-500">{req.format}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                          req.status === 'pendente'     ? 'bg-amber-500/20 text-amber-400'   :
                          req.status === 'em_andamento' ? 'bg-blue-500/20 text-blue-400'     :
                                                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {req.status === 'pendente' ? 'pendente' : req.status === 'em_andamento' ? 'andamento' : 'entregue'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reuniões */}
            <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
              <SectionHeader
                icon={<CalendarDays size={15} className="text-violet-400" />}
                title="Reuniões"
                to="/reunioes"
              />

              {/* Mini stats */}
              <div className="flex gap-6 mb-5 pb-4 border-b border-zinc-800">
                <MiniStat label="Total"        value={meetings.length}         color="text-zinc-300" />
                <MiniStat label="Hoje"         value={todayMeetings.length}    color={todayMeetings.length > 0 ? 'text-violet-400' : 'text-zinc-400'} />
                <MiniStat label="Próximas"     value={upcomingMeetings.length} color="text-emerald-400" />
              </div>

              {/* Upcoming list */}
              {upcomingMeetings.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">Nenhuma reunião próxima.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingMeetings.map(m => (
                    <div key={m.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-zinc-950 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[9px] text-violet-400 font-semibold leading-none uppercase">
                          {format(parseISO(m.date), 'MMM', { locale: ptBR })}
                        </span>
                        <span className="text-sm text-violet-300 font-bold leading-none">
                          {format(parseISO(m.date), 'd')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-100 truncate">{m.title}</p>
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Clock size={9} /> {m.time}
                        </p>
                      </div>
                      {isToday(parseISO(m.date)) && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded font-medium flex-shrink-0">hoje</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

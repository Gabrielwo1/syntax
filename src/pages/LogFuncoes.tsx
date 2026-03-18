import React, { useEffect, useState, useMemo } from 'react'
import {
  Activity,
  Trash2,
  Download,
  Search,
  Filter,
  Loader2,
  X,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Upload,
  Cpu,
  FolderOpen,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logsApi } from '../lib/api'
import type { ActivityLog } from '../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(d?: string) {
  if (!d) return '—'
  try { return format(parseISO(d), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }) }
  catch { return d }
}

const ACTION_COLORS: Record<string, string> = {
  'Login':       'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Logout':      'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  'Criação':     'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Atualização': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Exclusão':    'bg-rose-500/15 text-rose-400 border-rose-500/25',
  'Upload':      'bg-violet-500/15 text-violet-400 border-violet-500/25',
  'Entrega':     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Importação':  'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  'IA':          'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25',
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'Login':       <LogIn size={12} />,
  'Logout':      <LogOut size={12} />,
  'Criação':     <Plus size={12} />,
  'Atualização': <Pencil size={12} />,
  'Exclusão':    <Trash2 size={12} />,
  'Upload':      <Upload size={12} />,
  'Entrega':     <Upload size={12} />,
  'Importação':  <FolderOpen size={12} />,
  'IA':          <Cpu size={12} />,
}

const ALL_MODULES = [
  'Sistema', 'CRM', 'Financeiro', 'Tarefas', 'PDFs',
  'Repositório', 'Social Media', 'Orçamentos', 'Usuários', 'Analytics',
]

const ALL_ACTIONS = ['Login', 'Logout', 'Criação', 'Atualização', 'Exclusão', 'Upload', 'Entrega', 'Importação', 'IA']

const thCls = "text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap"
const tdCls = "px-4 py-3.5 align-middle"

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCsv(logs: ActivityLog[]) {
  const header = ['Data/Hora', 'Usuário', 'Email', 'Módulo', 'Ação', 'Descrição']
  const rows = logs.map(l => [
    formatDateTime(l.createdAt),
    l.userName,
    l.userEmail,
    l.module,
    l.action,
    l.description,
  ])
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `log-funcoes-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogFuncoes() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)

  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { logs: data } = await logsApi.getLogs()
      setLogs(data)
    } catch {
      toast.error('Erro ao carregar logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>()
    logs.forEach(l => { if (l.userId) map.set(l.userId, l.userName || l.userEmail) })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [logs])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (moduleFilter && l.module !== moduleFilter) return false
      if (actionFilter && l.action !== actionFilter) return false
      if (userFilter && l.userId !== userFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !l.description.toLowerCase().includes(q) &&
          !l.userName.toLowerCase().includes(q) &&
          !l.userEmail.toLowerCase().includes(q) &&
          !l.module.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [logs, moduleFilter, actionFilter, userFilter, search])

  const handleClear = async () => {
    if (!confirm('Limpar todos os registros de log? Esta ação não pode ser desfeita.')) return
    setClearing(true)
    try {
      await logsApi.clearLogs()
      setLogs([])
      toast.success('Logs limpos com sucesso')
    } catch {
      toast.error('Erro ao limpar logs')
    } finally {
      setClearing(false)
    }
  }

  const hasFilters = !!(moduleFilter || actionFilter || userFilter || search)
  const clearFilters = () => { setModuleFilter(''); setActionFilter(''); setUserFilter(''); setSearch('') }

  const pageBg = { backgroundColor: '#0f0f0f' }
  const tableBg = { backgroundColor: '#1a1a1a' }
  const inputStyle = { backgroundColor: '#1f1f1f' }

  const selectCls = "px-3 py-2 rounded-xl text-sm text-zinc-300 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500"
  const inputCls = "px-3 py-2 rounded-xl text-sm text-zinc-300 placeholder-zinc-600 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500"

  return (
    <div className="min-h-full text-white" style={pageBg}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity size={22} className="text-emerald-500" />
              Log de Funções
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5">Registro de todas as ações realizadas por usuário</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-zinc-400 border border-white/10 hover:bg-white/5 transition"
              style={inputStyle}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <button
              onClick={() => exportCsv(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-zinc-300 border border-white/10 hover:bg-white/5 transition disabled:opacity-50"
              style={inputStyle}
            >
              <Download size={14} />
              Exportar CSV
            </button>
            <button
              onClick={handleClear}
              disabled={clearing || logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-rose-400 border border-rose-500/25 hover:bg-rose-500/10 transition disabled:opacity-50"
              style={{ backgroundColor: 'rgba(244,63,94,0.07)' }}
            >
              {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Limpar Logs
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && logs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total de registros', value: logs.length, color: 'text-white' },
              { label: 'Filtrados', value: filtered.length, color: 'text-emerald-400' },
              { label: 'Usuários ativos', value: uniqueUsers.length, color: 'text-blue-400' },
              { label: 'Módulos',value: new Set(logs.map(l => l.module)).size, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-white/[0.07] px-4 py-3" style={tableBg}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className={`${inputCls} pl-8 w-48`}
              style={inputStyle}
            />
          </div>
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className={selectCls} style={inputStyle}>
            <option value="">Todos os módulos</option>
            {ALL_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className={selectCls} style={inputStyle}>
            <option value="">Todas as ações</option>
            {ALL_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className={selectCls} style={inputStyle}>
            <option value="">Todos os usuários</option>
            {uniqueUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition px-2 py-2 rounded-lg hover:bg-white/5">
              <X size={12} /> Limpar filtros
            </button>
          )}
          {hasFilters && (
            <span className="text-xs text-zinc-600 ml-1 flex items-center gap-1">
              <Filter size={11} /> {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={tableBg}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-zinc-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Activity size={32} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-zinc-600 text-sm">
                {logs.length === 0 ? 'Nenhum registro ainda' : 'Nenhum registro para os filtros selecionados'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className={thCls}>Data / Hora</th>
                    <th className={thCls}>Usuário</th>
                    <th className={thCls}>Módulo</th>
                    <th className={thCls}>Ação</th>
                    <th className={thCls}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => (
                    <tr
                      key={log.id}
                      className={`hover:bg-white/[0.02] transition ${i < filtered.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                    >
                      <td className={tdCls}>
                        <span className="text-zinc-500 text-xs font-mono whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                      </td>
                      <td className={tdCls}>
                        <div>
                          <p className="text-zinc-200 font-medium text-sm">{log.userName}</p>
                          <p className="text-zinc-600 text-xs">{log.userEmail}</p>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <span className="text-xs font-medium text-zinc-300 px-2.5 py-1 rounded border border-white/10"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          {log.module}
                        </span>
                      </td>
                      <td className={tdCls}>
                        {(() => {
                          const cls = ACTION_COLORS[log.action] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25'
                          const icon = ACTION_ICONS[log.action] ?? <Activity size={12} />
                          return (
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cls}`}>
                              {icon}
                              {log.action}
                            </span>
                          )
                        })()}
                      </td>
                      <td className={tdCls}>
                        <span className="text-zinc-400 text-sm">{log.description}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-zinc-700 text-right">
            Exibindo {filtered.length} de {logs.length} registros
          </p>
        )}

      </div>
    </div>
  )
}

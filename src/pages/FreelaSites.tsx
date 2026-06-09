import React, { useEffect, useState } from 'react'
import { format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Loader2,
  Save,
  TrendingUp,
  MessageSquare,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Pencil,
} from 'lucide-react'
import { freelaApi } from '../lib/api'
import type { FreelaDailyLog } from '../lib/api'

const PLATFORMS = [
  { id: 'Workana',    label: 'Workana',    color: 'emerald' },
  { id: '99Freelas',  label: '99Freelas',  color: 'blue' },
] as const

type PlatformId = typeof PLATFORMS[number]['id']
type ColorKey   = typeof PLATFORMS[number]['color']

const colorMap: Record<ColorKey, { card: string; badge: string; btn: string; text: string; light: string }> = {
  emerald: {
    card:  'border-emerald-500/30 bg-emerald-500/5',
    badge: 'bg-emerald-500/20 text-emerald-400',
    btn:   'bg-emerald-600 hover:bg-emerald-500',
    text:  'text-emerald-400',
    light: 'bg-emerald-500/10',
  },
  blue: {
    card:  'border-blue-500/30 bg-blue-500/5',
    badge: 'bg-blue-500/20 text-blue-400',
    btn:   'bg-blue-600 hover:bg-blue-500',
    text:  'text-blue-400',
    light: 'bg-blue-500/10',
  },
}

function todayStr() { return format(new Date(), 'yyyy-MM-dd') }

function formatMonthLabel(ym: string) {
  try {
    const l = format(parseISO(ym + '-01'), 'MMMM yyyy', { locale: ptBR })
    return l.charAt(0).toUpperCase() + l.slice(1)
  } catch { return ym }
}

function pct(n: number, d: number) {
  if (!d) return '—'
  return `${Math.round((n / d) * 100)}%`
}

// ── Platform Card ─────────────────────────────────────────────────────────────

function PlatformCard({
  platform,
  color,
  label,
  existing,
  onSaved,
}: {
  platform: PlatformId
  color: ColorKey
  label: string
  existing?: FreelaDailyLog
  onSaved: (log: FreelaDailyLog) => void
}) {
  const c = colorMap[color]
  const [editing, setEditing] = useState(!existing)
  const [proposals,    setProposals]    = useState(String(existing?.proposals    ?? ''))
  const [responses,    setResponses]    = useState(String(existing?.responses    ?? ''))
  const [appointments, setAppointments] = useState(String(existing?.appointments ?? ''))
  const [notes,        setNotes]        = useState(existing?.notes ?? '')
  const [saving,       setSaving]       = useState(false)

  // sync when external data arrives
  useEffect(() => {
    if (existing) {
      setProposals(String(existing.proposals))
      setResponses(String(existing.responses))
      setAppointments(String(existing.appointments))
      setNotes(existing.notes ?? '')
      setEditing(false)
    } else {
      setProposals('')
      setResponses('')
      setAppointments('')
      setNotes('')
      setEditing(true)
    }
  }, [existing?.id])

  const handleSave = async () => {
    if (saving) return
    const p = parseInt(proposals) || 0
    const r = parseInt(responses) || 0
    const a = parseInt(appointments) || 0
    setSaving(true)
    try {
      const res = await freelaApi.upsertLog({
        id: existing?.id,
        platform,
        date: existing?.date ?? todayStr(),
        proposals: p, responses: r, appointments: a,
        notes: notes.trim() || undefined,
      })
      onSaved(res.log)
      setEditing(false)
      toast.success(`${label} salvo!`)
    } catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  const numCls = 'w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center'

  return (
    <div className={`border rounded-2xl p-6 ${c.card}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${c.light} rounded-xl flex items-center justify-center`}>
            <BarChart2 size={16} className={c.text} />
          </div>
          <div>
            <h3 className="font-bold text-zinc-50">{label}</h3>
            {existing && !editing && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${c.badge}`}>Registrado</span>
            )}
          </div>
        </div>
        {existing && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {editing ? (
        /* Form */
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5 text-center">Propostas</label>
              <input type="number" min="0" value={proposals}
                onChange={e => setProposals(e.target.value)}
                placeholder="0" className={numCls} />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5 text-center">Respostas</label>
              <input type="number" min="0" value={responses}
                onChange={e => setResponses(e.target.value)}
                placeholder="0" className={numCls} />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5 text-center">Agendamentos</label>
              <input type="number" min="0" value={appointments}
                onChange={e => setAppointments(e.target.value)}
                placeholder="0" className={numCls} />
            </div>
          </div>
          <input
            type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Observações (opcional)"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2">
            {existing && (
              <button onClick={() => setEditing(false)}
                className="px-4 py-2 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:bg-zinc-800 transition">
                Cancelar
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
              className={`flex-1 py-2.5 ${c.btn} text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2`}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar
            </button>
          </div>
        </div>
      ) : existing ? (
        /* Display */
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <TrendingUp size={16} className={`${c.text} mx-auto mb-1`} />
            <p className="text-2xl font-black text-zinc-50">{existing.proposals}</p>
            <p className="text-[11px] text-zinc-500">Propostas</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <MessageSquare size={16} className={`${c.text} mx-auto mb-1`} />
            <p className="text-2xl font-black text-zinc-50">{existing.responses}</p>
            <p className="text-[11px] text-zinc-500">Respostas</p>
            <p className="text-[10px] text-zinc-600">{pct(existing.responses, existing.proposals)}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <CalendarCheck size={16} className={`${c.text} mx-auto mb-1`} />
            <p className="text-2xl font-black text-zinc-50">{existing.appointments}</p>
            <p className="text-[11px] text-zinc-500">Agendamentos</p>
            <p className="text-[10px] text-zinc-600">{pct(existing.appointments, existing.responses)}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-600 text-center py-4">Nenhum registro para este dia.</p>
      )}

      {existing?.notes && !editing && (
        <p className="mt-3 text-xs text-zinc-500 bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800">
          {existing.notes}
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FreelaSites() {
  const [logs,    setLogs]    = useState<FreelaDailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [date,    setDate]    = useState(todayStr())
  const [viewMonth, setViewMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    freelaApi.getLogs()
      .then(r => setLogs(r.logs))
      .catch(() => toast.error('Erro ao carregar registros'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (log: FreelaDailyLog) => {
    setLogs(prev => {
      const idx = prev.findIndex(l => l.id === log.id)
      if (idx >= 0) { const c = [...prev]; c[idx] = log; return c }
      return [log, ...prev]
    })
  }

  const getLog = (platform: PlatformId, d: string) =>
    logs.find(l => l.platform === platform && l.date === d)

  // Month navigation
  const prevMonth = () => setViewMonth(format(subMonths(parseISO(viewMonth + '-01'), 1), 'yyyy-MM'))
  const nextMonth = () => {
    const next = format(new Date(parseISO(viewMonth + '-01').setMonth(parseISO(viewMonth + '-01').getMonth() + 1)), 'yyyy-MM')
    if (next <= format(new Date(), 'yyyy-MM')) setViewMonth(next)
  }
  const isCurrentMonth = viewMonth === format(new Date(), 'yyyy-MM')

  // Month stats per platform
  const monthLogs = logs.filter(l => l.date.slice(0, 7) === viewMonth)
  const monthStats = PLATFORMS.map(p => {
    const pl = monthLogs.filter(l => l.platform === p.id)
    const totalP = pl.reduce((s, l) => s + l.proposals, 0)
    const totalR = pl.reduce((s, l) => s + l.responses, 0)
    const totalA = pl.reduce((s, l) => s + l.appointments, 0)
    const days   = pl.length
    return { ...p, totalP, totalR, totalA, days }
  })

  const grandP = monthStats.reduce((s, m) => s + m.totalP, 0)
  const grandR = monthStats.reduce((s, m) => s + m.totalR, 0)
  const grandA = monthStats.reduce((s, m) => s + m.totalA, 0)

  // History: distinct dates that have at least one log
  const histDates = Array.from(new Set(monthLogs.map(l => l.date))).sort((a, b) => b.localeCompare(a))

  const isToday = date === todayStr()

  const navigateDate = (dir: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + dir)
    const s = format(d, 'yyyy-MM-dd')
    if (s <= todayStr()) setDate(s)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-emerald-500" />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Freela Sites</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Controle diário de propostas por plataforma</p>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-zinc-50">
            {isToday ? 'Hoje' : format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
          </p>
          <p className="text-xs text-zinc-500">{format(parseISO(date), 'dd/MM/yyyy')}</p>
        </div>
        <button
          onClick={() => navigateDate(1)}
          disabled={isToday}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
        {!isToday && (
          <button onClick={() => setDate(todayStr())}
            className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition">
            Hoje
          </button>
        )}
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {PLATFORMS.map(p => (
          <PlatformCard
            key={p.id}
            platform={p.id}
            color={p.color}
            label={p.label}
            existing={getLog(p.id, date)}
            onSaved={handleSaved}
          />
        ))}
      </div>

      {/* Monthly stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-50 text-sm flex items-center gap-2">
            <BarChart2 size={15} className="text-emerald-500" />
            Resumo — {formatMonthLabel(viewMonth)}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition">
              <ChevronLeft size={14} />
            </button>
            <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400">Plataforma</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-400">Dias</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-400">Propostas</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-400">Respostas</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-400">Taxa resp.</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-400">Agendamentos</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-400">Conv. agend.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {monthStats.map(m => (
                <tr key={m.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-5 py-3 font-medium text-zinc-200">{m.label}</td>
                  <td className="px-4 py-3 text-center text-zinc-400">{m.days}</td>
                  <td className="px-4 py-3 text-center font-bold text-zinc-50">{m.totalP}</td>
                  <td className="px-4 py-3 text-center text-zinc-200">{m.totalR}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.totalP > 0
                        ? Math.round((m.totalR / m.totalP) * 100) >= 20
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {pct(m.totalR, m.totalP)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-200">{m.totalA}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.totalR > 0
                        ? Math.round((m.totalA / m.totalR) * 100) >= 30
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {pct(m.totalA, m.totalR)}
                    </span>
                  </td>
                </tr>
              ))}
              {/* Total row */}
              {grandP > 0 && (
                <tr className="bg-zinc-950 border-t border-zinc-700">
                  <td className="px-5 py-3 font-bold text-zinc-300">Total</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-center font-black text-zinc-50">{grandP}</td>
                  <td className="px-4 py-3 text-center font-semibold text-zinc-200">{grandR}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold text-zinc-300">{pct(grandR, grandP)}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-zinc-200">{grandA}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold text-zinc-300">{pct(grandA, grandR)}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {grandP === 0 && (
            <p className="text-center py-8 text-zinc-600 text-sm">Nenhum registro em {formatMonthLabel(viewMonth)}.</p>
          )}
        </div>
      </div>

      {/* Daily history in month */}
      {histDates.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="font-semibold text-zinc-50 text-sm">Histórico diário — {formatMonthLabel(viewMonth)}</h2>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {histDates.map(d => {
              const dayLogs = monthLogs.filter(l => l.date === d)
              const isT = d === todayStr()
              let label: string
              try {
                label = format(parseISO(d), "EEE, dd/MM", { locale: ptBR })
                label = label.charAt(0).toUpperCase() + label.slice(1)
              } catch { label = d }

              return (
                <div key={d} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/30 transition cursor-pointer" onClick={() => setDate(d)}>
                  <div className="w-24 flex-shrink-0">
                    <p className="text-xs font-medium text-zinc-400">{isT ? 'Hoje' : label}</p>
                  </div>
                  <div className="flex gap-3 flex-1">
                    {PLATFORMS.map(p => {
                      const l = dayLogs.find(dl => dl.platform === p.id)
                      const c = colorMap[p.color]
                      return (
                        <div key={p.id} className="flex items-center gap-2 text-xs">
                          <span className={`font-medium ${c.text}`}>{p.label}</span>
                          {l ? (
                            <span className="text-zinc-400">
                              <span className="text-zinc-200 font-semibold">{l.proposals}</span>p ·{' '}
                              <span className="text-zinc-300">{l.responses}</span>r ·{' '}
                              <span className="text-zinc-300">{l.appointments}</span>ag
                            </span>
                          ) : (
                            <span className="text-zinc-700">—</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

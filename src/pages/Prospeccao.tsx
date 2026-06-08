import React, { useEffect, useState, useRef } from 'react'
import { format, parseISO, startOfWeek, startOfMonth, isToday, isThisWeek, isThisMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Target,
  TrendingUp,
  Zap,
  Loader2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { prospeccaoApi } from '../lib/api'
import type { ProspectionLog } from '../lib/api'

const PLATFORMS = ['Workana', 'LinkedIn', 'Instagram', 'WhatsApp', 'Outro']

function groupByDate(logs: ProspectionLog[]) {
  const map: Record<string, ProspectionLog[]> = {}
  for (const log of logs) {
    if (!map[log.date]) map[log.date] = []
    map[log.date].push(log)
  }
  return map
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

function weekRange() {
  const start = startOfWeek(new Date(), { locale: ptBR })
  return { start: format(start, 'yyyy-MM-dd') }
}

function monthRange() {
  const start = startOfMonth(new Date())
  return { start: format(start, 'yyyy-MM-dd') }
}

export default function Prospeccao() {
  const [logs, setLogs] = useState<ProspectionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [platform, setPlatform] = useState('Workana')
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [goal, setGoal] = useState(5)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('5')
  const [showHistory, setShowHistory] = useState(false)
  const [bump, setBump] = useState(false)
  const goalRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      prospeccaoApi.getLogs(),
      prospeccaoApi.getGoal(),
    ]).then(([logsRes, goalRes]) => {
      setLogs(logsRes.logs)
      setGoal(goalRes.goal)
      setGoalInput(String(goalRes.goal))
    }).catch(() => toast.error('Erro ao carregar prospecções'))
      .finally(() => setLoading(false))
  }, [])

  const today = todayStr()
  const { start: weekStart } = weekRange()
  const { start: monthStart } = monthRange()

  const todayLogs   = logs.filter(l => l.date === today)
  const weekLogs    = logs.filter(l => l.date >= weekStart)
  const monthLogs   = logs.filter(l => l.date >= monthStart)
  const todayCount  = todayLogs.length
  const weekCount   = weekLogs.length
  const monthCount  = monthLogs.length
  const pct         = Math.min(100, Math.round((todayCount / goal) * 100))
  const goalReached = todayCount >= goal

  const handleAdd = async () => {
    if (adding) return
    setAdding(true)
    try {
      const res = await prospeccaoApi.addLog({ platform, notes: notes.trim() || undefined })
      setLogs(prev => [res.log, ...prev])
      setNotes('')
      setBump(true)
      setTimeout(() => setBump(false), 400)
      if (todayCount + 1 >= goal) toast.success(`🎯 Meta atingida! ${goal} propostas hoje!`)
      else toast.success('Proposta registrada!')
    } catch { toast.error('Erro ao registrar') }
    finally { setAdding(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await prospeccaoApi.deleteLog(id)
      setLogs(prev => prev.filter(l => l.id !== id))
      toast('Removido.')
    } catch { toast.error('Erro ao remover') }
  }

  const handleSaveGoal = async () => {
    const n = parseInt(goalInput) || 1
    try {
      await prospeccaoApi.setGoal(n)
      setGoal(n)
      setEditingGoal(false)
      toast.success('Meta atualizada!')
    } catch { toast.error('Erro ao salvar meta') }
  }

  const byDate = groupByDate(logs)
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-emerald-500" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Prospecção</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Workana · {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>
        {/* Meta diária */}
        <div className="flex items-center gap-2">
          {editingGoal ? (
            <div className="flex items-center gap-1">
              <input
                ref={goalRef}
                type="number" min="1" max="99"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveGoal(); if (e.key === 'Escape') setEditingGoal(false) }}
                className="w-14 px-2 py-1 text-sm bg-zinc-950 border border-zinc-600 rounded-lg text-zinc-50 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button onClick={handleSaveGoal} className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"><Check size={13} /></button>
              <button onClick={() => setEditingGoal(false)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition"><X size={13} /></button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingGoal(true); setTimeout(() => goalRef.current?.select(), 50) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition"
            >
              <Target size={13} className="text-emerald-500" />
              Meta: <span className="font-bold text-zinc-200">{goal}</span>/dia
              <Pencil size={11} className="text-zinc-600" />
            </button>
          )}
        </div>
      </div>

      {/* Platform selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {PLATFORMS.map(p => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              platform === p
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Big counter card */}
      <div className={`relative bg-zinc-900 border rounded-2xl p-8 mb-5 text-center overflow-hidden transition-all ${
        goalReached ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-zinc-800'
      }`}>
        {goalReached && (
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
        )}

        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Hoje</p>
        <div className={`text-8xl font-black mb-1 transition-transform duration-200 ${bump ? 'scale-110' : 'scale-100'} ${
          goalReached ? 'text-emerald-400' : 'text-zinc-50'
        }`}>
          {todayCount}
        </div>
        <p className="text-sm text-zinc-500 mb-6">
          {goalReached
            ? `✓ Meta de ${goal} atingida!`
            : `${goal - todayCount} para atingir a meta de ${goal}`}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-zinc-800 rounded-full h-2 mb-6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${goalReached ? 'bg-emerald-500' : 'bg-emerald-600'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Add button */}
        <button
          onClick={handleAdd}
          disabled={adding}
          className={`relative w-full py-4 rounded-xl text-base font-bold transition-all active:scale-95 flex items-center justify-center gap-3 ${
            goalReached
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {adding
            ? <Loader2 size={20} className="animate-spin" />
            : <Plus size={20} />}
          Registrar proposta {platform !== 'Workana' ? `— ${platform}` : ''}
        </button>

        {/* Optional notes toggle */}
        <button
          onClick={() => setShowNotes(v => !v)}
          className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition flex items-center gap-1 mx-auto"
        >
          {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showNotes ? 'Ocultar observação' : 'Adicionar observação (opcional)'}
        </button>

        {showNotes && (
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Ex: João, React, R$800..."
            className="mt-3 w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Esta semana</p>
          <p className="text-2xl font-bold text-zinc-50">{weekCount}</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">propostas</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Este mês</p>
          <p className="text-2xl font-bold text-zinc-50">{monthCount}</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">propostas</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Total geral</p>
          <p className="text-2xl font-bold text-zinc-50">{logs.length}</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">registradas</p>
        </div>
      </div>

      {/* History */}
      {logs.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800/50 transition"
          >
            <span className="flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-500" />
              Histórico
            </span>
            {showHistory ? <ChevronUp size={15} className="text-zinc-500" /> : <ChevronDown size={15} className="text-zinc-500" />}
          </button>

          {showHistory && (
            <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
              {sortedDates.map(date => {
                const dayLogs = byDate[date]
                const isT = date === today
                let label: string
                try {
                  label = format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })
                  label = label.charAt(0).toUpperCase() + label.slice(1)
                } catch { label = date }

                return (
                  <div key={date}>
                    <div className="flex items-center justify-between px-5 py-2.5 bg-zinc-950/50">
                      <span className="text-xs font-medium text-zinc-400">
                        {isT ? 'Hoje' : label}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        dayLogs.length >= goal
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {dayLogs.length} proposta{dayLogs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {dayLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between px-5 py-2.5 group hover:bg-zinc-800/30 transition">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-sm text-zinc-300">
                            {log.platform}
                            {log.notes && <span className="text-zinc-500 ml-2">· {log.notes}</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-600">
                            {format(parseISO(log.createdAt), 'HH:mm')}
                          </span>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-rose-400 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

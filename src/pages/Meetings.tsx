import React, { useEffect, useState, useRef } from 'react'
import {
  Plus, X, Loader2, Calendar, Clock, Edit2, Trash2, ChevronLeft, ChevronRight, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, isToday, parse,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { meetingsApi } from '../lib/api'
import type { Meeting } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

// ─── Date Picker ──────────────────────────────────────────────────────────────

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function DatePicker({
  value,
  onChange,
}: {
  value: string   // 'yyyy-MM-dd' or ''
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => value ? parse(value, 'yyyy-MM-dd', new Date()) : new Date())
  const ref = useRef<HTMLDivElement>(null)

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = monthStart.getDay()

  const displayValue = value
    ? format(parse(value, 'yyyy-MM-dd', new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : ''

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-zinc-600 transition"
      >
        <Calendar size={14} className="text-zinc-500 flex-shrink-0" />
        <span className={value ? 'text-zinc-50' : 'text-zinc-600'}>
          {displayValue || 'Selecionar data'}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3 w-64">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50">
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-semibold text-zinc-50 capitalize">
              {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50">
              <ChevronRight size={15} />
            </button>
          </div>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-zinc-600">{d}</div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const isSelected = value === dateStr
              const today = isToday(day)
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => { onChange(dateStr); setOpen(false) }}
                  className={`h-7 w-full rounded-lg text-xs font-medium transition
                    ${isSelected ? 'bg-emerald-600 text-white' : today ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800'}
                  `}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Time Picker ──────────────────────────────────────────────────────────────

function TimePicker({
  value,
  onChange,
}: {
  value: string   // 'HH:mm' or ''
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [hh, mm] = value ? value.split(':') : ['', '']
  const [hour, setHour] = useState(hh || '')
  const [minute, setMinute] = useState(mm || '')

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const commit = (h: string, m: string) => {
    if (h && m) onChange(`${h}:${m}`)
  }

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = ['00', '15', '30', '45']

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-zinc-600 transition"
      >
        <Clock size={14} className="text-zinc-500 flex-shrink-0" />
        <span className={value ? 'text-zinc-50' : 'text-zinc-600'}>
          {value || 'Selecionar horário'}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3 w-48">
          <p className="text-[10px] font-medium text-zinc-500 mb-2">HORÁRIO</p>
          <div className="flex gap-2">
            {/* Hours */}
            <div className="flex-1">
              <p className="text-[10px] text-zinc-600 mb-1 text-center">Hora</p>
              <div className="overflow-y-auto max-h-40 space-y-0.5 pr-1 scrollbar-thin">
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => { setHour(h); commit(h, minute) }}
                    className={`w-full text-xs py-1 rounded-lg transition font-mono
                      ${hour === h ? 'bg-emerald-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}
                    `}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-px bg-zinc-800" />
            {/* Minutes */}
            <div className="flex-1">
              <p className="text-[10px] text-zinc-600 mb-1 text-center">Min</p>
              <div className="space-y-0.5">
                {minutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMinute(m); commit(hour, m); setOpen(false) }}
                    className={`w-full text-xs py-1 rounded-lg transition font-mono
                      ${minute === m ? 'bg-emerald-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}
                    `}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function MeetingModal({
  meeting,
  onClose,
  onSaved,
}: {
  meeting?: Meeting | null
  onClose: () => void
  onSaved: (m: Meeting) => void
}) {
  const { user } = useAuth()
  const [title, setTitle] = useState(meeting?.title || '')
  const [date, setDate] = useState(meeting?.date || '')
  const [time, setTime] = useState(meeting?.time || '')
  const [notes, setNotes] = useState(meeting?.notes || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Informe o título da reunião'); return }
    if (!date) { toast.error('Selecione uma data'); return }
    if (!time) { toast.error('Selecione um horário'); return }
    setLoading(true)
    try {
      const payload = {
        title: title.trim(),
        date,
        time,
        notes: notes.trim() || undefined,
        createdBy: user?.user_metadata?.name || user?.email || undefined,
      }
      let saved: Meeting
      if (meeting) {
        saved = (await meetingsApi.update(meeting.id, payload)).meeting
        toast.success('Reunião atualizada!')
      } else {
        saved = (await meetingsApi.create(payload)).meeting
        toast.success('Reunião criada!')
      }
      onSaved(saved)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar reunião')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-50">
            {meeting ? 'Editar Reunião' : 'Nova Reunião'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Título *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Reunião com cliente"
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Data *</label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Horário *</label>
            <TimePicker value={time} onChange={setTime} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Observações</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Pauta, link de videoconferência, participantes..."
              rows={3}
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800 transition">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {meeting ? 'Salvar' : 'Criar Reunião'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Mini Calendário lateral ──────────────────────────────────────────────────

function MiniCalendar({
  meetings,
  selectedDate,
  onSelectDate,
}: {
  meetings: Meeting[]
  selectedDate: Date | null
  onSelectDate: (d: Date | null) => void
}) {
  const [viewMonth, setViewMonth] = useState(new Date())

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = monthStart.getDay()
  const meetingDates = new Set(meetings.map(m => m.date))

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-zinc-50 capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-zinc-500 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const hasMeeting = meetingDates.has(dateStr)
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
          const todayDay = isToday(day)

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(isSelected ? null : day)}
              className={`relative flex flex-col items-center justify-center h-8 w-full rounded-lg text-xs font-medium transition
                ${isSelected ? 'bg-emerald-600 text-white' : todayDay ? 'bg-zinc-800 text-emerald-400' : isSameMonth(day, viewMonth) ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-600'}
              `}
            >
              {format(day, 'd')}
              {hasMeeting && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </button>
          )
        })}
      </div>
      {selectedDate && (
        <button onClick={() => onSelectDate(null)} className="mt-3 w-full text-xs text-zinc-500 hover:text-zinc-300 transition">
          Limpar filtro
        </button>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    meetingsApi.list()
      .then(r => setMeetings(r.meetings || []))
      .catch(() => toast.error('Erro ao carregar reuniões'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (m: Meeting) => {
    setMeetings(prev => {
      const idx = prev.findIndex(x => x.id === m.id)
      if (idx >= 0) { const copy = [...prev]; copy[idx] = m; return copy }
      return [m, ...prev]
    })
    setShowModal(false)
    setEditingMeeting(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await meetingsApi.delete(id)
      setMeetings(prev => prev.filter(m => m.id !== id))
      setDeletingId(null)
      toast.success('Reunião removida!')
    } catch {
      toast.error('Erro ao remover reunião')
    }
  }

  const sorted = [...meetings].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))

  const filtered = selectedDate
    ? sorted.filter(m => m.date === format(selectedDate, 'yyyy-MM-dd'))
    : sorted

  const formatDisplayDate = (date: string) => {
    try { return format(parseISO(date), "dd 'de' MMMM", { locale: ptBR }) } catch { return date }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Reuniões</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {meetings.length} reunião{meetings.length !== 1 ? 'ões' : ''} agendada{meetings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm"
        >
          <Plus size={16} />
          Nova Reunião
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* Calendar sidebar */}
        <div className="w-64 flex-shrink-0 space-y-3">
          <MiniCalendar meetings={meetings} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          {selectedDate && (
            <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-xs text-emerald-400 font-medium">
                {formatDisplayDate(format(selectedDate, 'yyyy-MM-dd'))}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{filtered.length} reunião(ões)</p>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar size={36} className="text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">
                {selectedDate ? 'Nenhuma reunião neste dia' : 'Nenhuma reunião agendada'}
              </p>
              {!selectedDate && (
                <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-emerald-500 hover:text-emerald-400 transition">
                  + Criar primeira reunião
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950">
                  <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Título</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Horário</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Observações</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Criado por</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition group">
                    <td className="px-4 py-3 font-medium text-zinc-50">{m.title}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-zinc-500" />
                        {formatDisplayDate(m.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-zinc-500" />
                        {m.time}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 max-w-xs">
                      {m.notes ? (
                        <span className="flex items-start gap-1.5">
                          <FileText size={13} className="text-zinc-600 flex-shrink-0 mt-0.5" />
                          <span className="truncate">{m.notes}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{m.createdBy || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => { setEditingMeeting(m); setShowModal(true) }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700"
                        >
                          <Edit2 size={14} />
                        </button>
                        {deletingId === m.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(m.id)} className="px-2 py-1 bg-rose-600 text-white text-xs rounded-lg hover:bg-rose-700">
                              Confirmar
                            </button>
                            <button onClick={() => setDeletingId(null)} className="px-2 py-1 text-zinc-400 text-xs hover:text-zinc-200">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(m.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(showModal || editingMeeting) && (
        <MeetingModal
          meeting={editingMeeting}
          onClose={() => { setShowModal(false); setEditingMeeting(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

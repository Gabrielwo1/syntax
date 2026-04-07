import React, { useEffect, useRef, useState } from 'react'
import {
  Plus,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Trash2,
  Filter,
  Search,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, isPast, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { financeiroApi } from '../lib/api'
import type { FinancialEntry } from '../lib/api'

const CATEGORIES = ['Serviços', 'Produtos', 'Salários', 'Aluguel', 'Marketing', 'Tecnologia', 'Impostos', 'Outros']
const RECURRENCES = [
  { value: '', label: 'Sem recorrência' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
]
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR }) } catch { return dateStr }
}

function formatMonthLabel(ym: string) {
  try {
    const label = format(parseISO(ym + '-01'), 'MMM yyyy', { locale: ptBR })
    return label.charAt(0).toUpperCase() + label.slice(1)
  } catch { return ym }
}

function getEntryStatus(entry: FinancialEntry): FinancialEntry['status'] {
  if (entry.status === 'paid') return 'paid'
  try { if (isPast(parseISO(entry.dueDate))) return 'overdue' } catch { /* */ }
  return 'pending'
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    paid:    { label: 'Pago',     cls: 'bg-emerald-500/20 text-emerald-400' },
    pending: { label: 'Pendente', cls: 'bg-amber-500/20 text-amber-400' },
    overdue: { label: 'Vencido',  cls: 'bg-rose-500/20 text-rose-400' },
  }
  const c = config[status] || { label: status, cls: 'bg-zinc-800 text-zinc-300' }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.cls}`}>{c.label}</span>
}

// ── Month Picker helpers ──────────────────────────────────────────────────────

function dueDateFromMonthYear(month: number, year: number): string {
  // Last day of the selected month
  const days = getDaysInMonth(new Date(year, month - 1))
  return `${year}-${String(month).padStart(2, '0')}-${String(days).padStart(2, '0')}`
}

function parseMonthYear(dateStr: string): { month: number; year: number } {
  try {
    const d = parseISO(dateStr)
    return { month: d.getMonth() + 1, year: d.getFullYear() }
  } catch {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  }
}

// ── EntryModal ────────────────────────────────────────────────────────────────

function EntryModal({ entry, defaultMonth, onClose, onSaved }: {
  entry?: FinancialEntry | null
  defaultMonth?: string  // 'YYYY-MM' to pre-fill month/year
  onClose: () => void
  onSaved: (e: FinancialEntry) => void
}) {
  const now = new Date()
  const initMY = entry
    ? parseMonthYear(entry.dueDate)
    : defaultMonth
      ? { month: parseInt(defaultMonth.slice(5)), year: parseInt(defaultMonth.slice(0, 4)) }
      : { month: now.getMonth() + 1, year: now.getFullYear() }

  const [form, setForm] = useState({
    type:            entry?.type             || 'receivable',
    description:     entry?.description      || '',
    amount:          entry?.amount?.toString() || '',
    month:           String(initMY.month),
    year:            String(initMY.year),
    category:        entry?.category         || '',
    clientOrSupplier: entry?.clientOrSupplier || '',
    notes:           entry?.notes            || '',
    recurrence:      entry?.recurrence       || '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Year options: current-1 … current+3
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.amount) { toast.error('Preencha os campos obrigatórios'); return }
    setLoading(true)
    try {
      const dueDate = dueDateFromMonthYear(parseInt(form.month), parseInt(form.year))
      const payload = {
        type:             form.type as 'receivable' | 'payable',
        description:      form.description,
        amount:           parseFloat(form.amount),
        dueDate,
        category:         form.category         || undefined,
        clientOrSupplier: form.clientOrSupplier  || undefined,
        notes:            form.notes             || undefined,
        recurrence:       form.recurrence        || undefined,
      }
      let saved: FinancialEntry
      if (entry) {
        saved = await financeiroApi.updateEntry(entry.id, payload) as FinancialEntry
      } else {
        saved = await financeiroApi.createEntry(payload) as FinancialEntry
      }
      toast.success(entry ? 'Lançamento atualizado!' : 'Lançamento criado!')
      onSaved(saved)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const selectCls = 'w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-950 appearance-none'
  const inputCls  = 'w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-50">{entry ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Tipo</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => set('type', 'receivable')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition ${form.type === 'receivable' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-950'}`}>
                <TrendingUp size={14} /> A Receber
              </button>
              <button type="button" onClick={() => set('type', 'payable')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition ${form.type === 'payable' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-950'}`}>
                <TrendingDown size={14} /> A Pagar
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              required placeholder="Ex: Serviço de desenvolvimento" className={inputCls} />
          </div>

          {/* Valor + Mês de referência */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Valor (R$) *</label>
              <input value={form.amount} onChange={e => set('amount', e.target.value)}
                required type="number" min="0" step="0.01" placeholder="0,00" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Mês de referência *</label>
              <div className="flex gap-1">
                <select value={form.month} onChange={e => set('month', e.target.value)} className={selectCls} style={{ flex: '1.6' }}>
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={String(i + 1)}>{m.slice(0, 3)}</option>
                  ))}
                </select>
                <select value={form.year} onChange={e => set('year', e.target.value)} className={selectCls} style={{ flex: '1' }}>
                  {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Categoria + Recorrência */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Categoria</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={selectCls}>
                <option value="">Selecionar...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Recorrência</label>
              <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)} className={selectCls}>
                {RECURRENCES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Cliente/Fornecedor */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Cliente / Fornecedor</label>
            <input value={form.clientOrSupplier} onChange={e => set('clientOrSupplier', e.target.value)}
              placeholder="Nome" className={inputCls} />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Observações</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Notas adicionais..." rows={2}
              className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-950 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {entry ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'receivable' | 'payable' | 'pending' | 'paid' | 'overdue'

export default function Financeiro() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editEntry, setEditEntry] = useState<FinancialEntry | null>(null)
  const [activeMonth, setActiveMonth] = useState<string>('') // 'YYYY-MM' or '' = all
  const [filter, setFilter] = useState<FilterType>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const didAutoSelect = useRef(false)

  useEffect(() => {
    financeiroApi.getEntries()
      .then(r => setEntries(r.entries))
      .catch(() => toast.error('Erro ao carregar lançamentos'))
      .finally(() => setLoading(false))
  }, [])

  // Auto-select current month after first load
  useEffect(() => {
    if (didAutoSelect.current || entries.length === 0) return
    didAutoSelect.current = true
    const current = format(new Date(), 'yyyy-MM')
    const months = Array.from(new Set(entries.map(e => e.dueDate?.slice(0, 7)).filter(Boolean))).sort() as string[]
    setActiveMonth(months.includes(current) ? current : (months[months.length - 1] || ''))
  }, [entries])

  const handleMarkPaid = async (id: string) => {
    try {
      const updated = await financeiroApi.markPaid(id) as FinancialEntry
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'paid', ...(updated || {}) } : e))
      toast.success('Marcado como pago!')
    } catch { toast.error('Erro ao marcar como pago') }
  }

  const handleDelete = async (id: string) => {
    try {
      await financeiroApi.deleteEntry(id)
      setEntries(prev => prev.filter(e => e.id !== id))
      setDeletingId(null)
      toast.success('Lançamento excluído!')
    } catch { toast.error('Erro ao excluir') }
  }

  const handleSaved = (entry: FinancialEntry) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id)
      if (idx >= 0) { const copy = [...prev]; copy[idx] = entry; return copy }
      return [entry, ...prev]
    })
    // Jump to the saved entry's month
    if (entry.dueDate) setActiveMonth(entry.dueDate.slice(0, 7))
  }

  // Derived
  const enriched = entries.map(e => ({ ...e, computedStatus: getEntryStatus(e) }))

  const availableMonths = Array.from(
    new Set(enriched.map(e => e.dueDate?.slice(0, 7)).filter(Boolean))
  ).sort() as string[]

  // Summary scoped to active month (or all)
  const summaryBase = activeMonth
    ? enriched.filter(e => e.dueDate?.slice(0, 7) === activeMonth)
    : enriched

  const totalReceivable = summaryBase.filter(e => e.type === 'receivable' && e.computedStatus !== 'paid').reduce((s, e) => s + e.amount, 0)
  const totalPayable    = summaryBase.filter(e => e.type === 'payable'    && e.computedStatus !== 'paid').reduce((s, e) => s + e.amount, 0)
  const balance         = summaryBase.filter(e => e.type === 'receivable' && e.computedStatus === 'paid').reduce((s, e) => s + e.amount, 0)
                        - summaryBase.filter(e => e.type === 'payable'    && e.computedStatus === 'paid').reduce((s, e) => s + e.amount, 0)
  const overdueCount    = summaryBase.filter(e => e.computedStatus === 'overdue').length

  // Table filter (applies on top of month filter)
  const filtered = enriched.filter(e => {
    if (activeMonth && e.dueDate?.slice(0, 7) !== activeMonth) return false
    if (filter === 'receivable' && e.type !== 'receivable') return false
    if (filter === 'payable'    && e.type !== 'payable')    return false
    if (filter === 'pending'    && e.computedStatus !== 'pending') return false
    if (filter === 'paid'       && e.computedStatus !== 'paid')    return false
    if (filter === 'overdue'    && e.computedStatus !== 'overdue') return false
    if (categoryFilter && e.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return e.description.toLowerCase().includes(q) || (e.clientOrSupplier || '').toLowerCase().includes(q)
    }
    return true
  })

  const categories = Array.from(new Set(entries.map(e => e.category).filter(Boolean))) as string[]

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',        label: 'Todos' },
    { key: 'receivable', label: 'A Receber' },
    { key: 'payable',    label: 'A Pagar' },
    { key: 'pending',    label: 'Pendentes' },
    { key: 'paid',       label: 'Pagos' },
    { key: 'overdue',    label: 'Vencidos' },
  ]

  const scrollTabs = (dir: number) => {
    tabsRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' })
  }

  const activeMonthLabel = activeMonth ? formatMonthLabel(activeMonth) : 'Todos os meses'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Financeiro</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {activeMonthLabel} · {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm"
        >
          <Plus size={16} /> Novo Lançamento
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-500" />
            </div>
            <span className="text-sm text-zinc-400 font-medium">A Receber</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalReceivable)}</p>
          <p className="text-xs text-zinc-500 mt-1">Entradas pendentes</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center">
              <TrendingDown size={18} className="text-rose-400" />
            </div>
            <span className="text-sm text-zinc-400 font-medium">A Pagar</span>
          </div>
          <p className="text-2xl font-bold text-rose-400">{formatCurrency(totalPayable)}</p>
          <p className="text-xs text-zinc-500 mt-1">Saídas pendentes</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <DollarSign size={18} className="text-blue-400" />
            </div>
            <span className="text-sm text-zinc-400 font-medium">Saldo</span>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(balance)}</p>
          <p className="text-xs text-zinc-500 mt-1">Receita — Despesas pagas</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <AlertCircle size={18} className="text-amber-400" />
            </div>
            <span className="text-sm text-zinc-400 font-medium">Vencidos</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{overdueCount}</p>
          <p className="text-xs text-zinc-500 mt-1">Lançamentos em atraso</p>
        </div>
      </div>

      {/* Month tabs */}
      {!loading && availableMonths.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-4 flex items-center gap-2">
          <button onClick={() => scrollTabs(-1)} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0 transition">
            <ChevronLeft size={16} />
          </button>

          <div ref={tabsRef} className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1" style={{ scrollbarWidth: 'none' }}>
            {/* All tab */}
            <button
              onClick={() => setActiveMonth('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition border ${
                !activeMonth
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400'
              }`}
            >
              Todos
            </button>

            {availableMonths.map(ym => {
              const isActive = activeMonth === ym
              const monthEntries = enriched.filter(e => e.dueDate?.slice(0, 7) === ym)
              const hasOverdue   = monthEntries.some(e => e.computedStatus === 'overdue')
              return (
                <button
                  key={ym}
                  onClick={() => setActiveMonth(ym)}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition border ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400'
                  }`}
                >
                  {formatMonthLabel(ym)}
                  {hasOverdue && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" title="Vencidos neste mês" />
                  )}
                </button>
              )
            })}
          </div>

          <button onClick={() => scrollTabs(1)} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0 transition">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Status filters + search */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                filter === f.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-emerald-600 hover:text-emerald-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {categories.length > 0 && (
            <div className="relative">
              <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="pl-7 pr-3 py-2 border border-zinc-700 rounded-lg text-xs bg-zinc-900 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none">
                <option value="">Categorias</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="pl-7 pr-3 py-2 border border-zinc-700 rounded-lg text-xs bg-zinc-900 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44" />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Tipo</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Vencimento</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Categoria</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map(entry => (
                  <tr key={entry.id} className="hover:bg-zinc-950/60 transition group">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-50 leading-tight">{entry.description}</p>
                      {entry.clientOrSupplier && <p className="text-xs text-zinc-500 mt-0.5">{entry.clientOrSupplier}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${entry.type === 'receivable' ? 'text-emerald-500' : 'text-rose-400'}`}>
                        {entry.type === 'receivable' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {entry.type === 'receivable' ? 'Receber' : 'Pagar'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${entry.type === 'receivable' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(entry.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{formatDate(entry.dueDate)}</td>
                    <td className="px-4 py-3"><StatusBadge status={entry.computedStatus} /></td>
                    <td className="px-4 py-3">
                      {entry.category
                        ? <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full">{entry.category}</span>
                        : <span className="text-zinc-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {entry.computedStatus !== 'paid' && (
                          <button onClick={() => handleMarkPaid(entry.id)} title="Marcar como pago"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 transition">
                            <CheckCircle size={15} />
                          </button>
                        )}
                        {entry.computedStatus === 'paid' && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1 px-1.5">
                            <CheckCircle size={12} /> Pago
                          </span>
                        )}
                        <button onClick={() => setEditEntry(entry)} title="Editar"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition">
                          <Pencil size={14} />
                        </button>
                        {deletingId === entry.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(entry.id)}
                              className="px-2 py-1 bg-rose-500 text-white text-xs rounded hover:bg-rose-600 transition">
                              Confirmar
                            </button>
                            <button onClick={() => setDeletingId(null)}
                              className="px-2 py-1 bg-zinc-700 text-zinc-300 text-xs rounded hover:bg-zinc-600 transition">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(entry.id)} title="Excluir"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-zinc-500 text-sm">
                      {entries.length === 0
                        ? 'Nenhum lançamento. Clique em "Novo Lançamento" para começar.'
                        : activeMonth
                          ? `Nenhum lançamento em ${formatMonthLabel(activeMonth)} com esses filtros.`
                          : 'Nenhum lançamento encontrado com os filtros aplicados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <EntryModal
          defaultMonth={activeMonth || undefined}
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
        />
      )}
      {editEntry && (
        <EntryModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

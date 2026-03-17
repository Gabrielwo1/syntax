import React, { useState, useRef, useEffect } from 'react'
import {
  Plus, X, Printer, ArrowLeft, ChevronDown,
  FileText, Clock, CheckCircle2, XCircle, Send,
  Trash2, Building2, Mail, Phone, Calendar, Hash,
  DollarSign, Percent, AlignLeft, CreditCard, Eye,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { quotesApi } from '../lib/api'
import type { Quote, QuoteItem, QuoteStatus } from '../data/mockData'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—'
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }) } catch { return d }
}

function fmtMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function nextQuoteNumber(quotes: Quote[]) {
  const year = new Date().getFullYear()
  const nums = quotes
    .map(q => q.number)
    .filter(n => n.startsWith(`ORC-${year}-`))
    .map(n => parseInt(n.split('-')[2] ?? '0', 10))
  const max = nums.length > 0 ? Math.max(...nums) : 37
  return `ORC-${year}-${String(max + 1).padStart(3, '0')}`
}

function calcSubtotal(items: QuoteItem[]) {
  return items.reduce((s, i) => s + i.total, 0)
}

function calcTotal(items: QuoteItem[], discount: number) {
  const sub = calcSubtotal(items)
  return sub - (sub * discount) / 100
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<QuoteStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  draft:    { label: 'Rascunho', color: 'text-zinc-400',    bg: 'bg-zinc-800',       border: 'border-zinc-700',       icon: FileText },
  sent:     { label: 'Enviado',  color: 'text-blue-400',    bg: 'bg-blue-500/20',    border: 'border-blue-500/30',    icon: Send },
  approved: { label: 'Aprovado', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado',color: 'text-rose-400',   bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: XCircle },
}

const PAYMENT_OPTIONS = [
  { value: 'avista',    label: 'À vista' },
  { value: '50%+50%',   label: '50% entrada + 50% entrega' },
  { value: '30/60/90',  label: '30 / 60 / 90 dias' },
  { value: 'custom',    label: 'Personalizado' },
]

function StatusBadge({ status }: { status: QuoteStatus }) {
  const c = STATUS_CFG[status]
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${c.bg} ${c.color} border ${c.border}`}>
      <Icon className="w-3 h-3" />{c.label}
    </span>
  )
}

// ─── PDF Preview ──────────────────────────────────────────────────────────────

function QuotePreview({ quote }: { quote: Quote }) {
  const subtotal = calcSubtotal(quote.items)
  const total = calcTotal(quote.items, quote.discount)
  const discountVal = subtotal - total

  return (
    <div
      id="quote-preview"
      className="bg-zinc-900 border border-zinc-800 rounded-2xl min-h-[842px] p-12 shadow-2xl shadow-black/30 print:shadow-none print:border-0 print:rounded-none print:p-16 print:bg-white print:text-black"
    >
      {/* Letterhead */}
      <div className="flex items-start justify-between mb-10 pb-8 border-b border-zinc-800 print:border-zinc-300">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center print:bg-emerald-600">
              <span className="text-white font-black text-lg">S</span>
            </div>
            <div>
              <p className="text-white font-black text-xl tracking-tight print:text-black">Syntax</p>
              <p className="text-zinc-500 text-xs print:text-zinc-600">Agência Digital & Desenvolvimento</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1 print:text-zinc-500">PROPOSTA COMERCIAL</p>
          <p className="text-emerald-400 font-bold text-lg print:text-emerald-600">{quote.number || '—'}</p>
          <p className="text-zinc-500 text-xs mt-1 print:text-zinc-500">Data: {fmtDate(new Date().toISOString())}</p>
        </div>
      </div>

      {/* Client */}
      <div className="mb-10">
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2 print:text-zinc-500">PREPARADO PARA</p>
        <p className="text-2xl font-bold text-emerald-400 leading-tight print:text-emerald-600">
          {quote.client || 'Nome do Cliente'}
        </p>
        <div className="flex flex-wrap gap-4 mt-2">
          {quote.clientEmail && (
            <span className="text-sm text-zinc-400 flex items-center gap-1.5 print:text-zinc-600">
              <Mail className="w-3.5 h-3.5" />{quote.clientEmail}
            </span>
          )}
          {quote.clientPhone && (
            <span className="text-sm text-zinc-400 flex items-center gap-1.5 print:text-zinc-600">
              <Phone className="w-3.5 h-3.5" />{quote.clientPhone}
            </span>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="mb-8">
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3 print:text-zinc-500">ITENS DO PROJETO</p>
        <div className="rounded-xl overflow-hidden border border-zinc-800 print:border-zinc-300">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-800/60 print:bg-zinc-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide print:text-zinc-600">Descrição</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide print:text-zinc-600 w-16">Qtd</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide print:text-zinc-600">Unitário</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide print:text-zinc-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-600 italic text-sm">
                    Adicione itens de serviço no formulário
                  </td>
                </tr>
              ) : (
                quote.items.map((item, i) => (
                  <tr key={item.id} className={`border-t border-zinc-800 print:border-zinc-200 ${i % 2 === 1 ? 'bg-zinc-800/20 print:bg-zinc-50' : ''}`}>
                    <td className="px-4 py-3 text-zinc-100 font-medium print:text-zinc-800">{item.description}</td>
                    <td className="px-4 py-3 text-center text-zinc-400 print:text-zinc-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-zinc-400 print:text-zinc-600">{fmtMoney(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right text-zinc-100 font-semibold print:text-zinc-800">{fmtMoney(item.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400 print:text-zinc-600">Subtotal</span>
              <span className="text-zinc-200 font-medium print:text-zinc-800">{fmtMoney(subtotal)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400 print:text-zinc-600">Desconto ({quote.discount}%)</span>
                <span className="text-rose-400 font-medium">−{fmtMoney(discountVal)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-zinc-700 print:border-zinc-300">
              <span className="text-zinc-50 font-bold print:text-zinc-900">TOTAL</span>
              <span className="text-emerald-400 font-black text-lg print:text-emerald-600">{fmtMoney(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-zinc-800/40 print:bg-zinc-50 rounded-xl p-4 border border-zinc-800 print:border-zinc-200">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2 print:text-zinc-500">PRAZO & ENTREGA</p>
          <div className="flex items-center gap-2 text-sm text-zinc-200 print:text-zinc-800 mb-1">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span>{quote.deliveryDays ? `${quote.deliveryDays} dias úteis` : '—'}</span>
          </div>
          {quote.validUntil && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 print:text-zinc-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Válido até {fmtDate(quote.validUntil)}</span>
            </div>
          )}
        </div>
        <div className="bg-zinc-800/40 print:bg-zinc-50 rounded-xl p-4 border border-zinc-800 print:border-zinc-200">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2 print:text-zinc-500">PAGAMENTO</p>
          <div className="flex items-center gap-2 text-sm text-zinc-200 print:text-zinc-800">
            <CreditCard className="w-4 h-4 text-zinc-500" />
            <span>{(PAYMENT_OPTIONS.find(o => o.value === quote.paymentTerms)?.label ?? quote.paymentTerms) || '—'}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="mb-8 bg-zinc-800/30 print:bg-zinc-50 rounded-xl p-4 border border-zinc-800 print:border-zinc-200">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2 print:text-zinc-500">OBSERVAÇÕES</p>
          <p className="text-sm text-zinc-300 leading-relaxed print:text-zinc-700">{quote.notes}</p>
        </div>
      )}

      {/* Footer / Signature */}
      <div className="pt-8 border-t border-zinc-800 print:border-zinc-300 flex items-end justify-between">
        <div>
          <div className="w-32 h-px bg-zinc-600 print:bg-zinc-400 mb-1" />
          <p className="text-xs text-zinc-500 print:text-zinc-500">Syntax — Agência Digital</p>
        </div>
        <p className="text-xs text-zinc-600 print:text-zinc-400">
          Esta proposta é válida até {fmtDate(quote.validUntil) !== '—' ? fmtDate(quote.validUntil) : '—'}
        </p>
      </div>
    </div>
  )
}

// ─── Quote Editor ─────────────────────────────────────────────────────────────

function QuoteEditor({ quote, onBack, onSave, onDelete }: {
  quote: Quote
  onBack: () => void
  onSave: (q: Quote) => void
  onDelete: () => void
}) {
  const [form, setForm] = useState<Quote>({ ...quote })
  const set = <K extends keyof Quote>(k: K, v: Quote[K]) => setForm(f => ({ ...f, [k]: v }))

  // Items
  const addItem = () => {
    const newItem: QuoteItem = { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 }
    set('items', [...form.items, newItem])
  }

  const updateItem = (id: string, field: keyof QuoteItem, raw: string) => {
    const val = field === 'description' ? raw : parseFloat(raw) || 0
    setForm(f => ({
      ...f,
      items: f.items.map(i => {
        if (i.id !== id) return i
        const updated = { ...i, [field]: val } as QuoteItem
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice
        }
        return updated
      })
    }))
  }

  const removeItem = (id: string) => set('items', form.items.filter(i => i.id !== id))

  const handleSave = () => {
    onSave(form)
    // parent calls setEditingQuote(null) after async save succeeds
  }

  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
  const labelCls = "block text-xs font-medium text-zinc-400 mb-1.5"
  const sectionCls = "space-y-3"
  const sectionTitle = "text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-zinc-800"

  return (
    <div className="min-h-full bg-zinc-950 print:bg-white">
      {/* Top bar (hidden on print) */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-50 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Voltar à lista
        </button>
        <div className="flex items-center gap-2">
          <StatusBadge status={form.status} />
          <button
            onClick={() => { if (confirm('Excluir este orçamento?')) onDelete() }}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-rose-500/50 hover:text-rose-400 rounded-2xl transition-all font-medium text-sm"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-50 rounded-2xl transition-all font-medium text-sm"
          >
            <Printer className="w-4 h-4" /> Baixar PDF
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl hover:bg-emerald-700 transition-colors font-medium shadow-lg shadow-emerald-900/20 text-sm"
          >
            Salvar
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex h-[calc(100vh-65px)] print:block">
        {/* ── Left: Form (hidden on print) ── */}
        <div className="w-96 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 overflow-y-auto print:hidden">
          <div className="p-5 space-y-6">

            {/* 1. Cliente */}
            <div className={sectionCls}>
              <p className={sectionTitle}><Building2 className="w-3.5 h-3.5" /> Cliente</p>
              <div>
                <label className={labelCls}>Nome / Empresa</label>
                <input value={form.client} onChange={e => set('client', e.target.value)} placeholder="Nome do cliente" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>E-mail</label>
                <input type="email" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} placeholder="email@cliente.com.br" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Telefone</label>
                <input value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} placeholder="(11) 99999-0000" className={inputCls} />
              </div>
            </div>

            {/* 2. Validade */}
            <div className={sectionCls}>
              <p className={sectionTitle}><Calendar className="w-3.5 h-3.5" /> Validade</p>
              <div>
                <label className={labelCls}>Número do Orçamento</label>
                <input value={form.number} onChange={e => set('number', e.target.value)} placeholder="ORC-2026-001" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Data de Validade</label>
                  <input type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Prazo (dias úteis)</label>
                  <input type="number" min={0} value={form.deliveryDays} onChange={e => set('deliveryDays', parseInt(e.target.value) || 0)} placeholder="15" className={inputCls} />
                </div>
              </div>
            </div>

            {/* 3. Itens */}
            <div className={sectionCls}>
              <p className={sectionTitle}><DollarSign className="w-3.5 h-3.5" /> Itens de Serviço</p>
              <div className="space-y-2">
                {form.items.map(item => (
                  <div key={item.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Descrição do serviço"
                        className="flex-1 bg-transparent text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none"
                      />
                      <button onClick={() => removeItem(item.id)} className="text-zinc-600 hover:text-rose-400 transition-colors flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-zinc-600 mb-0.5">Qtd</label>
                        <input
                          type="number" min={1} value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-50 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-600 mb-0.5">Unitário (R$)</label>
                        <input
                          type="number" min={0} step={0.01} value={item.unitPrice}
                          onChange={e => updateItem(item.id, 'unitPrice', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-50 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-600 mb-0.5">Total</label>
                        <div className="px-2 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-xs text-emerald-400 font-semibold">
                          {fmtMoney(item.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addItem}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-zinc-700 hover:border-emerald-500/50 text-zinc-500 hover:text-emerald-400 rounded-xl text-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> Adicionar Item
                </button>
              </div>
            </div>

            {/* 4. Resumo financeiro */}
            <div className={sectionCls}>
              <p className={sectionTitle}><Percent className="w-3.5 h-3.5" /> Resumo Financeiro</p>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="text-zinc-200 font-medium">{fmtMoney(calcSubtotal(form.items))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-sm">Desconto (%)</span>
                  <input
                    type="number" min={0} max={100} value={form.discount}
                    onChange={e => set('discount', Math.min(100, parseFloat(e.target.value) || 0))}
                    className="w-20 ml-auto bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-50 focus:outline-none focus:border-emerald-500/50 text-right"
                  />
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-800">
                  <span className="text-zinc-50 font-bold">Total</span>
                  <span className="text-emerald-400 font-black text-base">{fmtMoney(calcTotal(form.items, form.discount))}</span>
                </div>
              </div>
            </div>

            {/* 5. Condições */}
            <div className={sectionCls}>
              <p className={sectionTitle}><CreditCard className="w-3.5 h-3.5" /> Condições</p>
              <div>
                <label className={labelCls}>Forma de Pagamento</label>
                <select
                  value={form.paymentTerms}
                  onChange={e => set('paymentTerms', e.target.value)}
                  className="w-full text-sm border border-zinc-800 rounded-xl px-3 py-2.5 bg-zinc-950 text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer appearance-none"
                >
                  {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* 6. Observações */}
            <div className={sectionCls}>
              <p className={sectionTitle}><AlignLeft className="w-3.5 h-3.5" /> Observações</p>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Condições especiais, informações adicionais..."
                rows={4}
                className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all"
              />
            </div>

            {/* 7. Status */}
            <div className={sectionCls}>
              <p className={sectionTitle}><Hash className="w-3.5 h-3.5" /> Status da Proposta</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(STATUS_CFG) as QuoteStatus[]).map(s => {
                  const c = STATUS_CFG[s]
                  const Icon = c.icon
                  const isActive = form.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => set('status', s)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        isActive ? `${c.bg} ${c.color} ${c.border}` : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />{c.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Preview ── */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 p-8 print:p-0 print:bg-white">
          <QuotePreview quote={form} />
        </div>
      </div>
    </div>
  )
}

// ─── Quote List ────────────────────────────────────────────────────────────────

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'all'>('all')
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)

  useEffect(() => {
    quotesApi.list()
      .then(({ quotes: qs }) => setQuotes(qs as Quote[]))
      .catch(() => toast.error('Erro ao carregar orçamentos'))
      .finally(() => setLoading(false))
  }, [])

  const handleNew = async () => {
    const q = {
      number: nextQuoteNumber(quotes),
      client: '',
      clientEmail: '',
      clientPhone: '',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      deliveryDays: 15,
      paymentTerms: '50%+50%',
      notes: '',
      items: [],
      discount: 0,
      status: 'draft' as QuoteStatus,
      createdAt: new Date().toISOString(),
    }
    try {
      const { quote } = await quotesApi.create(q)
      const newQ = quote as Quote
      setQuotes(prev => [newQ, ...prev])
      setEditingQuote(newQ)
    } catch {
      toast.error('Erro ao criar orçamento')
    }
  }

  const handleSave = async (updated: Quote) => {
    try {
      const { quote } = await quotesApi.update(updated.id, updated as any)
      const saved = quote as Quote
      setQuotes(prev => prev.map(q => q.id === saved.id ? saved : q))
      setEditingQuote(null)
      toast.success('Orçamento salvo')
    } catch {
      toast.error('Erro ao salvar orçamento')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await quotesApi.delete(id)
      setQuotes(prev => prev.filter(q => q.id !== id))
      setEditingQuote(null)
      toast.success('Orçamento excluído')
    } catch {
      toast.error('Erro ao excluir orçamento')
    }
  }

  if (editingQuote) {
    return (
      <QuoteEditor
        quote={editingQuote}
        onBack={() => setEditingQuote(null)}
        onSave={handleSave}
        onDelete={() => handleDelete(editingQuote.id)}
      />
    )
  }

  const filtered = filterStatus === 'all' ? quotes : quotes.filter(q => q.status === filterStatus)

  const statusCounts = (Object.keys(STATUS_CFG) as QuoteStatus[]).reduce((acc, s) => {
    acc[s] = quotes.filter(q => q.status === s).length
    return acc
  }, {} as Record<QuoteStatus, number>)

  const totalApproved = quotes.filter(q => q.status === 'approved').reduce((s, q) => s + calcTotal(q.items, q.discount), 0)

  return (
    <div className="min-h-full bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Orçamentos</h1>
            <p className="text-sm font-medium text-zinc-400 mt-1">Gerencie e envie propostas comerciais</p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl hover:bg-emerald-700 transition-colors font-medium shadow-lg shadow-emerald-900/20"
          >
            <Plus className="w-4 h-4" /> Novo Orçamento
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && <div className="px-8 py-6 space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 mb-1">Total</p>
            <p className="text-2xl font-bold text-zinc-50">{quotes.length}</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 mb-1">Aprovados</p>
            <p className="text-2xl font-bold text-emerald-400">{statusCounts.approved}</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 mb-1">Aguardando</p>
            <p className="text-2xl font-bold text-blue-400">{statusCounts.sent}</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 mb-1">Receita Aprovada</p>
            <p className="text-2xl font-bold text-emerald-400">{fmtMoney(totalApproved)}</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          {([['all', 'Todos'], ...Object.entries(STATUS_CFG).map(([k, v]) => [k, v.label])] as [string, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key as QuoteStatus | 'all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterStatus === key
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[40vh] text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 border border-emerald-500/20">
              <FileText className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-xl text-zinc-50 font-bold tracking-tight">Nenhum orçamento</p>
            <p className="text-zinc-400 text-sm mt-2 mb-8">Crie o primeiro orçamento clicando em "Novo Orçamento".</p>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden shadow-xl shadow-black/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/50 text-xs font-semibold text-zinc-400 bg-zinc-900/30">
                  <th className="py-3.5 px-5 uppercase tracking-wider">Número</th>
                  <th className="py-3.5 px-5 uppercase tracking-wider">Cliente</th>
                  <th className="py-3.5 px-5 uppercase tracking-wider hidden md:table-cell">Valor Total</th>
                  <th className="py-3.5 px-5 uppercase tracking-wider">Status</th>
                  <th className="py-3.5 px-5 uppercase tracking-wider hidden lg:table-cell">Criado em</th>
                  <th className="py-3.5 px-5 uppercase tracking-wider hidden lg:table-cell">Válido até</th>
                  <th className="py-3.5 px-5 uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map(q => (
                  <tr
                    key={q.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors cursor-pointer last:border-0 group"
                    onClick={() => setEditingQuote(q)}
                  >
                    <td className="py-4 px-5">
                      <span className="font-mono text-xs text-emerald-400 font-semibold">{q.number}</span>
                    </td>
                    <td className="py-4 px-5">
                      <p className="font-medium text-zinc-100">{q.client}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{q.clientEmail}</p>
                    </td>
                    <td className="py-4 px-5 hidden md:table-cell">
                      <span className="font-semibold text-zinc-100">{fmtMoney(calcTotal(q.items, q.discount))}</span>
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="py-4 px-5 hidden lg:table-cell">
                      <span className="text-zinc-500 text-xs">{fmtDate(q.createdAt)}</span>
                    </td>
                    <td className="py-4 px-5 hidden lg:table-cell">
                      <span className="text-zinc-500 text-xs">{fmtDate(q.validUntil)}</span>
                    </td>
                    <td className="py-4 px-5">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingQuote(q) }}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-50 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #quote-preview { display: block !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}

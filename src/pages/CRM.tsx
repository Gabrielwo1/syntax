import React, { useEffect, useState, useRef } from 'react'
import {
  Plus,
  Search,
  X,
  ChevronRight,
  Mail,
  Phone,
  Globe,
  Building,
  Calendar,
  DollarSign,
  Tag,
  MessageSquare,
  Loader2,
  Folder,
  FolderPlus,
  Trash2,
  Edit2,
  User,
  Clock,
  AlertCircle,
  Sparkles,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { crmApi, authApi } from '../lib/api'
import type { Lead, Folder, AppUser } from '../lib/api'
import { supabase, SUPABASE_ANON_KEY } from '../lib/supabase'

// ─── WhatsApp helpers ─────────────────────────────────────────────────────────

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function whatsappUrl(phone?: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  const full = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${full}`
}

// ─── AI extraction helpers ────────────────────────────────────────────────────

const EXTRACT_URL = 'https://thcjrzluhsbgtbirdoxl.supabase.co/functions/v1/make-server-cee56a32/crm/ai-extract'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface ExtractedLead {
  name: string
  phone?: string
  email?: string
  company?: string
  service?: string
  notes?: string
}

// ─── Import AI Modal ──────────────────────────────────────────────────────────

function ImportAIModal({ folders, onClose, onImported }: {
  folders: Folder[]
  onClose: () => void
  onImported: (leads: Lead[]) => void
}) {
  const [tab, setTab] = useState<'text' | 'image'>('text')
  const [textInput, setTextInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedLead[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const switchTab = (t: 'text' | 'image') => { setTab(t); setExtracted([]); setError(null) }

  const setImageFromFile = (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error('Apenas imagens'); return }
    setImageFile(f)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(f))
  }

  const handleExtract = async () => {
    setProcessing(true); setError(null); setExtracted([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      let body: object
      if (tab === 'text') {
        if (!textInput.trim()) { toast.error('Cole algum texto'); return }
        body = { type: 'text', content: textInput }
      } else {
        if (!imageFile) { toast.error('Selecione uma imagem'); return }
        const base64 = await fileToBase64(imageFile)
        body = { type: 'image', base64, mimeType: imageFile.type }
      }

      const res = await fetch(EXTRACT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao processar')

      const leads: ExtractedLead[] = data.leads || []
      setExtracted(leads)
      setSelected(new Set(leads.map((_: ExtractedLead, i: number) => i)))
      if (leads.length === 0) toast.info('Nenhum lead identificado. Tente com mais detalhes.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar')
    } finally {
      setProcessing(false)
    }
  }

  const toggleAll = () => {
    setSelected(prev => prev.size === extracted.length ? new Set() : new Set(extracted.map((_, i) => i)))
  }

  const toggleOne = (i: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  const handleImport = async () => {
    const toImport = extracted.filter((_, i) => selected.has(i))
    if (!toImport.length) return
    setImporting(true)
    try {
      const created: Lead[] = []
      for (const l of toImport) {
        const lead = await crmApi.createLead({
          name: l.name,
          email: l.email || `${l.name.toLowerCase().replace(/\s+/g, '.')}@importado.com`,
          phone: l.phone || undefined,
          company: l.company || undefined,
          service: l.service || undefined,
          notes: l.notes || undefined,
          stage: 'novo',
          source: 'IA',
        }) as Lead
        created.push(lead)
      }
      toast.success(`${created.length} lead${created.length > 1 ? 's' : ''} importado${created.length > 1 ? 's' : ''}!`)
      onImported(created)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-500" />
            <div>
              <h2 className="font-semibold text-zinc-50">Importar Leads com IA</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Cole uma lista ou envie um print — a IA extrai os dados automaticamente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Tabs */}
          <div className="flex bg-zinc-800 rounded-xl p-1 gap-1">
            {(['text', 'image'] as const).map(t => (
              <button key={t} onClick={() => switchTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-zinc-700 text-zinc-50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
                {t === 'text' ? 'Colar Texto' : 'Enviar Imagem / Print'}
              </button>
            ))}
          </div>

          {/* Input area */}
          {tab === 'text' ? (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Cole aqui sua lista (texto livre, CSV, tabela, qualquer formato)
              </label>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={`Exemplos:\nJoão Silva - (11) 99999-0001 - joao@email.com\nMaria Santos, Acme, 11988887777, Website\nNome: Pedro | Tel: 21987654321 | Serviço: E-commerce`}
                rows={7}
                className="w-full px-3 py-2.5 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono bg-zinc-950 text-zinc-200 placeholder-zinc-700"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Envie um print, foto ou screenshot com os contatos
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setImageFromFile(f) }}
                className="border-2 border-dashed border-zinc-700 hover:border-emerald-600 rounded-xl p-6 text-center cursor-pointer transition"
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setImageFromFile(f) }} />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                ) : (
                  <>
                    <Upload size={24} className="mx-auto text-zinc-500 mb-2" />
                    <p className="text-sm text-zinc-400">Clique ou arraste um print/foto</p>
                    <p className="text-xs text-zinc-600 mt-1">PNG, JPG, WebP</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Extracted leads */}
          {extracted.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-zinc-200">
                  {extracted.length} lead{extracted.length > 1 ? 's' : ''} identificado{extracted.length > 1 ? 's' : ''}
                </p>
                <button onClick={toggleAll} className="text-xs text-emerald-500 hover:text-emerald-400 transition">
                  {selected.size === extracted.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {extracted.map((lead, i) => (
                  <div
                    key={i}
                    onClick={() => toggleOne(i)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selected.has(i) ? 'border-emerald-600/40 bg-emerald-500/5' : 'border-zinc-700 bg-zinc-800/50 opacity-50'
                    }`}
                  >
                    <div className={`w-4 h-4 mt-0.5 rounded flex-shrink-0 border flex items-center justify-center ${selected.has(i) ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600'}`}>
                      {selected.has(i) && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-100">{lead.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {lead.phone && <span className="text-xs text-zinc-400 flex items-center gap-1"><Phone size={10}/>{lead.phone}</span>}
                        {lead.email && <span className="text-xs text-zinc-400 flex items-center gap-1"><Mail size={10}/>{lead.email}</span>}
                        {lead.company && <span className="text-xs text-zinc-500">{lead.company}</span>}
                        {lead.service && <span className="text-xs text-emerald-500/80">{lead.service}</span>}
                      </div>
                      {lead.notes && <p className="text-xs text-zinc-600 mt-0.5 truncate">{lead.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 flex gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-950 transition">
            Cancelar
          </button>
          {extracted.length === 0 ? (
            <button
              onClick={handleExtract}
              disabled={processing || (tab === 'text' ? !textInput.trim() : !imageFile)}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {processing ? <><Loader2 size={14} className="animate-spin" />Analisando...</> : <><Sparkles size={14} />Processar com IA</>}
            </button>
          ) : (
            <>
              <button
                onClick={handleExtract}
                disabled={processing}
                className="px-4 py-2 border border-zinc-600 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800 transition flex items-center gap-2 disabled:opacity-60"
              >
                {processing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Reprocessar
              </button>
              <button
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {importing ? <><Loader2 size={14} className="animate-spin" />Importando...</> : <>Importar {selected.size} lead{selected.size > 1 ? 's' : ''}</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const STAGES: { key: Lead['stage']; label: string; color: string; bg: string }[] = [
  { key: 'novo', label: 'Novo', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: 'contato', label: 'Contato', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  { key: 'proposta', label: 'Proposta', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { key: 'negociacao', label: 'Negociação', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { key: 'fechado', label: 'Fechado', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { key: 'perdido', label: 'Perdido', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
]

const PRIORITIES = [
  { key: 'low', label: 'Baixa', color: 'text-zinc-400 bg-zinc-800' },
  { key: 'medium', label: 'Média', color: 'text-amber-400 bg-amber-500/20' },
  { key: 'high', label: 'Alta', color: 'text-rose-400 bg-rose-500/20' },
]

const SERVICES = ['Website', 'E-commerce', 'Landing Page', 'SEO', 'Tráfego Pago', 'Social Media', 'Branding', 'Outros']
const SOURCES = ['Indicação', 'Site', 'Instagram', 'LinkedIn', 'Google Ads', 'Facebook', 'WhatsApp', 'Outros']

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR }) } catch { return dateStr }
}

function getInitials(name?: string | null): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function StageBadge({ stage }: { stage: Lead['stage'] }) {
  const s = STAGES.find(st => st.key === stage)
  if (!s) return null
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${s.bg} ${s.color}`}>
      {s.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority?: string }) {
  const p = PRIORITIES.find(pr => pr.key === priority)
  if (!p) return null
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.color}`}>{p.label}</span>
}

// Add/Edit Lead Modal
function LeadModal({
  lead,
  folders,
  onClose,
  onSaved,
}: {
  lead?: Lead | null
  folders: Folder[]
  onClose: () => void
  onSaved: (l: Lead) => void
}) {
  const [form, setForm] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    company: lead?.company || '',
    phone: lead?.phone || '',
    website: lead?.website || '',
    service: lead?.service || '',
    budget: lead?.budget?.toString() || '',
    source: lead?.source || '',
    priority: lead?.priority || 'medium',
    notes: lead?.notes || '',
    responsible: lead?.responsible || '',
    nextFollowUp: lead?.nextFollowUp ? lead.nextFollowUp.slice(0, 10) : '',
    stage: lead?.stage || 'novo',
    folderId: lead?.folderId || '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email) { toast.error('Nome e e-mail são obrigatórios'); return }
    setLoading(true)
    try {
      const payload: Partial<Lead> = {
        name: form.name,
        email: form.email,
        company: form.company || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        service: form.service || undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        source: form.source || undefined,
        priority: (form.priority as Lead['priority']) || undefined,
        notes: form.notes || undefined,
        responsible: form.responsible || undefined,
        nextFollowUp: form.nextFollowUp || undefined,
        stage: form.stage as Lead['stage'],
        folderId: form.folderId || undefined,
      }
      let saved: Lead
      if (lead) {
        saved = (await crmApi.updateLead(lead.id, payload)) as Lead
      } else {
        saved = (await crmApi.createLead(payload)) as Lead
      }
      toast.success(lead ? 'Lead atualizado!' : 'Lead criado!')
      onSaved(saved)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-50">{lead ? 'Editar Lead' : 'Novo Lead'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Nome *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Nome do lead" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">E-mail *</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} required type="email" placeholder="email@empresa.com" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Empresa</label>
              <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Nome da empresa" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Telefone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://empresa.com.br" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Orçamento (R$)</label>
              <input value={form.budget} onChange={e => set('budget', e.target.value)} type="number" min="0" placeholder="0,00" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Serviço</label>
              <select value={form.service} onChange={e => set('service', e.target.value)} className="w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-900">
                <option value="">Selecionar...</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Origem</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className="w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-900">
                <option value="">Selecionar...</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Prioridade</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className="w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-900">
                {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Estágio</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)} className="w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-900">
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Responsável</label>
              <input value={form.responsible} onChange={e => set('responsible', e.target.value)} placeholder="Nome do responsável" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Próximo Follow-up</label>
              <input value={form.nextFollowUp} onChange={e => set('nextFollowUp', e.target.value)} type="date" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            {folders.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Pasta</label>
                <select value={form.folderId} onChange={e => set('folderId', e.target.value)} className="w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-900">
                  <option value="">Sem pasta</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">Observações</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Anotações sobre o lead..." rows={3} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>
          </div>
        </form>
        <div className="p-5 border-t border-zinc-800 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-950 transition">Cancelar</button>
          <button onClick={handleSubmit as React.MouseEventHandler} disabled={loading} className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {lead ? 'Salvar' : 'Criar Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Lead Detail Panel
function LeadPanel({ lead, folders, onClose, onUpdated, onDeleted }: {
  lead: Lead
  folders: Folder[]
  onClose: () => void
  onUpdated: (l: Lead) => void
  onDeleted: (id: string) => void
}) {
  const [activityNote, setActivityNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deletingConfirm, setDeletingConfirm] = useState(false)
  const [updatingStage, setUpdatingStage] = useState(false)
  const [systemUsers, setSystemUsers] = useState<AppUser[]>([])
  const [updatingResponsible, setUpdatingResponsible] = useState(false)

  useEffect(() => {
    authApi.getUsers().then(r => setSystemUsers(r.users || [])).catch(() => {})
  }, [])

  const handleResponsibleChange = async (userId: string) => {
    const user = systemUsers.find(u => u.id === userId)
    const name = user ? (user.user_metadata?.name || user.email) : ''
    setUpdatingResponsible(true)
    try {
      const updated = await crmApi.updateLead(lead.id, { responsible: name, responsibleUserId: userId || undefined }) as Lead
      onUpdated(updated)
    } catch {
      toast.error('Erro ao atualizar responsável')
    } finally {
      setUpdatingResponsible(false)
    }
  }

  const handleAddNote = async () => {
    if (!activityNote.trim()) return
    setAddingNote(true)
    try {
      const updated = await crmApi.updateLead(lead.id, { activityNote }) as Lead
      onUpdated(updated)
      setActivityNote('')
      toast.success('Nota adicionada!')
    } catch {
      toast.error('Erro ao adicionar nota')
    } finally {
      setAddingNote(false)
    }
  }

  const handleStageChange = async (stage: Lead['stage']) => {
    setUpdatingStage(true)
    try {
      const updated = await crmApi.updateLead(lead.id, { stage }) as Lead
      onUpdated(updated)
      toast.success('Estágio atualizado!')
    } catch {
      toast.error('Erro ao atualizar estágio')
    } finally {
      setUpdatingStage(false)
    }
  }

  const handleDelete = async () => {
    try {
      await crmApi.deleteLead(lead.id)
      toast.success('Lead removido!')
      onDeleted(lead.id)
      onClose()
    } catch {
      toast.error('Erro ao remover lead')
    }
  }

  const folder = folders.find(f => f.id === lead.folderId)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-zinc-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-600 font-bold text-sm flex-shrink-0">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-50 truncate">{lead.name}</p>
              {lead.company && <p className="text-sm text-zinc-400 truncate">{lead.company}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><Edit2 size={16} /></button>
            <button onClick={() => setDeletingConfirm(true)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 size={16} /></button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Stage selector */}
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-2">ESTÁGIO</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(s => (
                <button
                  key={s.key}
                  onClick={() => handleStageChange(s.key)}
                  disabled={updatingStage}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${lead.stage === s.key ? `${s.bg} ${s.color} ring-2 ring-offset-1 ring-indigo-400` : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-slate-300'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Responsible user selector */}
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-2">RESPONSÁVEL</p>
            <div className="relative">
              <select
                value={(lead as any).responsibleUserId || ''}
                onChange={e => handleResponsibleChange(e.target.value)}
                disabled={updatingResponsible}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none disabled:opacity-60"
              >
                <option value="">— Nenhum —</option>
                {systemUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.user_metadata?.name || u.email}
                  </option>
                ))}
              </select>
              {updatingResponsible && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-2">
            {lead.email && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Mail size={14} className="text-zinc-500 flex-shrink-0" />
                <a href={`mailto:${lead.email}`} className="hover:text-emerald-500 truncate">{lead.email}</a>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Phone size={14} className="text-zinc-500 flex-shrink-0" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.website && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Globe size={14} className="text-zinc-500 flex-shrink-0" />
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500 truncate">{lead.website}</a>
              </div>
            )}
            {lead.service && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Tag size={14} className="text-zinc-500 flex-shrink-0" />
                <span>{lead.service}</span>
              </div>
            )}
            {lead.budget != null && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <DollarSign size={14} className="text-zinc-500 flex-shrink-0" />
                <span>{formatCurrency(lead.budget)}</span>
              </div>
            )}
            {lead.responsible && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <User size={14} className="text-zinc-500 flex-shrink-0" />
                <span>{lead.responsible}</span>
              </div>
            )}
            {lead.nextFollowUp && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Clock size={14} className="text-zinc-500 flex-shrink-0" />
                <span>Follow-up: {formatDate(lead.nextFollowUp)}</span>
              </div>
            )}
            {folder && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Folder size={14} className="text-zinc-500 flex-shrink-0" />
                <span>{folder.name}</span>
              </div>
            )}
            {lead.priority && (
              <div className="flex items-center gap-2.5 text-sm">
                <AlertCircle size={14} className="text-zinc-500 flex-shrink-0" />
                <PriorityBadge priority={lead.priority} />
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                <Building size={14} className="text-zinc-500 flex-shrink-0" />
                <span>Origem: {lead.source}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-zinc-400">
              <Calendar size={14} className="text-zinc-500 flex-shrink-0" />
              <span>Criado em {formatDate(lead.createdAt)}</span>
            </div>
          </div>

          {lead.notes && (
            <div className="bg-zinc-950 rounded-lg p-3">
              <p className="text-xs font-medium text-zinc-400 mb-1">OBSERVAÇÕES</p>
              <p className="text-sm text-zinc-100 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Activities */}
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-3">ATIVIDADES</p>
            {lead.activities && lead.activities.length > 0 ? (
              <div className="space-y-3 mb-3">
                {lead.activities.map(a => (
                  <div key={a.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 bg-zinc-950 rounded-lg p-3">
                      <p className="text-sm text-zinc-100 whitespace-pre-wrap">{a.note}</p>
                      <p className="text-xs text-zinc-500 mt-1">{formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 mb-3">Nenhuma atividade registrada</p>
            )}

            {/* Add note */}
            <div className="flex gap-2">
              <textarea
                value={activityNote}
                onChange={e => setActivityNote(e.target.value)}
                placeholder="Adicionar nota de atividade..."
                rows={2}
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !activityNote.trim()}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center"
              >
                {addingNote ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
              </button>
            </div>
          </div>
        </div>

        {deletingConfirm && (
          <div className="p-4 border-t border-red-100 bg-rose-500/10">
            <p className="text-sm text-rose-400 font-medium mb-3">Confirmar exclusão do lead?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeletingConfirm(false)} className="flex-1 px-3 py-1.5 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-950 transition">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 px-3 py-1.5 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition">Excluir</button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <LeadModal
          lead={lead}
          folders={folders}
          onClose={() => setEditing(false)}
          onSaved={onUpdated}
        />
      )}
    </>
  )
}

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showImportAI, setShowImportAI] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [newFolderName, setNewFolderName] = useState('')
  const [addingFolder, setAddingFolder] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      crmApi.getLeads().then(r => setLeads(r.leads)),
      crmApi.getFolders().then(r => setFolders(r.folders)),
    ])
      .catch(() => toast.error('Erro ao carregar CRM'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = leads.filter(l => {
    if (activeFolder && l.folderId !== activeFolder) return false
    if (search) {
      const q = search.toLowerCase()
      return l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || (l.company || '').toLowerCase().includes(q)
    }
    return true
  })

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: newFolderName.trim(),
      color: '#6366f1',
    }
    const updated = [...folders, newFolder]
    try {
      await crmApi.updateFolders(updated)
      setFolders(updated)
      setNewFolderName('')
      setAddingFolder(false)
      toast.success('Pasta criada!')
    } catch {
      toast.error('Erro ao criar pasta')
    }
  }

  const handleLeadSaved = (lead: Lead) => {
    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === lead.id)
      if (idx >= 0) { const copy = [...prev]; copy[idx] = lead; return copy }
      return [lead, ...prev]
    })
    setSelectedLead(lead)
  }

  const handleLeadDeleted = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Folders sidebar */}
      <aside className="hidden md:flex flex-col w-52 flex-shrink-0 border-r border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center justify-between px-2 mb-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pastas</p>
          <button onClick={() => { setAddingFolder(true); setTimeout(() => folderInputRef.current?.focus(), 50) }} className="p-1 rounded text-zinc-500 hover:text-emerald-500">
            <FolderPlus size={14} />
          </button>
        </div>
        <button
          onClick={() => setActiveFolder(null)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${!activeFolder ? 'bg-emerald-900/20 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-950'}`}
        >
          <Folder size={14} />
          <span>Todos os Leads</span>
          <span className="ml-auto text-xs text-zinc-500">{leads.length}</span>
        </button>
        {folders.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFolder(f.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${activeFolder === f.id ? 'bg-emerald-900/20 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-950'}`}
          >
            <Folder size={14} />
            <span className="truncate">{f.name}</span>
            <span className="ml-auto text-xs text-zinc-500">{leads.filter(l => l.folderId === f.id).length}</span>
          </button>
        ))}
        {addingFolder && (
          <div className="flex items-center gap-1 mt-1 px-2">
            <input
              ref={folderInputRef}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') setAddingFolder(false) }}
              placeholder="Nome da pasta"
              className="flex-1 px-2 py-1 border border-emerald-600 rounded text-xs focus:outline-none"
            />
            <button onClick={handleAddFolder} className="p-1 text-emerald-500 hover:text-emerald-400"><ChevronRight size={14} /></button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-zinc-50">CRM</h1>
            <p className="text-zinc-400 text-xs mt-0.5">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar leads..." className="pl-8 pr-3 py-2 border border-zinc-700 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="flex border border-zinc-700 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-2 text-xs font-medium transition ${viewMode === 'kanban' ? 'bg-emerald-600 text-white' : 'text-zinc-300 hover:bg-zinc-950'}`}>Kanban</button>
            <button onClick={() => setViewMode('table')} className={`px-3 py-2 text-xs font-medium transition ${viewMode === 'table' ? 'bg-emerald-600 text-white' : 'text-zinc-300 hover:bg-zinc-950'}`}>Tabela</button>
          </div>
          <button
            onClick={() => setShowImportAI(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-semibold rounded-lg hover:bg-zinc-700 transition shadow-sm"
          >
            <Sparkles size={15} className="text-emerald-400" />
            Importar com IA
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm">
            <Plus size={16} />Novo Lead
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex-1 overflow-x-auto p-5">
            <div className="flex gap-4 h-full min-w-max">
              {STAGES.map(stage => {
                const stageLeads = filtered.filter(l => l.stage === stage.key)
                return (
                  <div key={stage.key} className="w-64 flex-shrink-0 flex flex-col">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 ${stage.bg}`}>
                      <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                      <span className="ml-auto text-xs text-zinc-500 font-medium">{stageLeads.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2.5 pb-4">
                      {stageLeads.map(lead => (
                        <div
                          key={lead.id}
                          className="w-full text-left bg-zinc-900 rounded-xl border border-zinc-800 p-3.5 shadow-sm hover:shadow-md hover:border-emerald-700 transition-all duration-150"
                        >
                          <button className="w-full text-left" onClick={() => setSelectedLead(lead)}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold text-zinc-50 leading-tight">{lead.name}</p>
                              {lead.responsible && (
                                <div
                                  title={lead.responsible}
                                  className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-400 flex-shrink-0"
                                >
                                  {getInitials(lead.responsible)}
                                </div>
                              )}
                            </div>
                            {lead.company && <p className="text-xs text-zinc-500 mb-2">{lead.company}</p>}
                            <div className="flex items-center gap-2 flex-wrap">
                              {lead.priority && <PriorityBadge priority={lead.priority} />}
                              {lead.budget != null && <span className="text-xs text-zinc-400">{formatCurrency(lead.budget)}</span>}
                            </div>
                            {lead.nextFollowUp && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                                <Clock size={10} />
                                <span>{formatDate(lead.nextFollowUp)}</span>
                              </div>
                            )}
                          </button>
                          {whatsappUrl(lead.phone) && (
                            <a
                              href={whatsappUrl(lead.phone)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="mt-2.5 flex items-center gap-1.5 text-xs text-[#25D366] hover:text-green-300 transition font-medium"
                            >
                              <WhatsAppIcon size={12} />
                              Abrir WhatsApp
                            </a>
                          )}
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="text-center py-6 text-zinc-600 text-xs">Nenhum lead</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-5">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950">
                    <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Serviço</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Orçamento</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Estágio</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Prioridade</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="border-b border-slate-50 hover:bg-zinc-950 cursor-pointer transition"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-zinc-50">{lead.name}</p>
                          <p className="text-xs text-zinc-500">{lead.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{lead.company || '—'}</td>
                      <td className="px-4 py-3 text-zinc-300">{lead.service || '—'}</td>
                      <td className="px-4 py-3 text-zinc-300">{lead.budget != null ? formatCurrency(lead.budget) : '—'}</td>
                      <td className="px-4 py-3"><StageBadge stage={lead.stage} /></td>
                      <td className="px-4 py-3">{lead.priority ? <PriorityBadge priority={lead.priority} /> : '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{formatDate(lead.nextFollowUp)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-zinc-500 text-sm">Nenhum lead encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <LeadModal
          folders={folders}
          onClose={() => setShowAdd(false)}
          onSaved={handleLeadSaved}
        />
      )}

      {showImportAI && (
        <ImportAIModal
          folders={folders}
          onClose={() => setShowImportAI(false)}
          onImported={imported => {
            setLeads(prev => [...imported, ...prev])
            setShowImportAI(false)
          }}
        />
      )}

      {selectedLead && (
        <LeadPanel
          lead={selectedLead}
          folders={folders}
          onClose={() => setSelectedLead(null)}
          onUpdated={handleLeadSaved}
          onDeleted={handleLeadDeleted}
        />
      )}
    </div>
  )
}

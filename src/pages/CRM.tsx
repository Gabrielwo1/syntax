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
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { crmApi } from '../lib/api'
import type { Lead, Folder } from '../lib/api'

const STAGES: { key: Lead['stage']; label: string; color: string; bg: string }[] = [
  { key: 'novo', label: 'Novo', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  { key: 'contato', label: 'Contato', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  { key: 'proposta', label: 'Proposta', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  { key: 'negociacao', label: 'Negociação', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  { key: 'fechado', label: 'Fechado', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { key: 'perdido', label: 'Perdido', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
]

const PRIORITIES = [
  { key: 'low', label: 'Baixa', color: 'text-slate-500 bg-slate-100' },
  { key: 'medium', label: 'Média', color: 'text-amber-600 bg-amber-100' },
  { key: 'high', label: 'Alta', color: 'text-red-600 bg-red-100' },
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{lead ? 'Editar Lead' : 'Novo Lead'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Nome do lead" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">E-mail *</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} required type="email" placeholder="email@empresa.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Empresa</label>
              <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Nome da empresa" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://empresa.com.br" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Orçamento (R$)</label>
              <input value={form.budget} onChange={e => set('budget', e.target.value)} type="number" min="0" placeholder="0,00" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Serviço</label>
              <select value={form.service} onChange={e => set('service', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Selecionar...</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Origem</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Selecionar...</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estágio</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
              <input value={form.responsible} onChange={e => set('responsible', e.target.value)} placeholder="Nome do responsável" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Próximo Follow-up</label>
              <input value={form.nextFollowUp} onChange={e => set('nextFollowUp', e.target.value)} type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {folders.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pasta</label>
                <select value={form.folderId} onChange={e => set('folderId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">Sem pasta</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Anotações sobre o lead..." rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
          </div>
        </form>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">Cancelar</button>
          <button onClick={handleSubmit as React.MouseEventHandler} disabled={loading} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
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
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm flex-shrink-0">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{lead.name}</p>
              {lead.company && <p className="text-sm text-slate-500 truncate">{lead.company}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><Edit2 size={16} /></button>
            <button onClick={() => setDeletingConfirm(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Stage selector */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">ESTÁGIO</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(s => (
                <button
                  key={s.key}
                  onClick={() => handleStageChange(s.key)}
                  disabled={updatingStage}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${lead.stage === s.key ? `${s.bg} ${s.color} ring-2 ring-offset-1 ring-indigo-400` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-2">
            {lead.email && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Mail size={14} className="text-slate-400 flex-shrink-0" />
                <a href={`mailto:${lead.email}`} className="hover:text-indigo-600 truncate">{lead.email}</a>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400 flex-shrink-0" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.website && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Globe size={14} className="text-slate-400 flex-shrink-0" />
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 truncate">{lead.website}</a>
              </div>
            )}
            {lead.service && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Tag size={14} className="text-slate-400 flex-shrink-0" />
                <span>{lead.service}</span>
              </div>
            )}
            {lead.budget != null && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <DollarSign size={14} className="text-slate-400 flex-shrink-0" />
                <span>{formatCurrency(lead.budget)}</span>
              </div>
            )}
            {lead.responsible && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <User size={14} className="text-slate-400 flex-shrink-0" />
                <span>{lead.responsible}</span>
              </div>
            )}
            {lead.nextFollowUp && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Clock size={14} className="text-slate-400 flex-shrink-0" />
                <span>Follow-up: {formatDate(lead.nextFollowUp)}</span>
              </div>
            )}
            {folder && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Folder size={14} className="text-slate-400 flex-shrink-0" />
                <span>{folder.name}</span>
              </div>
            )}
            {lead.priority && (
              <div className="flex items-center gap-2.5 text-sm">
                <AlertCircle size={14} className="text-slate-400 flex-shrink-0" />
                <PriorityBadge priority={lead.priority} />
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <Building size={14} className="text-slate-400 flex-shrink-0" />
                <span>Origem: {lead.source}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-slate-500">
              <Calendar size={14} className="text-slate-400 flex-shrink-0" />
              <span>Criado em {formatDate(lead.createdAt)}</span>
            </div>
          </div>

          {lead.notes && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-500 mb-1">OBSERVAÇÕES</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Activities */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-3">ATIVIDADES</p>
            {lead.activities && lead.activities.length > 0 ? (
              <div className="space-y-3 mb-3">
                {lead.activities.map(a => (
                  <div key={a.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 bg-slate-50 rounded-lg p-3">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.note}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mb-3">Nenhuma atividade registrada</p>
            )}

            {/* Add note */}
            <div className="flex gap-2">
              <textarea
                value={activityNote}
                onChange={e => setActivityNote(e.target.value)}
                placeholder="Adicionar nota de atividade..."
                rows={2}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !activityNote.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center"
              >
                {addingNote ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
              </button>
            </div>
          </div>
        </div>

        {deletingConfirm && (
          <div className="p-4 border-t border-red-100 bg-red-50">
            <p className="text-sm text-red-700 font-medium mb-3">Confirmar exclusão do lead?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeletingConfirm(false)} className="flex-1 px-3 py-1.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-white transition">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition">Excluir</button>
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
      <aside className="hidden md:flex flex-col w-52 flex-shrink-0 border-r border-slate-100 bg-white p-3">
        <div className="flex items-center justify-between px-2 mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pastas</p>
          <button onClick={() => { setAddingFolder(true); setTimeout(() => folderInputRef.current?.focus(), 50) }} className="p-1 rounded text-slate-400 hover:text-indigo-600">
            <FolderPlus size={14} />
          </button>
        </div>
        <button
          onClick={() => setActiveFolder(null)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${!activeFolder ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Folder size={14} />
          <span>Todos os Leads</span>
          <span className="ml-auto text-xs text-slate-400">{leads.length}</span>
        </button>
        {folders.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFolder(f.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${activeFolder === f.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Folder size={14} />
            <span className="truncate">{f.name}</span>
            <span className="ml-auto text-xs text-slate-400">{leads.filter(l => l.folderId === f.id).length}</span>
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
              className="flex-1 px-2 py-1 border border-indigo-300 rounded text-xs focus:outline-none"
            />
            <button onClick={handleAddFolder} className="p-1 text-indigo-600 hover:text-indigo-700"><ChevronRight size={14} /></button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 bg-white flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-800">CRM</h1>
            <p className="text-slate-500 text-xs mt-0.5">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar leads..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-2 text-xs font-medium transition ${viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Kanban</button>
            <button onClick={() => setViewMode('table')} className={`px-3 py-2 text-xs font-medium transition ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Tabela</button>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm">
            <Plus size={16} />Novo Lead
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
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
                      <span className="ml-auto text-xs text-slate-400 font-medium">{stageLeads.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2.5 pb-4">
                      {stageLeads.map(lead => (
                        <button
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="w-full text-left bg-white rounded-xl border border-slate-100 p-3.5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-150"
                        >
                          <p className="text-sm font-semibold text-slate-800 mb-1">{lead.name}</p>
                          {lead.company && <p className="text-xs text-slate-400 mb-2">{lead.company}</p>}
                          <div className="flex items-center gap-2 flex-wrap">
                            {lead.priority && <PriorityBadge priority={lead.priority} />}
                            {lead.budget != null && <span className="text-xs text-slate-500">{formatCurrency(lead.budget)}</span>}
                          </div>
                          {lead.nextFollowUp && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                              <Clock size={10} />
                              <span>{formatDate(lead.nextFollowUp)}</span>
                            </div>
                          )}
                        </button>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="text-center py-6 text-slate-300 text-xs">Nenhum lead</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-5">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Serviço</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Orçamento</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Estágio</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Prioridade</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">{lead.name}</p>
                          <p className="text-xs text-slate-400">{lead.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{lead.company || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.service || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.budget != null ? formatCurrency(lead.budget) : '—'}</td>
                      <td className="px-4 py-3"><StageBadge stage={lead.stage} /></td>
                      <td className="px-4 py-3">{lead.priority ? <PriorityBadge priority={lead.priority} /> : '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(lead.nextFollowUp)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Nenhum lead encontrado</td></tr>
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

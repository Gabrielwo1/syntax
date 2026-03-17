import React, { useEffect, useState, useRef } from 'react'
import {
  Clock,
  CheckCircle2,
  Upload,
  Download,
  Calendar,
  LayoutGrid,
  CalendarDays,
  Plus,
  X,
  Loader2,
  FileImage,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { socialApi } from '../lib/api'
import type { ArtRequest, DeliveredArt } from '../lib/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d?: string) {
  if (!d) return '—'
  try { return format(parseISO(d), "dd 'de' MMM. 'de' yyyy", { locale: ptBR }) }
  catch { return d }
}

function isOverdue(deadline?: string) {
  if (!deadline) return false
  try { return isBefore(parseISO(deadline), startOfDay(new Date())) }
  catch { return false }
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Solicitado',
  em_andamento: 'Em Andamento',
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  em_andamento: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
}

interface DeliveredArtRow extends DeliveredArt {
  client?: string
  requestTitle?: string
}

// ─── Modal Base ───────────────────────────────────────────────────────────────

function ModalWrapper({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'} rounded-2xl border border-white/10 p-6`}
        style={{ backgroundColor: '#1c1c1c' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Nova Solicitação Modal ───────────────────────────────────────────────────

function NovaModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (r: ArtRequest) => void
}) {
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [deadline, setDeadline] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !client.trim()) { toast.error('Preencha título e cliente'); return }
    setLoading(true)
    try {
      const result = await socialApi.createRequest({
        client,
        format: title,
        deadline: deadline || undefined,
        description: description || undefined,
      }) as { request: ArtRequest }
      toast.success('Solicitação criada!')
      onCreated(result.request)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-white/10"
  const inputStyle = { backgroundColor: '#2a2a2a' }

  return (
    <ModalWrapper onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-semibold text-lg">Nova Solicitação</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Título *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Post de Lançamento"
            className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Cliente *</label>
          <input value={client} onChange={e => setClient(e.target.value)} placeholder="Nome do cliente"
            className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Data de Entrega</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Briefing</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="Descreva o que precisa ser feito..."
            className={`${inputClass} resize-none`} style={inputStyle} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/10 text-zinc-400 text-sm rounded-lg hover:bg-white/5 transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-70 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Criando...' : 'Criar Solicitação'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  )
}

// ─── Editar Modal ─────────────────────────────────────────────────────────────

function EditModal({ request, onClose, onUpdated }: {
  request: ArtRequest
  onClose: () => void
  onUpdated: (r: ArtRequest) => void
}) {
  const [title, setTitle] = useState(request.format)
  const [client, setClient] = useState(request.client)
  const [deadline, setDeadline] = useState(request.deadline?.split('T')[0] || '')
  const [description, setDescription] = useState(request.description || '')
  const [status, setStatus] = useState(request.status)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await socialApi.updateRequest(request.id, {
        client,
        format: title,
        deadline: deadline || undefined,
        description: description || undefined,
        status,
      })
      onUpdated({ ...request, client, format: title, deadline: deadline || undefined, description: description || undefined, status })
      toast.success('Solicitação atualizada!')
      onClose()
    } catch {
      toast.error('Erro ao atualizar')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-white/10"
  const inputStyle = { backgroundColor: '#2a2a2a' }

  return (
    <ModalWrapper onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-semibold text-lg">Editar Solicitação</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Cliente</label>
          <input value={client} onChange={e => setClient(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Data de Entrega</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as ArtRequest['status'])}
            className={inputClass} style={inputStyle}>
            <option value="pendente">Solicitado</option>
            <option value="em_andamento">Em Andamento</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Briefing</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className={`${inputClass} resize-none`} style={inputStyle} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/10 text-zinc-400 text-sm rounded-lg hover:bg-white/5 transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-70 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  )
}

// ─── Entregar Arte Modal (múltiplos arquivos) ─────────────────────────────────

function EntregarModal({ request, onClose, onDelivered }: {
  request: ArtRequest
  onClose: () => void
  onDelivered: (arts: DeliveredArtRow[]) => void
}) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const imgs = Array.from(incoming).filter(f => f.type.startsWith('image/'))
    if (imgs.length === 0) { toast.error('Apenas imagens são aceitas'); return }
    const newPreviews = imgs.map(f => URL.createObjectURL(f))
    setFiles(prev => [...prev, ...imgs])
    setPreviews(prev => [...prev, ...newPreviews])
  }

  const removeFile = (idx: number) => {
    URL.revokeObjectURL(previews[idx])
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) { toast.error('Selecione pelo menos um arquivo'); return }
    setLoading(true)
    try {
      const [uploadResults] = await Promise.all([
        Promise.all(files.map(f => socialApi.uploadArt(f, request.format) as Promise<{ art: DeliveredArt }>)),
        socialApi.updateRequest(request.id, { status: 'entregue' }),
      ])
      const arts: DeliveredArtRow[] = uploadResults.map(r => ({
        ...r.art,
        client: request.client,
        requestTitle: request.format,
      }))
      onDelivered(arts)
      toast.success(`${arts.length} arte${arts.length > 1 ? 's' : ''} entregue${arts.length > 1 ? 's' : ''} com sucesso!`)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao entregar arte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalWrapper onClose={onClose} wide>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-semibold text-lg">Entregar Arte</h2>
          <p className="text-zinc-500 text-sm mt-0.5">{request.format} · {request.client}</p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition"><X size={18} /></button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-xl p-6 text-center cursor-pointer transition"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />
          <Upload size={22} className="mx-auto text-zinc-600 mb-2" />
          <p className="text-sm text-zinc-400">Clique ou arraste para adicionar imagens</p>
          <p className="text-xs text-zinc-600 mt-1">PNG, JPG, WebP · Múltiplos arquivos aceitos</p>
        </div>

        {/* Selected files list */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {files.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] overflow-hidden"
                style={{ backgroundColor: '#252525' }}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 flex-shrink-0 overflow-hidden">
                  <img src={previews[idx]} alt={f.name} className="w-full h-full object-cover" />
                </div>
                {/* Name + size */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{f.name}</p>
                  <p className="text-xs text-zinc-600">{(f.size / 1024).toFixed(0)} KB</p>
                </div>
                {/* Remove */}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeFile(idx) }}
                  className="p-2 mr-1 text-zinc-600 hover:text-rose-400 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Count indicator */}
        {files.length > 0 && (
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <FileImage size={12} />
            {files.length} arquivo{files.length > 1 ? 's' : ''} selecionado{files.length > 1 ? 's' : ''}
          </p>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/10 text-zinc-400 text-sm rounded-lg hover:bg-white/5 transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading || files.length === 0}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-70 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><Upload size={14} /> Entregar {files.length > 1 ? `${files.length} Artes` : 'Arte'}</>}
          </button>
        </div>
      </form>
    </ModalWrapper>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const PT_DOW = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function CalendarView({ requests, delivered }: { requests: ArtRequest[]; delivered: DeliveredArtRow[] }) {
  const [curDate, setCurDate] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const pendingMap: Record<string, ArtRequest[]> = {}
  const deliveredMap: Record<string, DeliveredArtRow[]> = {}

  requests.forEach(r => {
    if (r.deadline) {
      const key = r.deadline.split('T')[0]
      if (!pendingMap[key]) pendingMap[key] = []
      pendingMap[key].push(r)
    }
  })
  delivered.forEach(a => {
    if (a.createdAt) {
      const key = a.createdAt.split('T')[0]
      if (!deliveredMap[key]) deliveredMap[key] = []
      deliveredMap[key].push(a)
    }
  })

  const year = curDate.getFullYear()
  const month = curDate.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = new Date().toISOString().split('T')[0]

  const selectedPending = selectedDay ? (pendingMap[selectedDay] || []) : []
  const selectedDelivered = selectedDay ? (deliveredMap[selectedDay] || []) : []

  const tableBg = { backgroundColor: '#1a1a1a' }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={tableBg}>
        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
          <button onClick={() => setCurDate(new Date(year, month - 1, 1))}
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-zinc-400"><ChevronLeft size={16} /></button>
          <span className="text-sm font-semibold text-white">{PT_MONTHS[month]} {year}</span>
          <button onClick={() => setCurDate(new Date(year, month + 1, 1))}
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-zinc-400"><ChevronRight size={16} /></button>
        </div>

        <div className="p-4">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {PT_DOW.map(d => (
              <div key={d} className="text-center text-xs font-medium text-zinc-600 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const hasPending = !!(pendingMap[key]?.length)
              const hasDelivered = !!(deliveredMap[key]?.length)
              const isToday = key === todayKey
              const isSel = key === selectedDay
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(p => p === key ? null : key)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition ${
                    isSel ? 'bg-emerald-600/20 border border-emerald-500/50' :
                    isToday ? 'bg-white/10 border border-white/20' :
                    'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className={isSel ? 'text-emerald-300 font-bold' : isToday ? 'text-white font-semibold' : 'text-zinc-300'}>
                    {day}
                  </span>
                  {(hasPending || hasDelivered) && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasPending && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                      {hasDelivered && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 px-6 py-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="text-xs text-zinc-500">Prazo pendente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs text-zinc-500">Arte entregue</span>
          </div>
        </div>
      </div>

      {/* Selected day details */}
      {selectedDay && (
        <div className="rounded-2xl border border-white/[0.07] p-5 space-y-4" style={tableBg}>
          <p className="text-sm font-semibold text-white">{formatDate(selectedDay)}</p>

          {selectedPending.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-2">Prazos Pendentes</p>
              <div className="space-y-2">
                {selectedPending.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <div>
                      <p className="text-sm text-white font-medium">{r.format}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{r.client}</p>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[r.status] ?? ''}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDelivered.length > 0 && (
            <div>
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide mb-2">Entregas Realizadas</p>
              <div className="space-y-2">
                {selectedDelivered.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-white font-medium">{a.requestTitle || a.title || '—'}</p>
                      {a.client && <p className="text-xs text-zinc-500 mt-0.5">{a.client}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedPending.length === 0 && selectedDelivered.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-4">Nenhum item para este dia</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Table components ─────────────────────────────────────────────────────────

const thCls = "text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap"
const tdCls = "px-5 py-4 align-middle"

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SocialMedia() {
  const [requests, setRequests] = useState<ArtRequest[]>([])
  const [deliveredArts, setDeliveredArts] = useState<DeliveredArtRow[]>([])
  const [loadingReq, setLoadingReq] = useState(true)
  const [loadingArts, setLoadingArts] = useState(true)
  const [artUrls, setArtUrls] = useState<Record<string, string>>({})

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [showNova, setShowNova] = useState(false)
  const [editingReq, setEditingReq] = useState<ArtRequest | null>(null)
  const [deliveringReq, setDeliveringReq] = useState<ArtRequest | null>(null)

  useEffect(() => {
    socialApi.listRequests()
      .then(r => setRequests(r.requests))
      .catch(() => toast.error('Erro ao carregar solicitações'))
      .finally(() => setLoadingReq(false))

    socialApi.listArts()
      .then(r => setDeliveredArts(r.arts))
      .catch(() => toast.error('Erro ao carregar artes'))
      .finally(() => setLoadingArts(false))
  }, [])

  // Load preview thumbnails for delivered arts
  useEffect(() => {
    deliveredArts.forEach(art => {
      if (!artUrls[art.id] && art.path) {
        socialApi.getArtUrl(art.path)
          .then(r => setArtUrls(prev => ({ ...prev, [art.id]: r.signedUrl })))
          .catch(() => {})
      }
    })
  }, [deliveredArts])

  const pendingRequests = requests.filter(r => r.status !== 'entregue')

  const handleDelivered = (arts: DeliveredArtRow[], requestId: string) => {
    setRequests(prev => prev.filter(r => r.id !== requestId))
    setDeliveredArts(prev => [...arts, ...prev])
  }

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Excluir esta solicitação?')) return
    try {
      await socialApi.deleteRequest(id)
      setRequests(prev => prev.filter(r => r.id !== id))
      toast.success('Solicitação excluída')
    } catch {
      toast.error('Erro ao excluir solicitação')
    }
  }

  const handleDownload = async (art: DeliveredArtRow) => {
    try {
      let url = artUrls[art.id]
      if (!url) {
        const result = await socialApi.getArtUrl(art.path)
        url = result.signedUrl
        setArtUrls(prev => ({ ...prev, [art.id]: url }))
      }
      const a = document.createElement('a')
      a.href = url
      a.download = art.requestTitle || art.title || 'arte'
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast.error('Erro ao baixar arte')
    }
  }

  const pageBg = { backgroundColor: '#0f0f0f' }
  const tableBg = { backgroundColor: '#1a1a1a' }
  const badgeBg = { backgroundColor: 'rgba(255,255,255,0.08)' }

  return (
    <div className="min-h-full text-white" style={pageBg}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Social Media</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Gerencie solicitações e entregas de artes</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${viewMode === 'list' ? 'text-white border-white/15 hover:bg-white/10' : 'text-zinc-500 border-white/5 hover:bg-white/5'}`}
              style={viewMode === 'list' ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
            >
              <LayoutGrid size={14} />
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${viewMode === 'calendar' ? 'text-white border-white/15 hover:bg-white/10' : 'text-zinc-500 border-white/5 hover:bg-white/5'}`}
              style={viewMode === 'calendar' ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
            >
              <CalendarDays size={14} />
              Calendário
            </button>
            <button
              onClick={() => setShowNova(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition"
            >
              <Plus size={14} />
              Nova Solicitação
            </button>
          </div>
        </div>

        {/* ── Calendar View ── */}
        {viewMode === 'calendar' && (
          <CalendarView requests={requests} delivered={deliveredArts} />
        )}

        {/* ── List View ── */}
        {viewMode === 'list' && <>

        {/* ── Artes Solicitadas ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-amber-500" />
            <h2 className="text-lg font-semibold">Artes Solicitadas</h2>
            {pendingRequests.length > 0 && (
              <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-medium">
                {pendingRequests.length}
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={tableBg}>
            {loadingReq ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 size={22} className="animate-spin text-zinc-600" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-14">
                <Clock size={30} className="mx-auto text-zinc-700 mb-3" />
                <p className="text-zinc-600 text-sm">Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <colgroup>
                  <col />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '190px' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className={thCls}>Título</th>
                    <th className={thCls}>Cliente</th>
                    <th className={thCls}>Data de Entrega</th>
                    <th className={thCls}>Status</th>
                    <th className={`${thCls} text-right`}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-white/[0.02] transition ${i < pendingRequests.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                    >
                      <td className={tdCls}>
                        <span className="font-semibold text-white">{r.format}</span>
                        {r.description && (
                          <p className="text-xs text-zinc-600 mt-0.5 truncate max-w-xs">{r.description}</p>
                        )}
                      </td>
                      <td className={tdCls}>
                        <span className="text-xs text-zinc-400 font-medium px-2.5 py-1 rounded uppercase tracking-wide"
                          style={badgeBg}>
                          {r.client}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <span className={`flex items-center gap-1.5 text-sm ${r.deadline && isOverdue(r.deadline) ? 'text-red-400' : 'text-zinc-400'}`}>
                          <Calendar size={13} />
                          {formatDate(r.deadline)}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <span className={`inline-flex items-center text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[r.status] ?? ''}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setEditingReq(r)}
                            className="text-zinc-500 hover:text-white text-sm font-medium transition px-1"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(r.id)}
                            className="p-1.5 text-zinc-600 hover:text-rose-400 transition rounded-lg hover:bg-rose-500/10"
                            title="Excluir solicitação"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeliveringReq(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition whitespace-nowrap"
                          >
                            <Upload size={12} />
                            Entregar Arte
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── Artes Entregues ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <h2 className="text-lg font-semibold">Artes Entregues</h2>
            {deliveredArts.length > 0 && (
              <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-medium">
                {deliveredArts.length}
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={tableBg}>
            {loadingArts ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 size={22} className="animate-spin text-zinc-600" />
              </div>
            ) : deliveredArts.length === 0 ? (
              <div className="text-center py-14">
                <CheckCircle2 size={30} className="mx-auto text-zinc-700 mb-3" />
                <p className="text-zinc-600 text-sm">Nenhuma arte entregue ainda</p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <colgroup>
                  <col style={{ width: '64px' }} />
                  <col />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '130px' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className={thCls}>Preview</th>
                    <th className={thCls}>Título</th>
                    <th className={thCls}>Cliente</th>
                    <th className={thCls}>Entregue em</th>
                    <th className={`${thCls} text-right`}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveredArts.map((art, i) => (
                    <tr
                      key={art.id}
                      className={`hover:bg-white/[0.02] transition ${i < deliveredArts.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                    >
                      <td className={tdCls}>
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          {artUrls[art.id] ? (
                            <img src={artUrls[art.id]} alt={art.title || 'Arte'} className="w-full h-full object-cover" />
                          ) : (
                            <Loader2 size={14} className="animate-spin text-zinc-600" />
                          )}
                        </div>
                      </td>
                      <td className={tdCls}>
                        <span className="font-semibold text-white">
                          {art.requestTitle || art.title || '—'}
                        </span>
                      </td>
                      <td className={tdCls}>
                        {art.client ? (
                          <span className="text-xs text-zinc-400 font-medium px-2.5 py-1 rounded uppercase tracking-wide"
                            style={badgeBg}>
                            {art.client}
                          </span>
                        ) : <span className="text-zinc-600 text-sm">—</span>}
                      </td>
                      <td className={tdCls}>
                        <span className="text-zinc-400">{formatDate(art.createdAt)}</span>
                      </td>
                      <td className={tdCls}>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleDownload(art)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-300 text-xs font-medium rounded-lg transition border border-white/10 hover:bg-white/10 whitespace-nowrap"
                            style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                          >
                            <Download size={12} />
                            Baixar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        </>}

      </div>

      {/* ── Modals ── */}
      {showNova && (
        <NovaModal
          onClose={() => setShowNova(false)}
          onCreated={r => setRequests(prev => [r, ...prev])}
        />
      )}

      {editingReq && (
        <EditModal
          request={editingReq}
          onClose={() => setEditingReq(null)}
          onUpdated={updated => {
            setRequests(prev => prev.map(x => x.id === updated.id ? updated : x))
            setEditingReq(null)
          }}
        />
      )}

      {deliveringReq && (
        <EntregarModal
          request={deliveringReq}
          onClose={() => setDeliveringReq(null)}
          onDelivered={arts => {
            handleDelivered(arts, deliveringReq.id)
            setDeliveringReq(null)
          }}
        />
      )}
    </div>
  )
}

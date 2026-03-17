import React, { useEffect, useState, useRef } from 'react'
import {
  Plus,
  Upload,
  X,
  Loader2,
  Trash2,
  ImageOff,
  Share2,
  Clock,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { socialApi } from '../lib/api'
import type { ArtRequest, DeliveredArt } from '../lib/api'

function formatDate(d?: string) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) } catch { return d }
}

const FORMATS = ['Post Feed', 'Story', 'Reels', 'Carrossel', 'Capa', 'Banner', 'Outro']

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  entregue: 'Entregue',
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  entregue: 'bg-emerald-100 text-emerald-700',
}

// ─── Art Request Form ────────────────────────────────────────────────────────

function RequestForm({ onCreated }: { onCreated: (r: ArtRequest) => void }) {
  const [open, setOpen] = useState(false)
  const [client, setClient] = useState('')
  const [format, setFormat] = useState('Post Feed')
  const [deadline, setDeadline] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client.trim()) { toast.error('Informe o cliente'); return }
    setLoading(true)
    try {
      const result = await socialApi.createRequest({ client, format, deadline: deadline || undefined, description: description || undefined }) as { request: ArtRequest }
      toast.success('Solicitação criada!')
      onCreated(result.request)
      setClient(''); setFormat('Post Feed'); setDeadline(''); setDescription('')
      setOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar solicitação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Plus size={16} className="text-indigo-600" />
          </div>
          <span className="font-semibold text-slate-800 text-sm">Nova Solicitação de Arte</span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cliente / Marca *</label>
              <input
                value={client}
                onChange={e => setClient(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Formato</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {FORMATS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prazo</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Briefing / Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o que precisa ser feito..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Send size={14} />Enviar Solicitação</>}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Request Card ────────────────────────────────────────────────────────────

function RequestCard({
  request,
  onStatusChange,
  onDelete,
}: {
  request: ArtRequest
  onStatusChange: (id: string, status: ArtRequest['status']) => void
  onDelete: (id: string) => void
}) {
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleStatus = async (status: ArtRequest['status']) => {
    setUpdating(true)
    try {
      await socialApi.updateRequest(request.id, { status })
      onStatusChange(request.id, status)
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await socialApi.deleteRequest(request.id)
      onDelete(request.id)
      toast.success('Solicitação removida')
    } catch {
      toast.error('Erro ao remover solicitação')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 text-sm truncate">{request.client}</p>
          <p className="text-xs text-slate-500 mt-0.5">{request.format}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[request.status]}`}>
            {STATUS_LABELS[request.status]}
          </span>
          {confirmDelete ? (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition disabled:opacity-70"
              >
                {deleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="p-1 border border-slate-200 text-slate-500 rounded text-xs">
                <X size={10} />
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition ml-1">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {request.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{request.description}</p>
      )}

      <div className="flex items-center justify-between">
        {request.deadline ? (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={11} />
            <span>{formatDate(request.deadline)}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-300">Sem prazo</span>
        )}

        {request.status !== 'entregue' && (
          <button
            disabled={updating}
            onClick={() => handleStatus(request.status === 'pendente' ? 'em_andamento' : 'entregue')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition disabled:opacity-70"
          >
            {updating ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            {request.status === 'pendente' ? 'Iniciar' : 'Entregar'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Delivery Upload ─────────────────────────────────────────────────────────

function DeliveryUpload({ onUploaded }: { onUploaded: (art: DeliveredArt) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error('Apenas imagens são aceitas'); return }
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error('Selecione uma imagem'); return }
    setLoading(true)
    try {
      const result = await socialApi.uploadArt(file, title || undefined) as { art: DeliveredArt }
      toast.success('Arte entregue!')
      onUploaded(result.art)
      setFile(null); setTitle('')
      if (preview) { URL.revokeObjectURL(preview); setPreview(null) }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar arte')
    } finally {
      setLoading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    if (preview) { URL.revokeObjectURL(preview); setPreview(null) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Upload size={16} className="text-emerald-600" />
        </div>
        <h3 className="font-semibold text-slate-800 text-sm">Entrega de Arte</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Drop zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl overflow-hidden transition ${
            preview ? 'border-emerald-300 cursor-default' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 cursor-pointer'
          }`}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-44 object-cover" />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); clearFile() }}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
              >
                <X size={13} />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                {file?.name}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <Upload size={24} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">Clique ou arraste a arte</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP</p>
            </div>
          )}
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título da arte (opcional)"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" />Enviando...</> : <><Upload size={14} />Entregar Arte</>}
        </button>
      </form>
    </div>
  )
}

// ─── Delivered Art Card ──────────────────────────────────────────────────────

function ArtCard({ art, onDelete }: { art: DeliveredArt; onDelete: (id: string) => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    socialApi.getArtUrl(art.path)
      .then(r => setUrl(r.signedUrl))
      .catch(() => setImgError(true))
  }, [art.path])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await socialApi.deleteArt(art.id)
      onDelete(art.id)
      toast.success('Arte removida')
    } catch {
      toast.error('Erro ao remover arte')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden group">
        <div
          className="relative h-40 bg-slate-100 overflow-hidden cursor-pointer"
          onClick={() => url && setLightbox(true)}
        >
          {url && !imgError ? (
            <>
              <img
                src={url}
                alt={art.title || 'Arte'}
                onLoad={() => setLoaded(true)}
                onError={() => setImgError(true)}
                className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              />
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              )}
            </>
          ) : imgError ? (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff size={24} className="text-slate-400" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <ExternalLink size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {/* Delete button */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={e => { e.stopPropagation(); handleDelete() }}
                  disabled={deleting}
                  className="p-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-70"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
                  className="p-1 bg-white/80 text-slate-700 rounded-lg hover:bg-white transition"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                className="p-1.5 bg-white/80 text-slate-600 rounded-lg hover:bg-white hover:text-red-500 transition"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="p-3">
          {art.title && <p className="text-sm font-medium text-slate-700 truncate mb-1">{art.title}</p>}
          <p className="text-xs text-slate-400">{formatDate(art.createdAt)}</p>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2"><X size={24} /></button>
          <img
            src={url}
            alt={art.title || 'Arte'}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SocialMedia() {
  const [requests, setRequests] = useState<ArtRequest[]>([])
  const [arts, setArts] = useState<DeliveredArt[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loadingArts, setLoadingArts] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  useEffect(() => {
    socialApi.listRequests()
      .then(r => setRequests(r.requests))
      .catch(() => toast.error('Erro ao carregar solicitações'))
      .finally(() => setLoadingRequests(false))

    socialApi.listArts()
      .then(r => setArts(r.arts))
      .catch(() => toast.error('Erro ao carregar artes entregues'))
      .finally(() => setLoadingArts(false))
  }, [])

  const filteredRequests = statusFilter === 'todos'
    ? requests
    : requests.filter(r => r.status === statusFilter)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm">
          <Share2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Social Media</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie solicitações e entregas de arte</p>
        </div>
      </div>

      {/* Top grid: request form + delivery upload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RequestForm onCreated={r => setRequests(prev => [r, ...prev])} />
        </div>
        <div>
          <DeliveryUpload onUploaded={art => setArts(prev => [art, ...prev])} />
        </div>
      </div>

      {/* Requests list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Solicitações de Arte</h2>
            <p className="text-xs text-slate-500 mt-0.5">{requests.length} solicitaç{requests.length !== 1 ? 'ões' : 'ão'}</p>
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            {['todos', 'pendente', 'em_andamento', 'entregue'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                {s === 'todos' ? 'Todos' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {loadingRequests ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-indigo-600" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <Share2 size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma solicitação</p>
            <p className="text-slate-400 text-sm mt-1">
              {statusFilter !== 'todos' ? 'Tente outro filtro' : 'Crie a primeira solicitação de arte acima'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRequests.map(r => (
              <RequestCard
                key={r.id}
                request={r}
                onStatusChange={(id, status) =>
                  setRequests(prev => prev.map(x => x.id === id ? { ...x, status } : x))
                }
                onDelete={id => setRequests(prev => prev.filter(x => x.id !== id))}
              />
            ))}
          </div>
        )}
      </section>

      {/* Delivered Arts */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">Artes Entregues</h2>
          <p className="text-xs text-slate-500 mt-0.5">{arts.length} arte{arts.length !== 1 ? 's' : ''}</p>
        </div>

        {loadingArts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-indigo-600" />
          </div>
        ) : arts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <Upload size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma arte entregue</p>
            <p className="text-slate-400 text-sm mt-1">Use o painel de entrega acima para enviar artes</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {arts.map(art => (
              <ArtCard
                key={art.id}
                art={art}
                onDelete={id => setArts(prev => prev.filter(a => a.id !== id))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

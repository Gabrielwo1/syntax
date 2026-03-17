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

function ModalWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 p-6"
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

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-white/10"
  const inputStyle = { backgroundColor: '#2a2a2a' }

  return (
    <ModalWrapper onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-semibold text-lg">Nova Solicitação</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Título *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Post de Lançamento"
            className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Cliente *</label>
          <input value={client} onChange={e => setClient(e.target.value)} placeholder="Nome do cliente"
            className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Data de Entrega</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Briefing</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="Descreva o que precisa ser feito..."
            className={`${inputClass} resize-none`} style={inputStyle} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/10 text-slate-400 text-sm rounded-lg hover:bg-white/5 transition">
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

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-white/10"
  const inputStyle = { backgroundColor: '#2a2a2a' }

  return (
    <ModalWrapper onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-semibold text-lg">Editar Solicitação</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Cliente</label>
          <input value={client} onChange={e => setClient(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Data de Entrega</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as ArtRequest['status'])}
            className={inputClass} style={inputStyle}>
            <option value="pendente">Solicitado</option>
            <option value="em_andamento">Em Andamento</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Briefing</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className={`${inputClass} resize-none`} style={inputStyle} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/10 text-slate-400 text-sm rounded-lg hover:bg-white/5 transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-70 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  )
}

// ─── Entregar Arte Modal ──────────────────────────────────────────────────────

function EntregarModal({ request, onClose, onDelivered }: {
  request: ArtRequest
  onClose: () => void
  onDelivered: (art: DeliveredArtRow) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error('Apenas imagens são aceitas'); return }
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
  }

  const clearFile = () => {
    setFile(null)
    if (preview) { URL.revokeObjectURL(preview); setPreview(null) }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error('Selecione o arquivo da arte'); return }
    setLoading(true)
    try {
      const [artResult] = await Promise.all([
        socialApi.uploadArt(file, request.format) as Promise<{ art: DeliveredArt }>,
        socialApi.updateRequest(request.id, { status: 'entregue' }),
      ])
      const art = artResult.art
      onDelivered({ ...art, client: request.client, requestTitle: request.format })
      toast.success('Arte entregue com sucesso!')
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao entregar arte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalWrapper onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-semibold text-lg">Entregar Arte</h2>
          <p className="text-slate-500 text-sm mt-0.5">{request.format} · {request.client}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => !file && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl overflow-hidden transition cursor-pointer ${
            preview ? 'border-emerald-500/40 cursor-default' : 'border-white/10 hover:border-white/25'
          }`}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-44 object-cover" />
              <button type="button" onClick={e => { e.stopPropagation(); clearFile() }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition">
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Upload size={24} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">Clique ou arraste a arte</p>
              <p className="text-xs text-slate-600 mt-1">PNG, JPG, WebP</p>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/10 text-slate-400 text-sm rounded-lg hover:bg-white/5 transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading || !file}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-70 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><Upload size={14} /> Entregar Arte</>}
          </button>
        </div>
      </form>
    </ModalWrapper>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SocialMedia() {
  const [requests, setRequests] = useState<ArtRequest[]>([])
  const [deliveredArts, setDeliveredArts] = useState<DeliveredArtRow[]>([])
  const [loadingReq, setLoadingReq] = useState(true)
  const [loadingArts, setLoadingArts] = useState(true)
  const [artUrls, setArtUrls] = useState<Record<string, string>>({})

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

  const handleDelivered = (art: DeliveredArtRow, requestId: string) => {
    setRequests(prev => prev.filter(r => r.id !== requestId))
    setDeliveredArts(prev => [art, ...prev])
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
            <p className="text-slate-500 text-sm mt-0.5">Gerencie solicitações e entregas de artes</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white border border-white/15 transition hover:bg-white/10"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <LayoutGrid size={14} />
              Lista
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 border border-white/10 transition hover:bg-white/5">
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

        {/* ── Artes Solicitadas ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-amber-500" />
            <h2 className="text-lg font-semibold">Artes Solicitadas</h2>
          </div>

          <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={tableBg}>
            {/* Header row */}
            <div className="grid gap-4 px-6 py-3 border-b border-white/[0.07] text-xs text-slate-500 font-medium tracking-wide"
              style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr auto' }}>
              <span>Título</span>
              <span>Cliente</span>
              <span>Data de Entrega</span>
              <span>Status</span>
              <span className="text-right">Ações</span>
            </div>

            {loadingReq ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 size={22} className="animate-spin text-slate-600" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-14">
                <Clock size={30} className="mx-auto text-slate-700 mb-3" />
                <p className="text-slate-600 text-sm">Nenhuma solicitação pendente</p>
              </div>
            ) : (
              pendingRequests.map((r, i) => (
                <div
                  key={r.id}
                  className={`grid gap-4 items-center px-6 py-4 transition hover:bg-white/[0.02] ${
                    i < pendingRequests.length - 1 ? 'border-b border-white/[0.05]' : ''
                  }`}
                  style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr auto' }}
                >
                  <span className="font-semibold text-sm text-white truncate">{r.format}</span>

                  <span>
                    <span className="text-xs text-slate-400 font-medium px-2.5 py-1 rounded uppercase tracking-wide"
                      style={badgeBg}>
                      {r.client}
                    </span>
                  </span>

                  <span className={`flex items-center gap-1.5 text-sm ${r.deadline && isOverdue(r.deadline) ? 'text-red-400' : 'text-slate-400'}`}>
                    <Calendar size={13} />
                    {formatDate(r.deadline)}
                  </span>

                  <span>
                    <span className={`inline-flex items-center text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[r.status] ?? ''}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </span>

                  <div className="flex items-center gap-2 justify-end whitespace-nowrap">
                    <button
                      onClick={() => setEditingReq(r)}
                      className="text-slate-500 hover:text-white text-sm font-medium transition px-1"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeliveringReq(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition"
                    >
                      <Upload size={12} />
                      Entregar Arte
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Artes Entregues ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <h2 className="text-lg font-semibold">Artes Entregues</h2>
          </div>

          <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={tableBg}>
            {/* Header row */}
            <div className="grid gap-4 px-6 py-3 border-b border-white/[0.07] text-xs text-slate-500 font-medium tracking-wide"
              style={{ gridTemplateColumns: '56px 2fr 1.5fr 1.5fr auto' }}>
              <span>Preview</span>
              <span>Título</span>
              <span>Cliente</span>
              <span>Data de Entrega</span>
              <span className="text-right">Ação</span>
            </div>

            {loadingArts ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 size={22} className="animate-spin text-slate-600" />
              </div>
            ) : deliveredArts.length === 0 ? (
              <div className="text-center py-14">
                <CheckCircle2 size={30} className="mx-auto text-slate-700 mb-3" />
                <p className="text-slate-600 text-sm">Nenhuma arte entregue ainda</p>
              </div>
            ) : (
              deliveredArts.map((art, i) => (
                <div
                  key={art.id}
                  className={`grid gap-4 items-center px-6 py-4 transition hover:bg-white/[0.02] ${
                    i < deliveredArts.length - 1 ? 'border-b border-white/[0.05]' : ''
                  }`}
                  style={{ gridTemplateColumns: '56px 2fr 1.5fr 1.5fr auto' }}
                >
                  {/* Preview */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    {artUrls[art.id] ? (
                      <img src={artUrls[art.id]} alt={art.title || 'Arte'} className="w-full h-full object-cover" />
                    ) : (
                      <Loader2 size={14} className="animate-spin text-slate-600" />
                    )}
                  </div>

                  <span className="font-semibold text-sm text-white truncate">
                    {art.requestTitle || art.title || '—'}
                  </span>

                  <span>
                    {art.client ? (
                      <span className="text-xs text-slate-400 font-medium px-2.5 py-1 rounded uppercase tracking-wide"
                        style={badgeBg}>
                        {art.client}
                      </span>
                    ) : <span className="text-slate-600 text-sm">—</span>}
                  </span>

                  <span className="text-slate-400 text-sm">{formatDate(art.createdAt)}</span>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDownload(art)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 text-xs font-medium rounded-lg transition border border-white/10 hover:bg-white/10"
                      style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                    >
                      <Download size={12} />
                      Baixar Arte
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

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
          onDelivered={art => {
            handleDelivered(art, deliveringReq.id)
            setDeliveringReq(null)
          }}
        />
      )}
    </div>
  )
}

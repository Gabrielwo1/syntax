import React, { useEffect, useState, useRef } from 'react'
import {
  Plus,
  Image,
  Trash2,
  Loader2,
  Upload,
  X,
  Search,
  Tag,
  ExternalLink,
  ImageOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { repoApi } from '../lib/api'
import type { RepoItem } from '../lib/api'

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR }) } catch { return dateStr }
}

function UploadModal({ onClose, onUploaded }: {
  onClose: () => void
  onUploaded: (item: RepoItem) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Apenas imagens são aceitas'); return }
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Apenas imagens são aceitas'); return }
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error('Selecione uma imagem'); return }
    setLoading(true)
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    try {
      const result = await repoApi.upload(file, title || undefined, tags.length > 0 ? tags : undefined) as { item?: RepoItem } & RepoItem
      const created = (result as { item: RepoItem }).item || result as RepoItem
      toast.success('Imagem enviada!')
      onUploaded(created)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar imagem')
    } finally {
      setLoading(false)
      if (preview) URL.revokeObjectURL(preview)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-50">Enviar Imagem</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl overflow-hidden transition ${preview ? 'border-emerald-600 cursor-default' : 'border-zinc-700 hover:border-emerald-600 hover:bg-zinc-950 cursor-pointer'}`}
          >
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Upload size={28} className="mx-auto text-zinc-500 mb-2" />
                <p className="text-sm font-medium text-zinc-300">Clique ou arraste uma imagem</p>
                <p className="text-xs text-zinc-500 mt-1">PNG, JPG, GIF, WebP</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Título</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da imagem (opcional)" className="w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Tags</label>
            <div className="relative">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="instagram, feed, stories (separadas por vírgula)" className="w-full pl-8 pr-3 py-2 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-950 transition">Cancelar</button>
            <button type="submit" disabled={loading || !file} className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" />Enviando...</> : <><Upload size={14} />Enviar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ImageViewModal({ item, onClose, onDeleted }: {
  item: RepoItem
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    repoApi.getAttachmentUrl(item.path)
      .then(r => setUrl(r.signedUrl))
      .catch(() => toast.error('Erro ao carregar imagem'))
      .finally(() => setLoading(false))
  }, [item.path])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await repoApi.delete(item.id)
      toast.success('Imagem excluída!')
      onDeleted(item.id)
      onClose()
    } catch {
      toast.error('Erro ao excluir imagem')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="min-w-0">
            <p className="font-semibold text-zinc-50 truncate">{item.title || 'Imagem'}</p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-emerald-900/20 text-emerald-500 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-500 hover:bg-emerald-900/20 transition">
                <ExternalLink size={16} />
              </a>
            )}
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={handleDelete} disabled={deleting} className="px-2 py-1 bg-rose-500/100 text-white text-xs font-medium rounded-lg hover:bg-rose-600 transition disabled:opacity-70">
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : 'Excluir'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 border border-zinc-700 text-zinc-300 text-xs rounded-lg">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X size={18} /></button>
          </div>
        </div>
        <div className="bg-slate-900 flex items-center justify-center min-h-64">
          {loading ? (
            <Loader2 size={28} className="animate-spin text-zinc-500" />
          ) : url ? (
            <img src={url} alt={item.title || 'Imagem'} className="max-w-full max-h-96 object-contain" />
          ) : (
            <div className="text-zinc-400 text-sm">Erro ao carregar imagem</div>
          )}
        </div>
        <div className="p-4 text-xs text-zinc-500 flex items-center gap-3">
          <span>Enviado em {formatDate(item.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

// Image card with lazy signed URL loading
function ImageCard({ item, onClick }: { item: RepoItem; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    repoApi.getAttachmentUrl(item.path)
      .then(r => setUrl(r.signedUrl))
      .catch(() => setImgError(true))
  }, [item.path])

  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm hover:shadow-md hover:border-emerald-700 transition-all duration-150 overflow-hidden cursor-pointer group"
    >
      <div className="relative h-40 bg-zinc-800 overflow-hidden">
        {url && !imgError ? (
          <>
            <img
              src={url}
              alt={item.title || 'Imagem'}
              onLoad={() => setLoaded(true)}
              onError={() => setImgError(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 group-hover:scale-105 transform transition-transform ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-zinc-500" />
              </div>
            )}
          </>
        ) : imgError ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff size={24} className="text-zinc-500" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-zinc-500" />
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/20 transition-all flex items-center justify-center">
          <ExternalLink size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="p-3">
        {item.title && <p className="text-sm font-medium text-zinc-100 truncate mb-1">{item.title}</p>}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-emerald-900/20 text-emerald-500 rounded-full">{tag}</span>
            ))}
            {item.tags.length > 3 && <span className="text-xs text-zinc-500">+{item.tags.length - 3}</span>}
          </div>
        )}
        <p className="text-xs text-zinc-500">{formatDate(item.createdAt)}</p>
      </div>
    </div>
  )
}

export default function Repository() {
  const [items, setItems] = useState<RepoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [viewItem, setViewItem] = useState<RepoItem | null>(null)
  const [search, setSearch] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    repoApi.list()
      .then(r => setItems(r.items))
      .catch(() => toast.error('Erro ao carregar repositório'))
      .finally(() => setLoading(false))
  }, [])

  const allTags = Array.from(new Set(items.flatMap(i => i.tags || [])))

  const filtered = items.filter(item => {
    if (!search) return true
    const q = search.toLowerCase()
    return (item.title || '').toLowerCase().includes(q) ||
      (item.tags || []).some(t => t.toLowerCase().includes(q))
  })

  // Build tag groups — items without tags go to "(Sem tag)"
  const tagGroups: { tag: string; items: RepoItem[] }[] = []
  const tagOrder = [...allTags]
  tagOrder.forEach(tag => {
    const groupItems = filtered.filter(i => (i.tags || []).includes(tag))
    if (groupItems.length > 0) tagGroups.push({ tag, items: groupItems })
  })
  const untagged = filtered.filter(i => !i.tags || i.tags.length === 0)
  if (untagged.length > 0) tagGroups.push({ tag: '(Sem tag)', items: untagged })

  const toggleGroup = (tag: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  // If no tags at all, show flat grid
  const useGroups = allTags.length > 0

  return (
    <div className="min-h-full bg-zinc-950 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Repositório</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{items.length} imagem{items.length !== 1 ? 'ns' : ''} · {allTags.length} categoria{allTags.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm"
        >
          <Plus size={16} />
          Enviar Imagem
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar imagens ou tags..."
            className="w-full pl-9 pr-4 py-2.5 border border-zinc-700 rounded-xl text-sm bg-zinc-900 text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Image size={40} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400 font-medium">Nenhuma imagem encontrada</p>
          <p className="text-zinc-500 text-sm mt-1">
            {search ? 'Tente outros termos' : 'Envie sua primeira imagem ao repositório'}
          </p>
          {!search && (
            <button onClick={() => setShowUpload(true)} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
              Enviar Imagem
            </button>
          )}
        </div>
      ) : useGroups ? (
        // Grouped by tag
        <div className="space-y-8">
          {tagGroups.map(group => {
            const collapsed = collapsedGroups.has(group.tag)
            return (
              <section key={group.tag}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.tag)}
                  className="flex items-center gap-3 w-full mb-4 group"
                >
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-emerald-500" />
                    <span className="text-sm font-semibold text-zinc-200 capitalize">{group.tag}</span>
                    <span className="text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition">
                    {collapsed ? '▶ Expandir' : '▼ Recolher'}
                  </span>
                </button>

                {!collapsed && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {group.items.map(item => (
                      <ImageCard
                        key={item.id}
                        item={item}
                        onClick={() => setViewItem(item)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        // Flat grid (no tags)
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(item => (
            <ImageCard
              key={item.id}
              item={item}
              onClick={() => setViewItem(item)}
            />
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={item => setItems(prev => [item, ...prev])}
        />
      )}

      {viewItem && (
        <ImageViewModal
          item={viewItem}
          onClose={() => setViewItem(null)}
          onDeleted={id => {
            setItems(prev => prev.filter(i => i.id !== id))
          }}
        />
      )}
    </div>
  )
}

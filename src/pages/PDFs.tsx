import React, { useEffect, useState, useRef } from 'react'
import {
  Plus,
  FileText,
  ExternalLink,
  Trash2,
  Loader2,
  Upload,
  X,
  Search,
  File,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { pdfsApi } from '../lib/api'
import type { PDF } from '../lib/api'

function formatBytes(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR }) } catch { return dateStr }
}

function UploadModal({ onClose, onUploaded }: {
  onClose: () => void
  onUploaded: (pdf: PDF) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') { toast.error('Apenas arquivos PDF são aceitos'); return }
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    if (f.type !== 'application/pdf') { toast.error('Apenas arquivos PDF são aceitos'); return }
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error('Selecione um arquivo PDF'); return }
    if (!title.trim()) { toast.error('Informe um título'); return }
    setLoading(true)
    try {
      const result = await pdfsApi.upload(file, title.trim()) as { pdf?: PDF } & PDF
      const created = (result as { pdf: PDF }).pdf || result as PDF
      toast.success('PDF enviado!')
      onUploaded(created)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Enviar PDF</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${file ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
          >
            <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={28} className="text-indigo-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                </div>
              </div>
            ) : (
              <div>
                <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">Clique ou arraste um PDF aqui</p>
                <p className="text-xs text-slate-400 mt-1">Somente arquivos .pdf</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Título do documento" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">Cancelar</button>
            <button type="submit" disabled={loading || !file} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" />Enviando...</> : <><Upload size={14} />Enviar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PDFs() {
  const [pdfs, setPdfs] = useState<PDF[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch] = useState('')
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    pdfsApi.list()
      .then(r => setPdfs(r.pdfs))
      .catch(() => toast.error('Erro ao carregar PDFs'))
      .finally(() => setLoading(false))
  }, [])

  const handleOpen = async (id: string) => {
    setOpeningId(id)
    try {
      const { url } = await pdfsApi.getUrl(id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Erro ao abrir PDF')
    } finally {
      setOpeningId(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await pdfsApi.delete(id)
      setPdfs(prev => prev.filter(p => p.id !== id))
      setDeletingId(null)
      toast.success('PDF excluído!')
    } catch {
      toast.error('Erro ao excluir PDF')
    }
  }

  const filtered = pdfs.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.fileName || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">PDFs</h1>
          <p className="text-slate-500 text-sm mt-0.5">{pdfs.length} documento{pdfs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus size={16} />
          Enviar PDF
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar documentos..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <File size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum PDF encontrado</p>
          <p className="text-slate-400 text-sm mt-1">
            {search ? 'Tente outros termos de busca' : 'Envie seu primeiro documento PDF'}
          </p>
          {!search && (
            <button onClick={() => setShowUpload(true)} className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
              Enviar PDF
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(pdf => (
            <div key={pdf.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-150 overflow-hidden group">
              {/* Preview area */}
              <div className="h-32 bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center">
                <FileText size={36} className="text-red-400" />
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="font-semibold text-slate-800 text-sm truncate mb-1" title={pdf.title}>{pdf.title}</p>
                {pdf.fileName && <p className="text-xs text-slate-400 truncate mb-1">{pdf.fileName}</p>}
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {pdf.size && <span>{formatBytes(pdf.size)}</span>}
                  <span>{formatDate(pdf.createdAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex items-center gap-2">
                <button
                  onClick={() => handleOpen(pdf.id)}
                  disabled={openingId === pdf.id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-70"
                >
                  {openingId === pdf.id ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                  Abrir
                </button>
                {deletingId === pdf.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(pdf.id)} className="px-2 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition">Sim</button>
                    <button onClick={() => setDeletingId(null)} className="px-2 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 transition">Não</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(pdf.id)}
                    className="p-1.5 border border-slate-200 text-slate-400 rounded-lg hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={pdf => setPdfs(prev => [pdf, ...prev])}
        />
      )}
    </div>
  )
}

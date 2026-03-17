import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Plus,
  Globe,
  ExternalLink,
  Copy,
  ChevronRight,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { sitesApi } from '../lib/api'
import type { Site } from '../lib/api'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function TrackingCodeModal({ site, onClose }: { site: Site; onClose: () => void }) {
  const code = site.trackingCode || `<!-- Syntax Analytics - ${site.name} -->\n<script>\n(function(){\n  var s=document.createElement('script');\n  s.src='https://thcjrzluhsbgtbirdoxl.supabase.co/functions/v1/make-server-cee56a32/tracker.js';\n  s.dataset.siteId='${site.id}';\n  document.head.appendChild(s);\n})();\n</script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => toast.success('Código copiado!')).catch(() => toast.error('Erro ao copiar'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-50">Código de Rastreamento</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-zinc-300 mb-3">
            Adicione este código ao <code className="bg-zinc-800 px-1 rounded text-xs">&lt;head&gt;</code> do site <strong>{site.name}</strong>:
          </p>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 whitespace-pre-wrap break-all leading-relaxed">
            {code}
          </div>
          <button
            onClick={handleCopy}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
          >
            <Copy size={14} />
            Copiar Código
          </button>
        </div>
      </div>
    </div>
  )
}

function AddSiteModal({ onClose, onCreated }: { onClose: () => void; onCreated: (site: Site) => void }) {
  const [form, setForm] = useState({ name: '', url: '', clientName: '', clientEmail: '', clientPhone: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.url) { toast.error('Nome e URL são obrigatórios'); return }
    setLoading(true)
    try {
      const res = await sitesApi.create({
        name: form.name,
        url: form.url,
        clientName: form.clientName || undefined,
        clientEmail: form.clientEmail || undefined,
        clientPhone: form.clientPhone || undefined,
      }) as { site?: Site } & Site
      const created = (res as { site: Site }).site || res as Site
      toast.success('Site adicionado!')
      onCreated(created)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar site')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-50">Adicionar Site</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">Nome do Site *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Meu Site" required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">URL *</label>
              <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://meusite.com.br" required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Nome do Cliente</label>
              <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="João Silva" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">E-mail do Cliente</label>
              <input value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="cliente@email.com" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">Telefone do Cliente</label>
              <input value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="(11) 99999-9999" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-950 transition">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Analytics() {
  const navigate = useNavigate()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [trackingSite, setTrackingSite] = useState<Site | null>(null)

  useEffect(() => {
    sitesApi.list()
      .then(r => setSites(r.sites))
      .catch(() => toast.error('Erro ao carregar sites'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = sites.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.url.toLowerCase().includes(search.toLowerCase()) ||
    (s.clientName || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-full bg-zinc-950 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Analytics</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{sites.length} site{sites.length !== 1 ? 's' : ''} monitorado{sites.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm"
        >
          <Plus size={16} />
          Adicionar Site
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar sites..."
          className="w-full pl-9 pr-4 py-2.5 border border-zinc-700 rounded-xl text-sm bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Globe size={40} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400 font-medium">Nenhum site encontrado</p>
          <p className="text-zinc-500 text-sm mt-1">
            {search ? 'Tente outros termos de busca' : 'Adicione seu primeiro site para começar'}
          </p>
          {!search && (
            <button onClick={() => setShowAdd(true)} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
              Adicionar Site
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(site => (
            <div key={site.id} className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm hover:shadow-md hover:border-emerald-700 transition-all duration-150 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                      <Globe size={18} className="text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-50 truncate">{site.name}</p>
                      <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-emerald-500 flex items-center gap-1 truncate" onClick={e => e.stopPropagation()}>
                        {site.url.replace(/^https?:\/\//, '')}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>

                {site.clientName && (
                  <div className="text-xs text-zinc-400 mb-3">
                    Cliente: <span className="font-medium text-zinc-100">{site.clientName}</span>
                  </div>
                )}

                <div className="text-xs text-zinc-500 mb-4">
                  Criado em {(() => { try { return format(parseISO(site.createdAt), "dd/MM/yyyy", { locale: ptBR }) } catch { return '—' } })()}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTrackingSite(site)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg hover:border-emerald-600 hover:text-emerald-500 transition"
                  >
                    <Copy size={12} />
                    Tracking Code
                  </button>
                  <button
                    onClick={() => navigate(`/analytics/${site.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition"
                  >
                    Ver Analytics
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddSiteModal
          onClose={() => setShowAdd(false)}
          onCreated={site => setSites(prev => [site, ...prev])}
        />
      )}

      {trackingSite && (
        <TrackingCodeModal site={trackingSite} onClose={() => setTrackingSite(null)} />
      )}
    </div>
  )
}

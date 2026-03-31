import React, { useEffect, useRef, useState } from 'react'
import {
  Send, Plus, Trash2, Upload, Users, CheckCircle2,
  XCircle, Clock, MessageSquareText, ChevronDown, ChevronUp, RefreshCw,
  BookUser, Search, X
} from 'lucide-react'
import { toast } from 'sonner'
import { crmApi } from '../lib/api'
import type { Lead as CrmLead } from '../lib/api'

const API = 'http://localhost:5001/api'

interface Lead {
  id: string
  nome: string
  telefone: string
  empresa: string
  cargo: string
  dor: string
  status: 'pendente' | 'enviado' | 'erro'
}

interface LogEntry {
  data_hora: string
  telefone: string
  nome: string
  empresa: string
  status: string
  mensagem: string
}

const statusConfig = {
  pendente: { label: 'Pendente', icon: <Clock size={12} />, class: 'bg-zinc-700 text-zinc-300' },
  enviado:  { label: 'Enviado',  icon: <CheckCircle2 size={12} />, class: 'bg-emerald-900/60 text-emerald-400' },
  erro:     { label: 'Erro',     icon: <XCircle size={12} />, class: 'bg-red-900/60 text-red-400' },
}

const EMPTY_FORM = { nome: '', telefone: '', empresa: '', cargo: '', dor: '' }

export default function Prospeccao() {
  const [leads, setLeads]           = useState<Lead[]>([])
  const [template, setTemplate]     = useState({ texto: '', assinatura: '' })
  const [log, setLog]               = useState<LogEntry[]>([])
  const [form, setForm]             = useState(EMPTY_FORM)
  const [sending, setSending]       = useState<string | null>(null)
  const [sendingAll, setSendingAll] = useState(false)
  const [preview, setPreview]       = useState<{ id: string; msg: string } | null>(null)
  const [showLog, setShowLog]       = useState(false)
  const [showForm, setShowForm]           = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [showCrmModal, setShowCrmModal]   = useState(false)
  const [crmLeads, setCrmLeads]           = useState<CrmLead[]>([])
  const [crmSearch, setCrmSearch]         = useState('')
  const [crmSelected, setCrmSelected]     = useState<Set<string>>(new Set())
  const [crmLoading, setCrmLoading]       = useState(false)
  const [importing, setImporting]         = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Carrega dados ──────────────────────────────────────────────────────────
  const fetchLeads    = () => fetch(`${API}/leads`).then(r => r.json()).then(setLeads).catch(() => {})
  const fetchTemplate = () => fetch(`${API}/template`).then(r => r.json()).then(setTemplate).catch(() => {})
  const fetchLog      = () => fetch(`${API}/log`).then(r => r.json()).then(setLog).catch(() => {})

  useEffect(() => {
    fetchLeads()
    fetchTemplate()
    fetchLog()
  }, [])

  // ── Adicionar lead ─────────────────────────────────────────────────────────
  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome || !form.telefone) {
      toast.error('Nome e telefone são obrigatórios')
      return
    }
    const res = await fetch(`${API}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Lead adicionado')
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchLeads()
    } else {
      toast.error('Erro ao adicionar lead')
    }
  }

  // ── Deletar lead ───────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await fetch(`${API}/leads/${id}`, { method: 'DELETE' })
    toast.success('Lead removido')
    fetchLeads()
  }

  // ── Importar CSV ───────────────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API}/leads/import`, { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) {
      toast.success(`${data.importados} leads importados`)
      fetchLeads()
    } else {
      toast.error(data.error || 'Erro ao importar')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Salvar template ────────────────────────────────────────────────────────
  const handleSaveTemplate = async () => {
    await fetch(`${API}/template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    })
    toast.success('Template salvo')
    setTemplateSaved(true)
    setTimeout(() => setTemplateSaved(false), 2000)
  }

  // ── Preview de mensagem ────────────────────────────────────────────────────
  const handlePreview = async (lead: Lead) => {
    if (preview?.id === lead.id) { setPreview(null); return }
    const res = await fetch(`${API}/preview/${lead.id}`)
    const data = await res.json()
    setPreview({ id: lead.id, msg: data.mensagem })
  }

  // ── Enviar individual ──────────────────────────────────────────────────────
  const handleEnviar = async (lead: Lead) => {
    setSending(lead.id)
    const res = await fetch(`${API}/enviar/${lead.id}`, { method: 'POST' })
    const data = await res.json()
    if (data.ok) {
      toast.success(`Mensagem enviada para ${lead.nome}`)
    } else {
      toast.error(`Erro: ${data.detalhe}`)
    }
    setSending(null)
    fetchLeads()
    fetchLog()
  }

  // ── Enviar todos ───────────────────────────────────────────────────────────
  const handleEnviarTodos = async () => {
    const pendentes = leads.filter(l => l.status === 'pendente')
    if (!pendentes.length) { toast.error('Nenhum lead pendente'); return }
    setSendingAll(true)
    const res = await fetch(`${API}/enviar-todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervalo: 45 }),
    })
    const data = await res.json()
    if (data.ok) {
      toast.success(`Disparando ${data.total} mensagens com intervalo de 45s`)
    } else {
      toast.error(data.error || 'Erro ao disparar')
    }
    setSendingAll(false)
    // Atualiza leads a cada 5s por 3 minutos
    let count = 0
    const interval = setInterval(() => {
      fetchLeads()
      fetchLog()
      if (++count >= 36) clearInterval(interval)
    }, 5000)
  }

  // ── Modal CRM ─────────────────────────────────────────────────────────────
  const openCrmModal = async () => {
    setShowCrmModal(true)
    setCrmSelected(new Set())
    setCrmSearch('')
    setCrmLoading(true)
    try {
      const res = await crmApi.getLeads()
      // Filtra só quem tem telefone
      setCrmLeads(res.leads.filter(l => l.phone))
    } catch {
      toast.error('Erro ao carregar contatos do CRM')
    } finally {
      setCrmLoading(false)
    }
  }

  const toggleCrmLead = (id: string) => {
    setCrmSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const filtered = crmLeadsFiltrados.map(l => l.id)
    const allSelected = filtered.every(id => crmSelected.has(id))
    setCrmSelected(prev => {
      const next = new Set(prev)
      if (allSelected) filtered.forEach(id => next.delete(id))
      else filtered.forEach(id => next.add(id))
      return next
    })
  }

  const handleImportarDoCrm = async () => {
    if (crmSelected.size === 0) { toast.error('Selecione ao menos um contato'); return }
    setImporting(true)
    const selecionados = crmLeads.filter(l => crmSelected.has(l.id))
    let adicionados = 0
    for (const l of selecionados) {
      const res = await fetch(`${API}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:     l.name,
          telefone: l.phone || '',
          empresa:  l.company || '',
          cargo:    l.service || '',
          dor:      l.notes || '',
        }),
      })
      if (res.ok) adicionados++
    }
    toast.success(`${adicionados} contato(s) adicionados à prospecção`)
    setShowCrmModal(false)
    setImporting(false)
    fetchLeads()
  }

  const crmLeadsFiltrados = crmLeads.filter(l => {
    const q = crmSearch.toLowerCase()
    return (
      l.name.toLowerCase().includes(q) ||
      (l.company || '').toLowerCase().includes(q) ||
      (l.phone || '').includes(q)
    )
  })

  const stageLabel: Record<string, string> = {
    novo: 'Novo', contato: 'Contato', proposta: 'Proposta',
    negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido',
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:    leads.length,
    pendente: leads.filter(l => l.status === 'pendente').length,
    enviado:  leads.filter(l => l.status === 'enviado').length,
    erro:     leads.filter(l => l.status === 'erro').length,
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Prospecção WhatsApp</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Gerencie e dispare mensagens para seus leads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchLeads(); fetchLog() }}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-all"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-all"
          >
            <Upload size={15} />
            Importar CSV
          </button>
          <button
            onClick={openCrmModal}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-all border border-zinc-700"
          >
            <BookUser size={15} />
            Importar do CRM
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-all"
          >
            <Plus size={15} />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-zinc-300' },
          { label: 'Pendentes', value: stats.pendente, color: 'text-zinc-400' },
          { label: 'Enviados', value: stats.enviado, color: 'text-emerald-400' },
          { label: 'Com erro', value: stats.erro, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Coluna Esquerda — Leads + Formulário */}
        <div className="flex flex-col gap-4">

          {/* Formulário de novo lead */}
          {showForm && (
            <form onSubmit={handleAddLead} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
              <h3 className="text-zinc-200 text-sm font-medium">Adicionar Lead</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'nome', label: 'Nome *', placeholder: 'João Silva' },
                  { key: 'telefone', label: 'WhatsApp *', placeholder: '11999999999' },
                  { key: 'empresa', label: 'Empresa', placeholder: 'Tech Ltda' },
                  { key: 'cargo', label: 'Cargo', placeholder: 'CEO' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-zinc-500 text-xs block mb-1">{f.label}</label>
                    <input
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-600"
                      placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-zinc-500 text-xs block mb-1">Dor / Contexto</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: escalar vendas sem aumentar custo fixo"
                  value={form.dor}
                  onChange={e => setForm(p => ({ ...p, dor: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500">Adicionar</button>
              </div>
            </form>
          )}

          {/* Lista de leads */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-zinc-500" />
                <span className="text-zinc-300 text-sm font-medium">Leads ({leads.length})</span>
              </div>
              <button
                onClick={handleEnviarTodos}
                disabled={sendingAll || stats.pendente === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send size={12} />
                {sendingAll ? 'Disparando...' : `Disparar todos (${stats.pendente})`}
              </button>
            </div>

            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                <Users size={32} className="mb-2 opacity-30" />
                <p className="text-sm">Nenhum lead cadastrado</p>
                <p className="text-xs mt-1">Adicione manualmente ou importe um CSV</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800 max-h-[480px] overflow-y-auto">
                {leads.map(lead => {
                  const cfg = statusConfig[lead.status] || statusConfig.pendente
                  const isExpanded = preview?.id === lead.id
                  return (
                    <div key={lead.id} className="px-4 py-3 hover:bg-zinc-800/40 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-zinc-100 text-sm font-medium">{lead.nome}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.class}`}>
                              {cfg.icon}{cfg.label}
                            </span>
                          </div>
                          <p className="text-zinc-500 text-xs mt-0.5 truncate">
                            {lead.empresa && `${lead.empresa}`}{lead.cargo && ` · ${lead.cargo}`}
                          </p>
                          <p className="text-zinc-600 text-xs">{lead.telefone}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handlePreview(lead)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition-all"
                            title="Pré-visualizar"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button
                            onClick={() => handleEnviar(lead)}
                            disabled={sending === lead.id || lead.status === 'enviado'}
                            className="p-1.5 rounded-lg text-zinc-500 hover:bg-emerald-900/50 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title="Enviar"
                          >
                            <Send size={14} className={sending === lead.id ? 'animate-pulse' : ''} />
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:bg-red-900/50 hover:text-red-400 transition-all"
                            title="Remover"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Preview inline */}
                      {isExpanded && preview && (
                        <div className="mt-3 p-3 bg-zinc-800/60 rounded-lg border border-zinc-700">
                          <p className="text-xs text-zinc-500 mb-1.5 font-medium">Pré-visualização da mensagem</p>
                          <p className="text-zinc-300 text-xs whitespace-pre-wrap leading-relaxed">{preview.msg}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita — Template */}
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <MessageSquareText size={16} className="text-zinc-500" />
              <span className="text-zinc-300 text-sm font-medium">Template de Mensagem</span>
            </div>
            <div className="p-4 flex flex-col gap-3 flex-1">
              <div>
                <label className="text-zinc-500 text-xs block mb-1.5">
                  Corpo da mensagem
                  <span className="ml-2 text-zinc-600">{'{nome} {empresa} {cargo} {dor}'}</span>
                </label>
                <textarea
                  rows={10}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-600 resize-none leading-relaxed"
                  value={template.texto}
                  onChange={e => setTemplate(p => ({ ...p, texto: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-zinc-500 text-xs block mb-1.5">Assinatura</label>
                <textarea
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-600 resize-none"
                  value={template.assinatura}
                  onChange={e => setTemplate(p => ({ ...p, assinatura: e.target.value }))}
                />
              </div>
              <button
                onClick={handleSaveTemplate}
                className="w-full py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 transition-all font-medium"
              >
                {templateSaved ? '✓ Template salvo' : 'Salvar Template'}
              </button>
            </div>
          </div>

          {/* Variáveis */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs font-medium mb-2">Variáveis disponíveis</p>
            <div className="flex flex-wrap gap-2">
              {['{nome}', '{empresa}', '{cargo}', '{dor}'].map(v => (
                <code key={v} className="px-2 py-1 bg-zinc-800 text-emerald-400 text-xs rounded-lg border border-zinc-700 font-mono">
                  {v}
                </code>
              ))}
            </div>
            <p className="text-zinc-600 text-xs mt-2">
              Ex: "Olá <code className="text-emerald-500">{'{nome}'}</code>, vi que você trabalha na <code className="text-emerald-500">{'{empresa}'}</code>..."
            </p>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <button
          onClick={() => { setShowLog(v => !v); if (!showLog) fetchLog() }}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-all"
        >
          <span className="text-zinc-300 text-sm font-medium">Histórico de Disparos ({log.length})</span>
          {showLog ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </button>

        {showLog && (
          <div className="border-t border-zinc-800 overflow-x-auto">
            {log.length === 0 ? (
              <p className="text-center py-8 text-zinc-600 text-sm">Nenhum disparo registrado</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Data/Hora', 'Nome', 'Empresa', 'Telefone', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-zinc-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {log.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2.5 text-zinc-500">{row.data_hora}</td>
                      <td className="px-4 py-2.5 text-zinc-300">{row.nome}</td>
                      <td className="px-4 py-2.5 text-zinc-400">{row.empresa}</td>
                      <td className="px-4 py-2.5 text-zinc-500 font-mono">{row.telefone}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                          row.status === 'enviado'
                            ? 'bg-emerald-900/60 text-emerald-400'
                            : 'bg-red-900/60 text-red-400'
                        }`}>
                          {row.status === 'enviado' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      {/* ── Modal CRM ─────────────────────────────────────────────────────── */}
      {showCrmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCrmModal(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">

            {/* Header do modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <BookUser size={18} className="text-emerald-500" />
                <h2 className="text-zinc-100 font-semibold text-base">Selecionar Contatos do CRM</h2>
              </div>
              <button onClick={() => setShowCrmModal(false)} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Busca */}
            <div className="px-5 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                <Search size={15} className="text-zinc-500 flex-shrink-0" />
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none"
                  placeholder="Buscar por nome, empresa ou telefone..."
                  value={crmSearch}
                  onChange={e => setCrmSearch(e.target.value)}
                />
                {crmSearch && (
                  <button onClick={() => setCrmSearch('')} className="text-zinc-500 hover:text-zinc-300">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Selecionar todos */}
            {!crmLoading && crmLeadsFiltrados.length > 0 && (
              <div className="px-5 py-2 border-b border-zinc-800 flex items-center justify-between">
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-emerald-500 hover:text-emerald-400 font-medium"
                >
                  {crmLeadsFiltrados.every(l => crmSelected.has(l.id))
                    ? 'Desmarcar todos'
                    : `Selecionar todos (${crmLeadsFiltrados.length})`}
                </button>
                <span className="text-xs text-zinc-500">{crmSelected.size} selecionado(s)</span>
              </div>
            )}

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {crmLoading ? (
                <div className="flex items-center justify-center py-16 text-zinc-600">
                  <div className="w-6 h-6 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin mr-3" />
                  <span className="text-sm">Carregando contatos...</span>
                </div>
              ) : crmLeadsFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                  <Users size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">
                    {crmLeads.length === 0
                      ? 'Nenhum contato com telefone no CRM'
                      : 'Nenhum resultado para a busca'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {crmLeadsFiltrados.map(lead => {
                    const selected = crmSelected.has(lead.id)
                    return (
                      <div
                        key={lead.id}
                        onClick={() => toggleCrmLead(lead.id)}
                        className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-all ${
                          selected ? 'bg-emerald-900/20' : 'hover:bg-zinc-800/50'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                          selected
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'border-zinc-600'
                        }`}>
                          {selected && <CheckCircle2 size={12} className="text-white" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-zinc-100 text-sm font-medium">{lead.name}</span>
                            {lead.stage && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                                {stageLabel[lead.stage] || lead.stage}
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-500 text-xs mt-0.5 truncate">
                            {lead.company && `${lead.company}`}
                            {lead.service && ` · ${lead.service}`}
                          </p>
                        </div>

                        {/* Telefone */}
                        <span className="text-zinc-500 text-xs font-mono flex-shrink-0">{lead.phone}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                Apenas contatos com telefone são exibidos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCrmModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportarDoCrm}
                  disabled={crmSelected.size === 0 || importing}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
                >
                  <Send size={14} />
                  {importing
                    ? 'Importando...'
                    : `Adicionar ${crmSelected.size > 0 ? crmSelected.size : ''} contato(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

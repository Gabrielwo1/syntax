import React, { useEffect, useRef, useState } from 'react'
import {
  MessageSquare, Plus, Copy, Trash2, Pencil, Check, X, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { copyApi, type CopyGroup, type CopyText } from '../lib/api'

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-white/10 bg-zinc-800"

// ─── Add/Edit Text Modal ──────────────────────────────────────────────────────

function TextModal({
  groupId, existing, onClose, onSaved,
}: {
  groupId: string
  existing?: CopyText
  onClose: () => void
  onSaved: (t: CopyText) => void
}) {
  const [title, setTitle] = useState(existing?.title || '')
  const [content, setContent] = useState(existing?.content || '')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) { toast.error('Preencha título e texto'); return }
    setLoading(true)
    try {
      const res = existing
        ? await copyApi.updateText(existing.id, title, content) as { text: CopyText }
        : await copyApi.createText(groupId, title, content) as { text: CopyText }
      onSaved(res.text)
      toast.success(existing ? 'Texto atualizado!' : 'Texto adicionado!')
      onClose()
    } catch {
      toast.error('Erro ao salvar texto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={existing ? 'Editar Texto' : 'Novo Texto'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Abordagem e-commerce" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Texto</label>
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            placeholder="Cole ou escreva o copy aqui..."
            rows={5} className={`${inputCls} resize-none font-mono text-xs`}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-2 border border-white/10 text-zinc-400 text-sm rounded-lg hover:bg-white/5 transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-70 flex items-center justify-center gap-2">
            {loading && <Loader2 size={13} className="animate-spin" />}
            {existing ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Copy Text Card ───────────────────────────────────────────────────────────

function TextCard({ text, onEdit, onDelete }: { text: CopyText; onEdit: () => void; onDelete: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text.content)
      setCopied(true)
      toast.success('Texto copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden" style={{ backgroundColor: '#1e1e1e' }}>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-100">{text.title}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 text-zinc-600 hover:text-zinc-300 transition rounded-lg hover:bg-white/5" title="Editar">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-zinc-600 hover:text-rose-400 transition rounded-lg hover:bg-rose-500/10" title="Excluir">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="rounded-lg px-3 py-2.5 mb-2.5 font-mono text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap break-words" style={{ backgroundColor: '#161616' }}>
          {text.content}
        </div>
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition"
          style={{ backgroundColor: copied ? '#166534' : '#2a2a2a', color: copied ? '#86efac' : '#a1a1aa' }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copiado!' : 'Copiar Texto'}
        </button>
      </div>
    </div>
  )
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({
  group, onRename, onDeleteGroup, onAddText, onEditText, onDeleteText,
}: {
  group: CopyGroup
  onRename: (id: string, name: string) => void
  onDeleteGroup: (id: string) => void
  onAddText: (groupId: string) => void
  onEditText: (text: CopyText) => void
  onDeleteText: (textId: string, groupId: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(group.name)
  const nameRef = useRef<HTMLInputElement>(null)

  const confirmRename = () => {
    if (nameVal.trim() && nameVal.trim() !== group.name) onRename(group.id, nameVal.trim())
    setEditingName(false)
  }

  return (
    <div className="rounded-2xl border border-white/[0.07]" style={{ backgroundColor: '#161616' }}>
      {/* Group header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.07]">
        {editingName ? (
          <input
            ref={nameRef}
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setEditingName(false) }}
            onBlur={confirmRename}
            autoFocus
            className="flex-1 bg-transparent text-white font-semibold text-base focus:outline-none border-b border-emerald-500 pb-0.5"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex-1 text-left text-white font-semibold text-base hover:text-emerald-400 transition"
          >
            {group.name}
          </button>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 transition rounded-lg hover:bg-white/5"
          >
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
          <button
            onClick={() => { if (confirm(`Excluir grupo "${group.name}" e todos os textos?`)) onDeleteGroup(group.id) }}
            className="p-1.5 text-zinc-600 hover:text-rose-400 transition rounded-lg hover:bg-rose-500/10"
            title="Excluir grupo"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Texts */}
      {!collapsed && (
        <div className="p-4 space-y-3">
          {group.texts.map(t => (
            <TextCard
              key={t.id}
              text={t}
              onEdit={() => onEditText(t)}
              onDelete={() => { if (confirm('Excluir este texto?')) onDeleteText(t.id, group.id) }}
            />
          ))}

          {/* Add text button */}
          <button
            onClick={() => onAddText(group.id)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-white/10 text-zinc-600 hover:border-emerald-500/40 hover:text-emerald-500 text-sm font-medium transition"
          >
            <Plus size={15} />
            Adicionar Texto
          </button>
        </div>
      )}
    </div>
  )
}

// ─── New Group Modal ──────────────────────────────────────────────────────────

function NewGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (g: CopyGroup) => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Informe um nome'); return }
    setLoading(true)
    try {
      const res = await copyApi.createGroup(name) as { group: CopyGroup }
      onCreate(res.group)
      toast.success('Grupo criado!')
      onClose()
    } catch {
      toast.error('Erro ao criar grupo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Novo Grupo" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Nome do grupo</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Primeiro contato" className={inputCls} autoFocus />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-2 border border-white/10 text-zinc-400 text-sm rounded-lg hover:bg-white/5 transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-70 flex items-center justify-center gap-2">
            {loading && <Loader2 size={13} className="animate-spin" />}
            Criar
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CopyPage() {
  const [groups, setGroups] = useState<CopyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [addingTextFor, setAddingTextFor] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<CopyText | null>(null)

  useEffect(() => {
    copyApi.listGroups()
      .then((r: any) => setGroups(r.groups || []))
      .catch(() => toast.error('Erro ao carregar grupos'))
      .finally(() => setLoading(false))
  }, [])

  const handleRename = async (id: string, name: string) => {
    try {
      await copyApi.renameGroup(id, name)
      setGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g))
    } catch {
      toast.error('Erro ao renomear grupo')
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      await copyApi.deleteGroup(id)
      setGroups(prev => prev.filter(g => g.id !== id))
      toast.success('Grupo excluído')
    } catch {
      toast.error('Erro ao excluir grupo')
    }
  }

  const handleTextSaved = (text: CopyText) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== text.group_id) return g
      const exists = g.texts.find(t => t.id === text.id)
      return {
        ...g,
        texts: exists
          ? g.texts.map(t => t.id === text.id ? text : t)
          : [...g.texts, text],
      }
    }))
  }

  const handleDeleteText = async (textId: string, groupId: string) => {
    try {
      await copyApi.deleteText(textId)
      setGroups(prev => prev.map(g => g.id !== groupId ? g : { ...g, texts: g.texts.filter(t => t.id !== textId) }))
      toast.success('Texto excluído')
    } catch {
      toast.error('Erro ao excluir texto')
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <MessageSquare size={28} className="text-emerald-500 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-white">Copy</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Crie, organize e copie textos de abordagem de forma rápida.</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewGroup(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-900/30"
        >
          <Plus size={16} />
          Novo Grupo
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-zinc-600" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-24">
          <MessageSquare size={40} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm">Nenhum grupo ainda. Crie o primeiro!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              onRename={handleRename}
              onDeleteGroup={handleDeleteGroup}
              onAddText={id => setAddingTextFor(id)}
              onEditText={t => setEditingText(t)}
              onDeleteText={handleDeleteText}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onCreate={g => setGroups(prev => [...prev, g])}
        />
      )}
      {addingTextFor && (
        <TextModal
          groupId={addingTextFor}
          onClose={() => setAddingTextFor(null)}
          onSaved={handleTextSaved}
        />
      )}
      {editingText && (
        <TextModal
          groupId={editingText.group_id}
          existing={editingText}
          onClose={() => setEditingText(null)}
          onSaved={handleTextSaved}
        />
      )}
    </div>
  )
}

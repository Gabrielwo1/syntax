import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  Plus, X, Loader2, CheckCircle2,
  Trash2, Sparkles, Calendar, User, Briefcase,
  LayoutGrid, Search, ChevronDown,
  FileText, Pencil, ChevronRight,
  Paperclip, Upload, Filter, ArrowUpDown,
  MoreHorizontal, Hash, Timer, AlertCircle,
  PlayCircle, Settings2, Zap, FolderPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, isPast, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { tasksApi, taskSprintsApi, authApi, repoApi } from '../lib/api'
import type { Task, TaskSprint, AppUser } from '../lib/api'
import { MOCK_TASKS } from '../data/mockData'
import type { MockTask, TaskPriority, TaskStatus } from '../data/mockData'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalTask extends Omit<Task, 'status'> {
  project: string
  name: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due: string
  assignee: string
  tags: string[]
  estimatedHours?: number
  completedAt?: string
  createdAt: string
  sprintId?: string
  attachments?: string[]
}

function mockToLocal(m: MockTask): LocalTask {
  return {
    id: m.id, project: m.project, name: m.name,
    description: m.description ?? '', status: m.status, priority: m.priority,
    due: m.due, assignee: m.assignee, tags: m.tags ?? [],
    estimatedHours: m.estimatedHours, completedAt: m.completedAt,
    createdAt: m.createdAt, attachments: [],
  }
}

function apiToLocal(t: Task): LocalTask {
  return {
    id: t.id, project: t.project ?? '', name: t.name,
    description: t.description ?? '',
    status: (t.status === 'completed' ? 'done' : t.status) as TaskStatus,
    priority: (t.priority as TaskPriority) ?? 'medium',
    due: t.due ?? '', assignee: t.assignee ?? '', tags: t.tags ?? [],
    estimatedHours: t.estimatedHours ?? undefined, completedAt: undefined,
    createdAt: t.createdAt, sprintId: t.sprintId ?? '', attachments: t.attachments ?? [],
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return ''
  try { return format(parseISO(d), "dd/MM", { locale: ptBR }) } catch { return d }
}

function fmtDateFull(d?: string) {
  if (!d) return ''
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }) } catch { return d }
}

function isOverdue(due?: string, status?: TaskStatus) {
  if (!due || status === 'done') return false
  try { return isPast(startOfDay(parseISO(due))) } catch { return false }
}

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState('')
  const add = () => {
    const t = val.trim().toLowerCase()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setVal('')
  }
  return (
    <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-950 border border-zinc-800 rounded-xl min-h-[42px]">
      {tags.map(t => (
        <span key={t} className="inline-flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-lg">
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="text-zinc-500 hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder={tags.length === 0 ? 'Adicionar tag e pressionar Enter...' : ''} className="flex-1 min-w-[140px] bg-transparent text-xs text-zinc-300 placeholder:text-zinc-600 outline-none" />
    </div>
  )
}

// ─── Project Combobox ─────────────────────────────────────────────────────────

function ProjectCombobox({ value, onChange, projects, cls }: { value: string; onChange: (v: string) => void; projects: string[]; cls: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const filtered = projects.filter(p => value.trim() === '' || p.toLowerCase().includes(value.toLowerCase()))
  const showCreate = value.trim() !== '' && !projects.some(p => p.toLowerCase() === value.trim().toLowerCase())
  return (
    <div ref={ref} className="relative">
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder="Nome do projeto" className={cls} autoComplete="off" />
      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-20 top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map(p => (
            <button key={p} type="button" onMouseDown={() => { onChange(p); setOpen(false) }} className="w-full text-left px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2.5 transition-colors">
              <Briefcase className="w-3.5 h-3.5 text-zinc-500 shrink-0" />{p}
            </button>
          ))}
          {showCreate && (
            <button type="button" onMouseDown={() => { onChange(value.trim()); setOpen(false) }} className="w-full text-left px-3 py-2.5 text-sm text-emerald-400 hover:bg-zinc-800 flex items-center gap-2.5 transition-colors border-t border-zinc-800">
              <Plus className="w-3.5 h-3.5 shrink-0" />Criar &ldquo;{value.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Task Modal ───────────────────────────────────────────────────────────────

function TaskModal({ task, onClose, onSaved, sprints, defaultProject, defaultSprintId, users, allProjects }: {
  task?: LocalTask | null; onClose: () => void; onSaved: (t: LocalTask) => void
  sprints: TaskSprint[]; defaultProject?: string; defaultSprintId?: string; users: AppUser[]; allProjects: string[]
}) {
  const [form, setForm] = useState<Omit<LocalTask, 'id' | 'createdAt' | 'completedAt'>>({
    name: task?.name ?? '', project: task?.project ?? defaultProject ?? '',
    description: task?.description ?? '', status: task?.status ?? 'not_started',
    priority: task?.priority ?? 'medium', due: task?.due ?? '',
    assignee: task?.assignee ?? '', tags: task?.tags ?? [],
    estimatedHours: task?.estimatedHours, sprintId: task?.sprintId ?? defaultSprintId ?? '',
    attachments: task?.attachments ?? [],
  })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
  const selectCls = "w-full text-sm border border-zinc-800 rounded-xl px-3 py-2.5 bg-zinc-950 text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer appearance-none"
  const labelCls = "block text-xs font-medium text-zinc-400 mb-1.5"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return }
    setLoading(true)
    try {
      const uploadedIds: string[] = []
      for (const file of pendingFiles) {
        try {
          const res = await repoApi.upload(file, file.name) as any
          const id = res?.item?.id || res?.id
          if (id) uploadedIds.push(id)
        } catch { toast.error(`Erro ao enviar ${file.name}`) }
      }
      const allAttachments = [...(form.attachments || []), ...uploadedIds]
      const apiStatus = form.status === 'done' ? 'completed' : form.status as 'not_started' | 'in_progress'
      const payload: Partial<Task> = {
        name: form.name, project: form.project || undefined,
        assignee: form.assignee || undefined, due: form.due || undefined,
        status: apiStatus, sprintId: form.sprintId || undefined,
        attachments: allAttachments.length > 0 ? allAttachments : undefined,
        description: form.description || undefined, priority: form.priority,
        tags: form.tags.length > 0 ? form.tags : undefined, estimatedHours: form.estimatedHours ?? undefined,
      }
      const saved = task ? await tasksApi.updateTask(task.id, payload) : await tasksApi.createTask(payload)
      toast.success(task ? 'Tarefa atualizada!' : 'Tarefa criada!')
      onSaved(apiToLocal(saved))
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-50">{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-50 transition-colors p-1"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            <div>
              <label className={labelCls}>Nome da Tarefa *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Descreva a tarefa..." className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Projeto</label>
                <ProjectCombobox value={form.project} onChange={v => set('project', v)} projects={allProjects} cls={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sprint</label>
                <select value={form.sprintId} onChange={e => set('sprintId', e.target.value)} className={selectCls}>
                  <option value="">Backlog</option>
                  {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Responsável</label>
                {users.length > 0 ? (
                  <select value={form.assignee} onChange={e => set('assignee', e.target.value)} className={selectCls}>
                    <option value="">Selecionar...</option>
                    {users.map(u => { const name = u.user_metadata?.name || u.email; return <option key={u.id} value={name}>{name}</option> })}
                  </select>
                ) : (
                  <input value={form.assignee} onChange={e => set('assignee', e.target.value)} placeholder="Responsável" className={inputCls} />
                )}
              </div>
              <div>
                <label className={labelCls}>Prioridade</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value as TaskPriority)} className={selectCls}>
                  <option value="urgent">🔴 Urgente</option>
                  <option value="high">🟠 Alta</option>
                  <option value="medium">🔵 Média</option>
                  <option value="low">⚪ Baixa</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value as TaskStatus)} className={selectCls}>
                  <option value="not_started">Não Iniciada</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="done">Concluída</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Prazo</label>
                <input type="date" value={form.due} onChange={e => set('due', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Horas Estimadas</label>
              <input type="number" min={0} step={0.5} value={form.estimatedHours ?? ''} onChange={e => set('estimatedHours', e.target.value ? Number(e.target.value) : undefined)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detalhes sobre a tarefa..." rows={3} className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all" />
            </div>
            <div>
              <label className={labelCls}>Tags</label>
              <TagInput tags={form.tags} onChange={t => set('tags', t)} />
            </div>
            <div>
              <label className={labelCls}>Anexos</label>
              {(form.attachments || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.attachments!.map((id, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-1.5 rounded-lg">
                      <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span className="max-w-[140px] truncate">{id}</span>
                      <button type="button" onClick={() => set('attachments', form.attachments!.filter((_, idx) => idx !== i))} className="text-zinc-500 hover:text-rose-400 transition-colors ml-1"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                      <Paperclip className="w-3 h-3 shrink-0" />
                      <span className="max-w-[140px] truncate">{f.name}</span>
                      <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-emerald-500/50 hover:text-rose-400 transition-colors ml-1"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-500 hover:text-zinc-300 transition-colors border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl px-4 py-3">
                <Upload className="w-4 h-4 shrink-0" />
                <span>Clique para anexar documentos</span>
                <input type="file" multiple className="hidden" onChange={e => { if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = '' }} />
              </label>
            </div>
          </div>
          <div className="p-5 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {task ? 'Salvar' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── AI Modal ─────────────────────────────────────────────────────────────────

function AIModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: (tasks: LocalTask[]) => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<LocalTask[]>([])
  const [saving, setSaving] = useState(false)

  const handleGenerate = async () => {
    if (!text.trim()) { toast.error('Descreva as tarefas'); return }
    setLoading(true)
    try {
      const { tasks } = await tasksApi.aiGenerate(text)
      setPreview(tasks.map(apiToLocal))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar tarefas')
    } finally { setLoading(false) }
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const created: LocalTask[] = []
      for (const t of preview) {
        const saved = await tasksApi.createTask({ name: t.name, project: t.project || undefined, due: t.due || undefined, status: 'not_started' }) as Task
        created.push({ ...apiToLocal(saved), name: t.name, project: t.project })
      }
      toast.success(`${created.length} tarefa${created.length !== 1 ? 's' : ''} criada${created.length !== 1 ? 's' : ''}!`)
      onGenerated(created)
      onClose()
    } catch { toast.error('Erro ao salvar tarefas') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-400" /><h2 className="text-xl font-semibold text-zinc-50">Gerar Tarefas com IA</h2></div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-50 transition-colors p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {preview.length === 0 ? (
            <>
              <p className="text-sm text-zinc-400">Descreva o que precisa ser feito e a IA vai extrair as tarefas:</p>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ex: Criar site para cliente João, desenvolver landing page, integrar formulário..." rows={5} className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><p className="text-sm font-medium text-zinc-300">{preview.length} tarefa{preview.length !== 1 ? 's' : ''} encontrada{preview.length !== 1 ? 's' : ''}. Confirme para criar:</p></div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {preview.map((t, i) => (
                  <div key={i} className="p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                    <p className="text-sm font-medium text-zinc-100">{t.name}</p>
                    <div className="flex gap-3 mt-1">
                      {t.project && <span className="text-xs text-zinc-500 flex items-center gap-1"><Briefcase className="w-3 h-3" />{t.project}</span>}
                      {t.due && <span className="text-xs text-zinc-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(t.due)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="p-5 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900">
          {preview.length > 0 ? <button onClick={() => setPreview([])} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">Voltar</button> : <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">Cancelar</button>}
          {preview.length === 0
            ? <button onClick={handleGenerate} disabled={loading || !text.trim()} className="flex items-center gap-2 px-5 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-sm font-medium rounded-xl transition-all disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{loading ? 'Gerando...' : 'Gerar Tarefas'}</button>
            : <button onClick={handleConfirm} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{saving ? 'Criando...' : 'Criar Tarefas'}</button>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Inline Sprint Create (popover in sprint bar) ────────────────────────────

function InlineSprintCreate({ onCreated }: { onCreated: (sprint: TaskSprint) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { if (open) setTimeout(() => nameRef.current?.focus(), 50) }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await taskSprintsApi.create({ name: name.trim(), startDate: startDate || undefined, endDate: endDate || undefined })
      toast.success(`Sprint "${name.trim()}" criada!`)
      onCreated(res.sprint)
      setName(''); setStartDate(''); setEndDate(''); setOpen(false)
    } catch { toast.error('Erro ao criar sprint') }
    finally { setSaving(false) }
  }

  const inputCls = "w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all"

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
          open ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 border border-dashed border-zinc-700 hover:border-zinc-600'
        }`}
      >
        <Plus className="w-3 h-3" />Nova Sprint
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 p-3">
          <p className="text-xs font-semibold text-zinc-300 mb-2.5 flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />Nova Sprint
          </p>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome da sprint (ex: Sprint 1)"
              className={inputCls}
              onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
            />
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[10px] text-zinc-600 mb-0.5 block">Início</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 mb-0.5 block">Fim</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-1.5 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Cancelar</button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                {saving ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Sprint Manager Modal (delete only) ──────────────────────────────────────

function SprintManagerModal({ sprints, onClose, onRefresh }: {
  sprints: TaskSprint[]
  onClose: () => void
  onRefresh: (sprints: TaskSprint[]) => void
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await taskSprintsApi.delete(id)
      toast.success('Sprint removida')
      onRefresh(sprints.filter(s => s.id !== id))
    } catch { toast.error('Erro ao remover sprint') }
    finally { setDeletingId(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-50">Sprints</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-50 transition-colors p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sprints.length === 0 && (
            <div className="text-center py-8 text-zinc-600 text-sm">
              <PlayCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma sprint. Use o botão &ldquo;+ Nova Sprint&rdquo; na barra acima.
            </div>
          )}
          {sprints.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/40 group">
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">{s.name}</p>
                {(s.startDate || s.endDate) && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {s.startDate ? fmtDateFull(s.startDate) : '—'} → {s.endDate ? fmtDateFull(s.endDate) : '—'}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="p-1.5 text-zinc-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                {deletingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button onClick={onClose} className="w-full py-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Project Modal ────────────────────────────────────────────────────────

function AddProjectModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    onAdd(n)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-50 mb-4">Novo Projeto</h2>
        <form onSubmit={submit} className="space-y-4">
          <input
            ref={ref}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome do projeto..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={!name.trim()} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50">
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ task, sprints, onClose, onEdit, onDelete, onChange }: {
  task: LocalTask; sprints: TaskSprint[]; onClose: () => void; onEdit: () => void; onDelete: () => void; onChange: (t: LocalTask) => void
}) {
  const [desc, setDesc] = useState(task.description)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { setDesc(task.description) }, [task.id])

  const PRIORITY_LABEL: Record<TaskPriority, string> = { urgent: '🔴 Urgente', high: '🟠 Alta', medium: '🔵 Média', low: '⚪ Baixa' }

  const sprintName = task.sprintId ? sprints.find(s => s.id === task.sprintId)?.name : null

  const handleDelete = async () => {
    setDeleting(true)
    try { await tasksApi.deleteTask(task.id); toast.success('Tarefa excluída!'); onDelete() }
    catch { toast.error('Erro ao excluir') }
    finally { setDeleting(false) }
  }

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      const apiStatus = status === 'done' ? 'completed' : status as 'not_started' | 'in_progress'
      await tasksApi.updateTask(task.id, { status: apiStatus })
      onChange({ ...task, status })
    } catch { toast.error('Erro ao atualizar status') }
  }

  const overdue = isOverdue(task.due, task.status)

  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-zinc-900 border-l border-zinc-800 z-40 flex flex-col shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Detalhes</span>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-50 transition-colors px-2 py-1 bg-zinc-800 rounded-lg"><Pencil className="w-3 h-3" /> Editar</button>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-50 transition-colors p-1"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <p className="text-base font-bold text-zinc-50 leading-snug">{task.name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {task.project && <div className="flex items-center gap-1.5 text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-700"><Briefcase className="w-3 h-3" />{task.project}</div>}
            {sprintName && <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/20"><PlayCircle className="w-3 h-3" />{sprintName}</div>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Status</p>
            <select value={task.status} onChange={e => handleStatusChange(e.target.value as TaskStatus)} className="w-full text-xs border border-zinc-700 rounded-lg px-2.5 py-2 bg-zinc-800 text-zinc-200 cursor-pointer focus:outline-none appearance-none">
              <option value="not_started">Não Iniciada</option>
              <option value="in_progress">Em Andamento</option>
              <option value="done">Concluída</option>
            </select>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Prioridade</p>
            <div className="text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2">{PRIORITY_LABEL[task.priority]}</div>
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Prazo</p>
          {task.due ? (
            <div className={`flex items-center gap-2 text-sm ${overdue ? 'text-rose-400' : 'text-zinc-300'}`}>
              {overdue ? <AlertCircle className="w-4 h-4" /> : <Calendar className="w-4 h-4 text-zinc-500" />}
              <span>{fmtDate(task.due)}</span>
            </div>
          ) : <span className="text-sm text-zinc-600">Sem prazo</span>}
        </div>
        {task.assignee && (
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Responsável</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">{task.assignee.charAt(0).toUpperCase()}</div>
              <span className="text-sm text-zinc-300">{task.assignee}</span>
            </div>
          </div>
        )}
        {task.estimatedHours != null && (
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Horas Estimadas</p>
            <div className="flex items-center gap-2 text-sm text-zinc-300"><Timer className="w-4 h-4 text-zinc-500" /><span>{task.estimatedHours}h</span></div>
          </div>
        )}
        {task.tags.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5">{task.tags.map(t => <span key={t} className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-lg flex items-center gap-1"><Hash className="w-3 h-3 text-zinc-500" />{t}</span>)}</div>
          </div>
        )}
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Descrição</p>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} onBlur={() => onChange({ ...task, description: desc })} placeholder="Adicionar descrição..." rows={4} className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all" />
        </div>
      </div>
      <div className="p-4 border-t border-zinc-800">
        <button onClick={handleDelete} disabled={deleting} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}Excluir Tarefa
        </button>
      </div>
    </div>
  )
}

// ─── Inline Add Row ───────────────────────────────────────────────────────────

function InlineAddRow({ project, onAdd }: { project: string; onAdd: (name: string, project: string) => Promise<void> }) {
  const [active, setActive] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const submit = async () => {
    if (!name.trim()) { setActive(false); return }
    setSaving(true)
    await onAdd(name.trim(), project)
    setName(''); setSaving(false); setActive(false)
  }

  if (!active) {
    return (
      <button
        onClick={() => { setActive(true); setTimeout(() => ref.current?.focus(), 30) }}
        className="flex items-center gap-2 w-full text-left py-2 px-4 pl-10 text-sm text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/20 transition-colors border-t border-zinc-800/30 group"
      >
        <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span>Adicionar tarefa...</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-4 pl-10 border-t border-zinc-800/30 bg-zinc-900/40">
      {saving ? <Loader2 className="w-4 h-4 text-zinc-500 animate-spin flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-600 flex-shrink-0" />}
      <input
        ref={ref}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setActive(false); setName('') } }}
        onBlur={submit}
        placeholder="Nome da tarefa"
        className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
      />
      <span className="text-xs text-zinc-600 hidden sm:block">Enter · Esc</span>
    </div>
  )
}

// ─── Task List View ───────────────────────────────────────────────────────────

interface TaskSection { label: string; tasks: LocalTask[] }

function TaskListView({
  sections, onToggleDone, onSelect, onAddTask, selectedId, showProjectColumn,
}: {
  sections: TaskSection[]
  onToggleDone: (task: LocalTask) => void
  onSelect: (task: LocalTask) => void
  onAddTask: (name: string, project: string) => Promise<void>
  selectedId?: string
  showProjectColumn?: boolean
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleCollapse = (label: string) => setCollapsed(prev => ({ ...prev, [label]: !prev[label] }))

  if (sections.length === 0 || sections.every(s => s.tasks.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-zinc-800/30 rounded-2xl flex items-center justify-center mb-4 border border-dashed border-zinc-700/60">
          <PlayCircle className="w-8 h-8 text-zinc-700" />
        </div>
        <p className="text-base text-zinc-400 font-medium">Sprint em branco</p>
        <p className="text-sm text-zinc-600 mt-1 max-w-xs">Esta sprint não tem tarefas ainda. Clique em &ldquo;Adicionar uma tarefa&rdquo; para começar do zero.</p>
      </div>
    )
  }

  const cols = showProjectColumn
    ? '1fr 140px 160px 150px 36px'
    : '1fr 160px 150px 36px'

  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
      {/* Column headers */}
      <div className="grid border-b border-zinc-800 bg-zinc-900/60" style={{ gridTemplateColumns: cols }}>
        <div className="py-2.5 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Nome</div>
        {showProjectColumn && <div className="py-2.5 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5"><Briefcase className="w-3 h-3" />Projeto</div>}
        <div className="py-2.5 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5"><User className="w-3 h-3" />Responsável</div>
        <div className="py-2.5 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3 h-3" />Prazo</div>
        <div className="py-2.5 px-2 flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-zinc-700" /></div>
      </div>

      {sections.map((section, si) => {
        const isCollapsed = collapsed[section.label]
        return (
          <div key={section.label || si} className={si > 0 ? 'border-t border-zinc-800/60' : ''}>
            {section.label && (
              <div
                className="grid cursor-pointer hover:bg-zinc-800/30 transition-colors bg-zinc-900/20"
                style={{ gridTemplateColumns: cols }}
                onClick={() => toggleCollapse(section.label)}
              >
                <div className="py-2.5 px-4 flex items-center gap-2">
                  <ChevronRight className={`w-3.5 h-3.5 text-zinc-500 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-90'}`} />
                  <span className="text-sm font-semibold text-zinc-200">{section.label}</span>
                  <span className="text-[11px] text-zinc-600 bg-zinc-800/80 px-1.5 py-0.5 rounded-full">{section.tasks.length}</span>
                </div>
                {showProjectColumn && <div />}
                <div /><div /><div />
              </div>
            )}

            {!isCollapsed && (
              <>
                {section.tasks.map(task => {
                  const done = task.status === 'done'
                  const inProgress = task.status === 'in_progress'
                  const overdue = isOverdue(task.due, task.status)
                  const isSelected = selectedId === task.id

                  return (
                    <div
                      key={task.id}
                      className={`grid border-t border-zinc-800/30 hover:bg-zinc-800/25 transition-colors cursor-pointer ${isSelected ? 'bg-zinc-800/40 border-l-2 border-l-emerald-500' : ''}`}
                      style={{ gridTemplateColumns: cols }}
                      onClick={() => onSelect(task)}
                    >
                      <div className={`py-2.5 px-4 flex items-center gap-3 ${section.label ? 'pl-10' : 'pl-5'}`}>
                        <button
                          onClick={e => { e.stopPropagation(); onToggleDone(task) }}
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            done ? 'bg-emerald-500 border-emerald-500' : inProgress ? 'border-blue-500 hover:border-emerald-400' : 'border-zinc-600 hover:border-emerald-400'
                          }`}
                        >
                          {done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          {inProgress && !done && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        </button>
                        <span className={`text-sm leading-snug ${done ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>{task.name}</span>
                        {task.tags.length > 0 && (
                          <div className="hidden lg:flex items-center gap-1 ml-1">
                            {task.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {showProjectColumn && (
                        <div className="py-2.5 px-3 flex items-center">
                          {task.project ? <span className="text-xs text-zinc-500 truncate max-w-[120px]">{task.project}</span> : null}
                        </div>
                      )}

                      <div className="py-2.5 px-3 flex items-center">
                        {task.assignee ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" title={task.assignee}>
                            {task.assignee.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-dashed border-zinc-700 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <User className="w-3 h-3 text-zinc-700" />
                          </div>
                        )}
                      </div>

                      <div className="py-2.5 px-3 flex items-center">
                        {task.due ? (
                          <span className={`text-xs ${overdue && !done ? 'text-rose-400 font-medium' : done ? 'text-zinc-600 line-through' : 'text-zinc-400'}`}>
                            {fmtDate(task.due)}
                          </span>
                        ) : null}
                      </div>

                      <div />
                    </div>
                  )
                })}
                <InlineAddRow project={section.label} onAdd={onAddTask} />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({ tasks, onSelect, onToggleDone }: { tasks: LocalTask[]; onSelect: (t: LocalTask) => void; onToggleDone: (t: LocalTask) => void }) {
  const columns: { key: TaskStatus; label: string; color: string; border: string }[] = [
    { key: 'not_started', label: 'Não Iniciadas', color: 'text-zinc-400', border: 'border-zinc-700/50' },
    { key: 'in_progress', label: 'Em Andamento', color: 'text-blue-400', border: 'border-blue-500/20' },
    { key: 'done', label: 'Concluídas', color: 'text-emerald-400', border: 'border-emerald-500/20' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key)
        return (
          <div key={col.key}>
            <div className={`flex items-center gap-2 px-3 py-2 mb-3 border-b-2 ${col.border}`}>
              <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
              <span className="ml-auto text-xs text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">{colTasks.length}</span>
            </div>
            <div className="space-y-2.5">
              {colTasks.map(t => {
                const overdue = isOverdue(t.due, t.status)
                const done = t.status === 'done'
                return (
                  <div key={t.id} onClick={() => onSelect(t)} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 cursor-pointer hover:border-zinc-700 hover:bg-zinc-800/50 transition-all">
                    <div className="flex items-start gap-3">
                      <button onClick={e => { e.stopPropagation(); onToggleDone(t) }} className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-emerald-400'}`}>
                        {done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${done ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>{t.name}</p>
                        {t.project && <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><Briefcase className="w-3 h-3" />{t.project}</p>}
                      </div>
                    </div>
                    {(t.assignee || t.due) && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                        {t.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-[9px] font-bold text-white">{t.assignee.charAt(0).toUpperCase()}</div>
                            <span className="text-xs text-zinc-500">{t.assignee}</span>
                          </div>
                        ) : <span />}
                        {t.due && <span className={`text-xs ${overdue && !done ? 'text-rose-400' : 'text-zinc-600'}`}>{fmtDate(t.due)}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
              {colTasks.length === 0 && <div className="text-center py-10 text-zinc-700 text-sm border-2 border-dashed border-zinc-800 rounded-xl">Nenhuma tarefa</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Tasks() {
  const [tasks, setTasks] = useState<LocalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [search, setSearch] = useState('')
  const [selectedTask, setSelectedTask] = useState<LocalTask | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalTask, setModalTask] = useState<LocalTask | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [showSprintManager, setShowSprintManager] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [sprints, setSprints] = useState<TaskSprint[]>([])
  const [users, setUsers] = useState<AppUser[]>([])

  // Navigation state
  const [selectedProject, setSelectedProject] = useState<string>('') // '' = all
  const [selectedSprint, setSelectedSprint] = useState<string>('') // '' = all, '_backlog_' = no sprint

  // Extra projects created via "+" (without tasks yet)
  const [extraProjects, setExtraProjects] = useState<string[]>([])

  useEffect(() => {
    tasksApi.getTasks()
      .then(r => setTasks(r.tasks && r.tasks.length > 0 ? r.tasks.map(apiToLocal) : MOCK_TASKS.map(mockToLocal)))
      .catch(() => { setTasks(MOCK_TASKS.map(mockToLocal)); toast.error('Usando dados locais') })
      .finally(() => setLoading(false))
    taskSprintsApi.list().then(r => setSprints(r.sprints || [])).catch(() => {})
    authApi.getUsers().then(r => setUsers(r.users || [])).catch(() => {})
  }, [])

  // Projects from tasks + extra
  const projects = useMemo(() => {
    const fromTasks = Array.from(new Set(tasks.map(t => t.project).filter(Boolean))) as string[]
    const all = Array.from(new Set([...fromTasks, ...extraProjects])).sort()
    return all
  }, [tasks, extraProjects])

  // Filtered tasks
  const filtered = useMemo(() => {
    let result = tasks
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.project.toLowerCase().includes(q) || t.assignee.toLowerCase().includes(q))
    }
    if (selectedProject) result = result.filter(t => t.project === selectedProject)
    if (selectedSprint === '_backlog_') result = result.filter(t => !t.sprintId)
    else if (selectedSprint) result = result.filter(t => t.sprintId === selectedSprint)
    return result
  }, [tasks, search, selectedProject, selectedSprint])

  // Build sections for list view
  const sections: TaskSection[] = useMemo(() => {
    if (selectedProject) {
      // Within a project: group by sprint if sprint view, else flat
      if (selectedSprint === '' && sprints.length > 0) {
        const sprintMap = new Map<string, LocalTask[]>()
        filtered.forEach(t => {
          const sprint = t.sprintId ? (sprints.find(s => s.id === t.sprintId)?.name ?? 'Sprint') : 'Backlog'
          if (!sprintMap.has(sprint)) sprintMap.set(sprint, [])
          sprintMap.get(sprint)!.push(t)
        })
        const withSprint = sprints
          .filter(s => sprintMap.has(s.name))
          .map(s => ({ label: s.name, tasks: sprintMap.get(s.name)! }))
        const backlog = sprintMap.get('Backlog') ? [{ label: 'Backlog', tasks: sprintMap.get('Backlog')! }] : []
        return [...withSprint, ...backlog]
      }
      return [{ label: '', tasks: filtered }]
    }
    // All projects: group by project
    const map = new Map<string, LocalTask[]>()
    filtered.forEach(t => {
      const key = t.project || 'Sem projeto'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    })
    const named = Array.from(map.entries()).filter(([k]) => k !== 'Sem projeto').sort(([a], [b]) => a.localeCompare(b))
    const unnamed = Array.from(map.entries()).filter(([k]) => k === 'Sem projeto')
    return [...named, ...unnamed].map(([label, tasks]) => ({ label, tasks }))
  }, [filtered, selectedProject, selectedSprint, sprints])

  const handleSaved = (task: LocalTask) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id)
      if (idx >= 0) { const copy = [...prev]; copy[idx] = task; return copy }
      return [task, ...prev]
    })
    if (selectedTask?.id === task.id) setSelectedTask(task)
  }

  const handleDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    if (selectedTask?.id === id) setSelectedTask(null)
  }

  const handleToggleDone = async (task: LocalTask) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'not_started' : 'done'
    const optimistic = { ...task, status: newStatus }
    handleSaved(optimistic)
    if (selectedTask?.id === task.id) setSelectedTask(optimistic)
    try {
      const apiStatus = newStatus === 'done' ? 'completed' : newStatus as 'not_started' | 'in_progress'
      await tasksApi.updateTask(task.id, { status: apiStatus })
    } catch {
      handleSaved(task)
      toast.error('Erro ao atualizar tarefa')
    }
  }

  const handleInlineAdd = async (name: string, project: string) => {
    try {
      const effectiveProject = project || selectedProject || undefined
      const effectiveSprint = selectedSprint && selectedSprint !== '_backlog_' ? selectedSprint : undefined
      const saved = await tasksApi.createTask({ name, project: effectiveProject, status: 'not_started', sprintId: effectiveSprint })
      setTasks(prev => [...prev, apiToLocal(saved)])
    } catch { toast.error('Erro ao criar tarefa') }
  }

  const activeSprint = selectedSprint && selectedSprint !== '_backlog_' ? sprints.find(s => s.id === selectedSprint) : null

  // Stats for current view
  const totalTasks = filtered.length
  const doneTasks = filtered.filter(t => t.status === 'done').length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const viewTabs = [
    { key: 'list', label: 'Lista', icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
    { key: 'kanban', label: 'Quadro', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">

      {/* ── Top bar with project tabs ── */}
      <div className="bg-zinc-900/80 border-b border-zinc-800 px-6 pt-4 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-zinc-50">Tarefas</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAI(true)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 bg-indigo-600/5 hover:bg-indigo-600/10 px-3 py-1.5 rounded-lg transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />IA
            </button>
          </div>
        </div>

        {/* Project tabs */}
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => { setSelectedProject(''); setSelectedSprint('') }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
              selectedProject === '' ? 'border-emerald-500 text-zinc-50' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Todos os projetos
          </button>
          {projects.map(proj => (
            <button
              key={proj}
              onClick={() => { setSelectedProject(proj); setSelectedSprint('') }}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px max-w-[180px] ${
                selectedProject === proj ? 'border-emerald-500 text-zinc-50' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="truncate">{proj}</span>
            </button>
          ))}
          <button
            onClick={() => setShowAddProject(true)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-600 hover:text-zinc-400 border-b-2 border-transparent -mb-px transition-colors whitespace-nowrap"
            title="Novo projeto"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Sprint bar ── */}
      <div className="border-b border-zinc-800 px-6 py-2 flex items-center gap-2 bg-zinc-950/60 shrink-0 overflow-x-auto scrollbar-none">
        <PlayCircle className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
        <span className="text-xs text-zinc-600 font-medium mr-1 flex-shrink-0">Sprint:</span>

        <button
          onClick={() => setSelectedSprint('')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            selectedSprint === '' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
          }`}
        >
          Todos
        </button>

        {sprints.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSprint(s.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedSprint === s.id ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
            }`}
          >
            {s.name}
            {s.endDate && <span className="text-zinc-600 font-normal">· {fmtDate(s.endDate)}</span>}
          </button>
        ))}

        <button
          onClick={() => setSelectedSprint('_backlog_')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            selectedSprint === '_backlog_' ? 'bg-zinc-700/80 text-zinc-300 border border-zinc-600' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
          }`}
        >
          Backlog
        </button>

        {/* Inline sprint create */}
        <InlineSprintCreate
          onCreated={sprint => {
            setSprints(prev => [...prev, sprint])
            setSelectedSprint(sprint.id)
          }}
        />

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {totalTasks > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-zinc-600">{doneTasks}/{totalTasks}</span>
            </div>
          )}
          <button
            onClick={() => setShowSprintManager(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 hover:bg-zinc-800 rounded-lg transition-all"
            title="Ver e remover sprints"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Active sprint info bar ── */}
      {activeSprint && (
        <div className="border-b border-zinc-800 px-6 py-2 bg-emerald-500/5 flex items-center gap-3 shrink-0">
          <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium text-emerald-400">{activeSprint.name}</span>
          {(activeSprint.startDate || activeSprint.endDate) && (
            <span className="text-xs text-zinc-500">
              {activeSprint.startDate ? fmtDateFull(activeSprint.startDate) : '—'} → {activeSprint.endDate ? fmtDateFull(activeSprint.endDate) : '—'}
            </span>
          )}
          <span className="text-xs text-zinc-600 ml-auto">{doneTasks} de {totalTasks} concluídas</span>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="border-b border-zinc-800 px-6 py-2.5 flex items-center gap-3 bg-zinc-950 shrink-0">
        <button
          onClick={() => { setModalTask(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />Adicionar uma tarefa
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        <div className="w-px h-5 bg-zinc-800 mx-1" />

        <div className="flex items-center gap-0.5">
          {viewTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as 'list' | 'kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                view === tab.key ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800">
          <Filter className="w-3.5 h-3.5" />Filtrar
        </button>
        <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800">
          <ArrowUpDown className="w-3.5 h-3.5" />Ordenar
        </button>
        <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800">
          <MoreHorizontal className="w-3.5 h-3.5" />Opções
        </button>

        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar"
            className="pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-all w-48"
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div className={`flex-1 overflow-auto transition-all ${selectedTask ? 'pr-[380px]' : ''}`}>
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
            </div>
          ) : view === 'list' ? (
            <TaskListView
              sections={sections}
              onToggleDone={handleToggleDone}
              onSelect={t => setSelectedTask(prev => prev?.id === t.id ? null : t)}
              onAddTask={handleInlineAdd}
              selectedId={selectedTask?.id}
              showProjectColumn={!selectedProject}
            />
          ) : (
            <KanbanView
              tasks={filtered}
              onSelect={t => setSelectedTask(prev => prev?.id === t.id ? null : t)}
              onToggleDone={handleToggleDone}
            />
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selectedTask && (
        <DetailPanel
          task={selectedTask}
          sprints={sprints}
          onClose={() => setSelectedTask(null)}
          onEdit={() => { setModalTask(selectedTask); setShowModal(true) }}
          onDelete={() => handleDelete(selectedTask.id)}
          onChange={updated => { handleSaved(updated); setSelectedTask(updated) }}
        />
      )}

      {/* ── Modals ── */}
      {showModal && (
        <TaskModal
          task={modalTask}
          onClose={() => { setShowModal(false); setModalTask(null) }}
          onSaved={handleSaved}
          sprints={sprints}
          defaultProject={selectedProject || undefined}
          defaultSprintId={selectedSprint && selectedSprint !== '_backlog_' ? selectedSprint : undefined}
          users={users}
          allProjects={projects}
        />
      )}
      {showAI && (
        <AIModal
          onClose={() => setShowAI(false)}
          onGenerated={newTasks => setTasks(prev => [...newTasks, ...prev])}
        />
      )}
      {showSprintManager && (
        <SprintManagerModal
          sprints={sprints}
          onClose={() => setShowSprintManager(false)}
          onRefresh={updated => setSprints(updated)}
        />
      )}
      {showAddProject && (
        <AddProjectModal
          onClose={() => setShowAddProject(false)}
          onAdd={name => {
            setExtraProjects(prev => prev.includes(name) ? prev : [...prev, name])
            setSelectedProject(name)
            setSelectedSprint('')
          }}
        />
      )}
    </div>
  )
}

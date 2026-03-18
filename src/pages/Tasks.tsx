import React, { useEffect, useState, useRef } from 'react'
import {
  Plus, X, Loader2, Clock, PlayCircle, CheckCircle2,
  Trash2, Sparkles, Calendar, User, Briefcase, AlertCircle,
  List, LayoutGrid, Search, Tag, Timer, Flag,
  ChevronDown, Hash, FileText, Pencil, Zap, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, isPast, differenceInDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { tasksApi, taskSprintsApi } from '../lib/api'
import type { Task, TaskSprint } from '../lib/api'
import { MOCK_TASKS } from '../data/mockData'
import type { MockTask, TaskPriority, TaskStatus } from '../data/mockData'

// ─── Extended Task type ───────────────────────────────────────────────────────

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
}

function mockToLocal(m: MockTask): LocalTask {
  return {
    id: m.id,
    project: m.project,
    name: m.name,
    description: m.description ?? '',
    status: m.status,
    priority: m.priority,
    due: m.due,
    assignee: m.assignee,
    tags: m.tags ?? [],
    estimatedHours: m.estimatedHours,
    completedAt: m.completedAt,
    createdAt: m.createdAt,
  }
}

function apiToLocal(t: Task): LocalTask {
  return {
    id: t.id,
    project: t.project ?? '',
    name: t.name,
    description: '',
    status: (t.status === 'completed' ? 'done' : t.status) as TaskStatus,
    priority: 'medium',
    due: t.due ?? '',
    assignee: t.assignee ?? '',
    tags: [],
    estimatedHours: undefined,
    completedAt: undefined,
    createdAt: t.createdAt,
    sprintId: t.sprintId ?? '',
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  urgent: { label: 'Urgente',  color: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/20',   dot: 'bg-rose-400' },
  high:   { label: 'Alta',     color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  dot: 'bg-amber-400' },
  medium: { label: 'Média',    color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   dot: 'bg-blue-400' },
  low:    { label: 'Baixa',    color: 'text-zinc-400',   bg: 'bg-zinc-800',      border: 'border-zinc-700',      dot: 'bg-zinc-500' },
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  not_started: { label: 'Não Iniciada', color: 'text-zinc-400',    bg: 'bg-zinc-800',      border: 'border-zinc-700',      icon: Clock },
  in_progress: { label: 'Em Andamento', color: 'text-blue-400',    bg: 'bg-blue-500/20',   border: 'border-blue-500/30',   icon: PlayCircle },
  done:        { label: 'Concluída',    color: 'text-emerald-400', bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',icon: CheckCircle2 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—'
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }) } catch { return d }
}

function isOverdue(due?: string, status?: TaskStatus) {
  if (!due || status === 'done') return false
  try { return isPast(startOfDay(parseISO(due))) } catch { return false }
}

function overdueLabel(due: string) {
  try {
    const days = differenceInDays(startOfDay(new Date()), startOfDay(parseISO(due)))
    return days === 1 ? 'Vencida há 1 dia' : `Vencida há ${days} dias`
  } catch { return 'Vencida' }
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const c = PRIORITY_CONFIG[priority]
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${c.bg} ${c.color} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskStatus }) {
  const c = STATUS_CONFIG[status]
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${c.bg} ${c.color} border ${c.border}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  )
}

// ─── Tag input ────────────────────────────────────────────────────────────────

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
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="text-zinc-500 hover:text-rose-400 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        placeholder={tags.length === 0 ? 'Adicionar tag e pressionar Enter...' : ''}
        className="flex-1 min-w-[140px] bg-transparent text-xs text-zinc-300 placeholder:text-zinc-600 outline-none"
      />
    </div>
  )
}

// ─── Task Modal ───────────────────────────────────────────────────────────────

function TaskModal({ task, onClose, onSaved, sprints, defaultSprintId }: {
  task?: LocalTask | null
  onClose: () => void
  onSaved: (t: LocalTask) => void
  sprints: TaskSprint[]
  defaultSprintId?: string
}) {
  const [form, setForm] = useState<Omit<LocalTask, 'id' | 'createdAt' | 'completedAt'>>({
    name: task?.name ?? '',
    project: task?.project ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'not_started',
    priority: task?.priority ?? 'medium',
    due: task?.due ?? '',
    assignee: task?.assignee ?? '',
    tags: task?.tags ?? [],
    estimatedHours: task?.estimatedHours,
    sprintId: task?.sprintId ?? defaultSprintId ?? '',
  })
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
      const apiStatus = form.status === 'done' ? 'completed' : form.status as 'not_started' | 'in_progress'
      let saved: Task
      if (task) {
        saved = await tasksApi.updateTask(task.id, {
          name: form.name, project: form.project || undefined,
          assignee: form.assignee || undefined, due: form.due || undefined,
          status: apiStatus, sprintId: form.sprintId || undefined,
        }) as Task
      } else {
        saved = await tasksApi.createTask({
          name: form.name, project: form.project || undefined,
          assignee: form.assignee || undefined, due: form.due || undefined,
          status: apiStatus, sprintId: form.sprintId || undefined,
        }) as Task
      }
      const local: LocalTask = {
        ...apiToLocal(saved),
        description: form.description,
        priority: form.priority,
        tags: form.tags,
        estimatedHours: form.estimatedHours,
        status: form.status,
        due: form.due || saved.due || '',
        project: form.project,
        assignee: form.assignee,
        sprintId: form.sprintId,
      }
      toast.success(task ? 'Tarefa atualizada!' : 'Tarefa criada!')
      onSaved(local)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
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
                <label className={labelCls}>Projeto / Cliente</label>
                <input value={form.project} onChange={e => set('project', e.target.value)} placeholder="Nome do projeto" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Responsável</label>
                <input value={form.assignee} onChange={e => set('assignee', e.target.value)} placeholder="Quem vai fazer?" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Prioridade</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value as TaskPriority)} className={selectCls}>
                  <option value="urgent">🔴 Urgente</option>
                  <option value="high">🟠 Alta</option>
                  <option value="medium">🔵 Média</option>
                  <option value="low">⚪ Baixa</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value as TaskStatus)} className={selectCls}>
                  <option value="not_started">Não Iniciada</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="done">Concluída</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Prazo</label>
                <input type="date" value={form.due} onChange={e => set('due', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Horas Estimadas</label>
                <input type="number" min={0} step={0.5} value={form.estimatedHours ?? ''} onChange={e => set('estimatedHours', e.target.value ? Number(e.target.value) : undefined)} placeholder="0" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Descrição</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detalhes sobre a tarefa..." rows={3} className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all" />
            </div>

            <div>
              <label className={labelCls}>Tags</label>
              <TagInput tags={form.tags} onChange={t => set('tags', t)} />
            </div>

            {sprints.length > 0 && (
              <div>
                <label className={labelCls}>Sprint</label>
                <select value={form.sprintId ?? ''} onChange={e => set('sprintId', e.target.value)} className={selectCls}>
                  <option value="">Sem sprint</option>
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
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

// ─── AI Generate Modal ────────────────────────────────────────────────────────

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
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-semibold text-zinc-50">Gerar Tarefas com IA</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-50 transition-colors p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {preview.length === 0 ? (
            <>
              <p className="text-sm text-zinc-400">Descreva o que precisa ser feito e a IA vai extrair as tarefas:</p>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ex: Criar site para cliente João, desenvolver landing page, integrar formulário, configurar domínio e fazer SEO..." rows={5} className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-medium text-zinc-300">{preview.length} tarefa{preview.length !== 1 ? 's' : ''} encontrada{preview.length !== 1 ? 's' : ''}. Confirme para criar:</p>
              </div>
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
          {preview.length > 0
            ? <button onClick={() => setPreview([])} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">Voltar</button>
            : <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">Cancelar</button>
          }
          {preview.length === 0
            ? <button onClick={handleGenerate} disabled={loading || !text.trim()} className="flex items-center gap-2 px-5 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 text-sm font-medium rounded-xl transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Gerando...' : 'Gerar Tarefas'}
              </button>
            : <button onClick={handleConfirm} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? 'Criando...' : 'Criar Tarefas'}
              </button>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ task, onClose, onEdit, onDelete, onChange }: {
  task: LocalTask
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onChange: (t: LocalTask) => void
}) {
  const [desc, setDesc] = useState(task.description)
  const [deleting, setDeleting] = useState(false)
  const overdue = isOverdue(task.due, task.status)
  const sc = STATUS_CONFIG[task.status]
  const pc = PRIORITY_CONFIG[task.priority]

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await tasksApi.deleteTask(task.id)
      toast.success('Tarefa excluída!')
      onDelete()
    } catch { toast.error('Erro ao excluir') }
    finally { setDeleting(false) }
  }

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      const apiStatus = status === 'done' ? 'completed' : status as 'not_started' | 'in_progress'
      await tasksApi.updateTask(task.id, { status: apiStatus })
      onChange({ ...task, status })
    } catch { toast.error('Erro ao atualizar status') }
  }

  const saveDesc = async () => {
    onChange({ ...task, description: desc })
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 z-40 flex flex-col shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Detalhes</span>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-50 transition-colors px-2 py-1 bg-zinc-800 rounded-lg">
            <Pencil className="w-3 h-3" /> Editar
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-50 transition-colors p-1"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Name + project */}
        <div>
          <p className="text-base font-bold text-zinc-50 leading-snug">{task.name}</p>
          {task.project && (
            <div className="flex items-center gap-1.5 mt-1">
              <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-sm text-zinc-400">{task.project}</span>
            </div>
          )}
        </div>

        {/* Status + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Status</p>
            <select
              value={task.status}
              onChange={e => handleStatusChange(e.target.value as TaskStatus)}
              className={`w-full text-xs border rounded-lg px-2.5 py-2 font-semibold cursor-pointer appearance-none focus:outline-none ${sc.bg} ${sc.color} border-${sc.border}`}
              style={{ borderColor: 'var(--tw-border-opacity)' }}
            >
              <option value="not_started">Não Iniciada</option>
              <option value="in_progress">Em Andamento</option>
              <option value="done">Concluída</option>
            </select>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Prioridade</p>
            <div className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-2 rounded-lg w-full ${pc.bg} ${pc.color} border ${pc.border}`}>
              <span className={`w-2 h-2 rounded-full ${pc.dot}`} />
              {pc.label}
            </div>
          </div>
        </div>

        {/* Due */}
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Prazo</p>
          {task.due ? (
            <div className={`flex items-center gap-2 text-sm ${overdue ? 'text-rose-400' : 'text-zinc-300'}`}>
              {overdue ? <AlertCircle className="w-4 h-4" /> : <Calendar className="w-4 h-4 text-zinc-500" />}
              <span>{overdue ? overdueLabel(task.due) : fmtDate(task.due)}</span>
            </div>
          ) : <span className="text-sm text-zinc-600">Sem prazo</span>}
        </div>

        {/* Assignee */}
        {task.assignee && (
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Responsável</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                {task.assignee.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-zinc-300">{task.assignee}</span>
            </div>
          </div>
        )}

        {/* Estimated hours */}
        {task.estimatedHours != null && (
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Horas Estimadas</p>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Timer className="w-4 h-4 text-zinc-500" />
              <span>{task.estimatedHours}h</span>
            </div>
          </div>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map(t => (
                <span key={t} className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Hash className="w-3 h-3 text-zinc-500" />{t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Descrição</p>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            onBlur={saveDesc}
            placeholder="Adicionar descrição..."
            rows={4}
            className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Excluir Tarefa
        </button>
      </div>
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ tasks, onSelect, selectedId }: {
  tasks: LocalTask[]
  onSelect: (t: LocalTask) => void
  selectedId?: string
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[40vh] text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 border border-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <p className="text-xl text-zinc-50 font-bold tracking-tight">Nenhuma tarefa encontrada</p>
        <p className="text-zinc-400 text-sm mt-2">Crie uma nova tarefa ou ajuste os filtros.</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden shadow-xl shadow-black/10">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-800/50 text-xs font-semibold text-zinc-400 bg-zinc-900/30">
            <th className="py-3.5 px-5 uppercase tracking-wider">Tarefa</th>
            <th className="py-3.5 px-5 uppercase tracking-wider hidden md:table-cell">Projeto</th>
            <th className="py-3.5 px-5 uppercase tracking-wider">Prioridade</th>
            <th className="py-3.5 px-5 uppercase tracking-wider hidden lg:table-cell">Responsável</th>
            <th className="py-3.5 px-5 uppercase tracking-wider">Prazo</th>
            <th className="py-3.5 px-5 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {tasks.map(t => {
            const overdue = isOverdue(t.due, t.status)
            const isSelected = selectedId === t.id
            return (
              <tr
                key={t.id}
                onClick={() => onSelect(t)}
                className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors cursor-pointer last:border-0 ${overdue ? 'border-l-2 border-l-rose-500' : ''} ${isSelected ? 'bg-zinc-800/60' : ''}`}
              >
                <td className="py-4 px-5">
                  <p className="font-medium text-zinc-100 truncate max-w-[220px]">{t.name}</p>
                  {t.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {t.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">#{tag}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-4 px-5 hidden md:table-cell">
                  <span className="text-zinc-400 text-xs">{t.project || '—'}</span>
                </td>
                <td className="py-4 px-5">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="py-4 px-5 hidden lg:table-cell">
                  {t.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {t.assignee.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-zinc-400 text-xs">{t.assignee}</span>
                    </div>
                  ) : <span className="text-zinc-600">—</span>}
                </td>
                <td className="py-4 px-5">
                  {t.due ? (
                    <span className={`text-xs ${overdue ? 'text-rose-400 font-medium' : 'text-zinc-400'}`}>
                      {overdue ? overdueLabel(t.due) : fmtDate(t.due)}
                    </span>
                  ) : <span className="text-zinc-600 text-xs">—</span>}
                </td>
                <td className="py-4 px-5">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({ tasks, onSelect }: { tasks: LocalTask[]; onSelect: (t: LocalTask) => void }) {
  const columns: { key: TaskStatus; label: string; color: string; border: string; icon: React.ElementType }[] = [
    { key: 'not_started', label: 'Não Iniciadas', color: 'text-zinc-400',    border: 'border-zinc-700',       icon: Clock },
    { key: 'in_progress', label: 'Em Andamento',  color: 'text-blue-400',    border: 'border-blue-500/30',    icon: PlayCircle },
    { key: 'done',        label: 'Concluídas',    color: 'text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle2 },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key)
        const hasUrgent = colTasks.some(t => t.priority === 'urgent')
        const Icon = col.icon
        return (
          <div key={col.key}>
            <div className={`flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border ${col.border} rounded-2xl mb-3`}>
              <Icon className={`w-4 h-4 ${col.color}`} />
              <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
              <div className="ml-auto flex items-center gap-1.5">
                {hasUrgent && <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full font-bold">URGENTE</span>}
                <span className="text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
            </div>
            <div className="space-y-3">
              {colTasks.map(t => {
                const overdue = isOverdue(t.due, t.status)
                const pc = PRIORITY_CONFIG[t.priority]
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelect(t)}
                    className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 cursor-pointer shadow-xl shadow-black/20 hover:border-emerald-500/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-zinc-100 flex-1 leading-snug">{t.name}</p>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    {t.project && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
                        <Briefcase className="w-3 h-3" />{t.project}
                      </div>
                    )}
                    {t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {t.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">#{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                      {t.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-[9px] font-bold text-white">
                            {t.assignee.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-zinc-500">{t.assignee}</span>
                        </div>
                      ) : <span />}
                      {t.due && (
                        <span className={`text-xs ${overdue ? 'text-rose-400' : 'text-zinc-500'}`}>
                          {overdue ? '⚠ Vencida' : fmtDate(t.due)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {colTasks.length === 0 && (
                <div className="text-center py-8 text-zinc-600 text-sm border-2 border-dashed border-zinc-800 rounded-2xl">
                  Nenhuma tarefa
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Sprint Sidebar ───────────────────────────────────────────────────────────

function SprintSidebar({
  sprints, activeSprint, onSelect, onCreate, onDelete,
}: {
  sprints: TaskSprint[]
  activeSprint: string | null
  onSelect: (id: string | null) => void
  onCreate: (name: string, startDate: string, endDate: string) => void
  onDelete: (id: string) => void
}) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')

  const handleCreate = () => {
    if (!newName.trim()) return
    onCreate(newName.trim(), newStart, newEnd)
    setNewName(''); setNewStart(''); setNewEnd(''); setCreating(false)
  }

  return (
    <div className="w-56 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="px-4 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={14} className="text-indigo-400" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Sprint</span>
        </div>
        <p className="text-[11px] text-zinc-600">Grupos semanais</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${activeSprint === null ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
        >
          <List size={13} />
          Todos
        </button>

        {sprints.map(s => (
          <div key={s.id} className={`group flex items-center gap-1 rounded-lg transition-colors ${activeSprint === s.id ? 'bg-indigo-600/15' : 'hover:bg-zinc-800/50'}`}>
            <button
              onClick={() => onSelect(s.id)}
              className={`flex-1 text-left px-3 py-2 text-sm flex items-center gap-2 ${activeSprint === s.id ? 'text-indigo-300 font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <ChevronRight size={12} className={activeSprint === s.id ? 'text-indigo-400' : 'text-zinc-600'} />
              {s.name}
            </button>
            <button
              onClick={() => onDelete(s.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-zinc-600 hover:text-rose-400 transition-all rounded"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-zinc-800">
        {creating ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Nome do sprint..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-indigo-500/50" />
              <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div className="flex gap-1.5">
              <button onClick={handleCreate} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg py-1.5 transition-colors">Criar</button>
              <button onClick={() => { setCreating(false); setNewName('') }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg py-1.5 transition-colors">Cancelar</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1 px-1"
          >
            <Plus size={13} /> Nova Sprint
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type GroupBy = 'none' | 'project' | 'assignee'

export default function Tasks() {
  const [tasks, setTasks] = useState<LocalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [selectedTask, setSelectedTask] = useState<LocalTask | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalTask, setModalTask] = useState<LocalTask | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [sprints, setSprints] = useState<TaskSprint[]>([])
  const [activeSprint, setActiveSprint] = useState<string | null>(null)

  useEffect(() => {
    tasksApi.getTasks()
      .then(r => {
        if (r.tasks && r.tasks.length > 0) {
          setTasks(r.tasks.map(apiToLocal))
        } else {
          setTasks(MOCK_TASKS.map(mockToLocal))
        }
      })
      .catch(() => {
        setTasks(MOCK_TASKS.map(mockToLocal))
        toast.error('Usando dados locais')
      })
      .finally(() => setLoading(false))

    taskSprintsApi.list()
      .then(r => setSprints(r.sprints || []))
      .catch(() => {})
  }, [])

  const handleCreateSprint = async (name: string, startDate: string, endDate: string) => {
    try {
      const r = await taskSprintsApi.create({ name, startDate, endDate })
      setSprints(prev => [...prev, r.sprint])
      setActiveSprint(r.sprint.id)
      toast.success(`Sprint "${name}" criado!`)
    } catch {
      toast.error('Erro ao criar sprint')
    }
  }

  const handleDeleteSprint = async (id: string) => {
    try {
      await taskSprintsApi.delete(id)
      setSprints(prev => prev.filter(s => s.id !== id))
      if (activeSprint === id) setActiveSprint(null)
    } catch {
      toast.error('Erro ao excluir sprint')
    }
  }

  const projects = Array.from(new Set(tasks.map(t => t.project).filter(Boolean)))
  const assignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean)))

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase()
    if (q && !t.name.toLowerCase().includes(q) && !t.project.toLowerCase().includes(q)) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (activeSprint !== null && t.sprintId !== activeSprint) return false
    return true
  })

  // Group tasks into sections when groupBy is active
  const getGroupedSections = (): { label: string; tasks: LocalTask[] }[] => {
    if (groupBy === 'project') {
      const groups: { label: string; tasks: LocalTask[] }[] = []
      const seen = new Set<string>()
      filtered.forEach(t => {
        const key = t.project || '(Sem projeto)'
        if (!seen.has(key)) { seen.add(key); groups.push({ label: key, tasks: [] }) }
      })
      filtered.forEach(t => {
        const key = t.project || '(Sem projeto)'
        const g = groups.find(g => g.label === key)!
        g.tasks.push(t)
      })
      return groups
    }
    if (groupBy === 'assignee') {
      const groups: { label: string; tasks: LocalTask[] }[] = []
      const seen = new Set<string>()
      filtered.forEach(t => {
        const key = t.assignee || '(Sem responsável)'
        if (!seen.has(key)) { seen.add(key); groups.push({ label: key, tasks: [] }) }
      })
      filtered.forEach(t => {
        const key = t.assignee || '(Sem responsável)'
        const g = groups.find(g => g.label === key)!
        g.tasks.push(t)
      })
      return groups
    }
    return [{ label: '', tasks: filtered }]
  }

  const groupedSections = getGroupedSections()

  const displayTasks = activeSprint !== null ? filtered : tasks
  const total = displayTasks.length
  const inProgress = displayTasks.filter(t => t.status === 'in_progress').length
  const done = displayTasks.filter(t => t.status === 'done').length
  const activeSprintName = activeSprint ? sprints.find(s => s.id === activeSprint)?.name : null

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

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-8 py-6 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Tarefas</h1>
          {activeSprintName && (
            <span className="inline-flex items-center gap-1.5 bg-indigo-600/15 border border-indigo-500/20 text-indigo-300 text-sm font-medium px-3 py-1 rounded-full">
              <Zap size={12} /> {activeSprintName}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-zinc-400 mt-1">Gerencie e acompanhe todas as tarefas da equipe</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <SprintSidebar
          sprints={sprints}
          activeSprint={activeSprint}
          onSelect={setActiveSprint}
          onCreate={handleCreateSprint}
          onDelete={handleDeleteSprint}
        />

      <div className={`flex-1 transition-all overflow-auto ${selectedTask ? 'pr-96' : ''}`}>
        <div className="px-8 py-6 space-y-6">

          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: FileText,      label: 'Total',        value: total,      color: 'text-zinc-400',    bg: 'bg-zinc-800' },
              { icon: PlayCircle,    label: 'Em Andamento', value: inProgress, color: 'text-blue-400',    bg: 'bg-blue-500/10' },
              { icon: CheckCircle2,  label: 'Concluídas',   value: done,       color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            ].map(m => (
              <div key={m.label} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-50">{m.value}</p>
                  <p className="text-xs text-zinc-500">{m.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View toggle */}
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid className="w-4 h-4" /></button>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tarefas..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
            </div>

            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as TaskPriority | 'all')}
              className="text-sm border border-zinc-800 rounded-xl px-3 py-2.5 bg-zinc-950 text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer appearance-none"
            >
              <option value="all">Prioridade</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>

            {/* Group by buttons */}
            <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800 gap-0.5">
              {([['none', 'Todos'], ['project', 'Por Projeto'], ['assignee', 'Por Responsável']] as [GroupBy, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setGroupBy(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${groupBy === val ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowAI(true)}
                className="flex items-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Sparkles className="w-4 h-4" /> Criar com IA
              </button>
              <button
                onClick={() => { setModalTask(null); setShowModal(true) }}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl hover:bg-emerald-700 transition-colors font-medium shadow-lg shadow-emerald-900/20"
              >
                <Plus className="w-4 h-4" /> Nova Tarefa
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : groupBy !== 'none' && view === 'list' ? (
            // Grouped sections — each group gets its own table
            <div className="space-y-8">
              {groupedSections.map(section => (
                <div key={section.label}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {groupBy === 'project' ? <Briefcase className="w-4 h-4 text-emerald-500" /> : <User className="w-4 h-4 text-emerald-500" />}
                      <span className="text-sm font-semibold text-zinc-200">{section.label}</span>
                    </div>
                    <span className="text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">{section.tasks.length} tarefa{section.tasks.length !== 1 ? 's' : ''}</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                  <ListView
                    tasks={section.tasks}
                    onSelect={t => setSelectedTask(prev => prev?.id === t.id ? null : t)}
                    selectedId={selectedTask?.id}
                  />
                </div>
              ))}
              {groupedSections.every(s => s.tasks.length === 0) && (
                <div className="flex flex-col items-center justify-center h-[40vh] text-center">
                  <p className="text-xl text-zinc-50 font-bold">Nenhuma tarefa encontrada</p>
                </div>
              )}
            </div>
          ) : view === 'list' ? (
            <ListView
              tasks={filtered}
              onSelect={t => setSelectedTask(prev => prev?.id === t.id ? null : t)}
              selectedId={selectedTask?.id}
            />
          ) : (
            <KanbanView
              tasks={filtered}
              onSelect={t => setSelectedTask(prev => prev?.id === t.id ? null : t)}
            />
          )}
        </div>
      </div>

      </div>

      {/* Detail Panel */}
      {selectedTask && (
        <DetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onEdit={() => { setModalTask(selectedTask); setShowModal(true) }}
          onDelete={() => handleDelete(selectedTask.id)}
          onChange={updated => { handleSaved(updated); setSelectedTask(updated) }}
        />
      )}

      {/* Modals */}
      {showModal && (
        <TaskModal
          task={modalTask}
          onClose={() => { setShowModal(false); setModalTask(null) }}
          onSaved={handleSaved}
          sprints={sprints}
          defaultSprintId={activeSprint ?? undefined}
        />
      )}
      {showAI && (
        <AIModal
          onClose={() => setShowAI(false)}
          onGenerated={newTasks => setTasks(prev => [...newTasks, ...prev])}
        />
      )}
    </div>
  )
}

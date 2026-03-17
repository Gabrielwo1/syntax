import React, { useEffect, useState } from 'react'
import {
  Plus,
  X,
  Loader2,
  CheckSquare,
  Clock,
  PlayCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  Calendar,
  User,
  Briefcase,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { tasksApi } from '../lib/api'
import type { Task } from '../lib/api'

const STATUSES: { key: Task['status']; label: string; icon: React.ReactNode; color: string; bg: string; border: string }[] = [
  { key: 'not_started', label: 'Não Iniciadas', icon: <Clock size={14} />, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  { key: 'in_progress', label: 'Em Andamento', icon: <PlayCircle size={14} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'completed', label: 'Concluídas', icon: <CheckCircle2 size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
]

function formatDate(dateStr?: string) {
  if (!dateStr) return null
  try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR }) } catch { return dateStr }
}

function isOverdue(dateStr?: string) {
  if (!dateStr) return false
  try { return isPast(parseISO(dateStr)) } catch { return false }
}

function TaskModal({ task, onClose, onSaved }: {
  task?: Task | null
  onClose: () => void
  onSaved: (t: Task) => void
}) {
  const [form, setForm] = useState({
    name: task?.name || '',
    project: task?.project || '',
    assignee: task?.assignee || '',
    due: task?.due ? task.due.slice(0, 10) : '',
    status: task?.status || 'not_started',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('Nome é obrigatório'); return }
    setLoading(true)
    try {
      const payload: Partial<Task> = {
        name: form.name,
        project: form.project || undefined,
        assignee: form.assignee || undefined,
        due: form.due || undefined,
        status: form.status as Task['status'],
      }
      let saved: Task
      if (task) {
        saved = await tasksApi.updateTask(task.id, payload) as Task
      } else {
        saved = await tasksApi.createTask(payload) as Task
      }
      toast.success(task ? 'Tarefa atualizada!' : 'Tarefa criada!')
      onSaved(saved)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar tarefa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome da Tarefa *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Descreva a tarefa..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Projeto</label>
              <input value={form.project} onChange={e => set('project', e.target.value)} placeholder="Nome do projeto" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
              <input value={form.assignee} onChange={e => set('assignee', e.target.value)} placeholder="Quem vai fazer?" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prazo</label>
              <input value={form.due} onChange={e => set('due', e.target.value)} type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {task ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AIGenerateModal({ onClose, onGenerated }: {
  onClose: () => void
  onGenerated: (tasks: Task[]) => void
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Task[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleGenerate = async () => {
    if (!text.trim()) { toast.error('Descreva as tarefas'); return }
    setLoading(true)
    try {
      const { tasks } = await tasksApi.aiGenerate(text)
      setPreview(tasks)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar tarefas')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const created: Task[] = []
      for (const t of preview) {
        const saved = await tasksApi.createTask({
          name: t.name,
          project: t.project,
          assignee: t.assignee,
          due: t.due,
          status: t.status || 'not_started',
        }) as Task
        created.push(saved)
      }
      toast.success(`${created.length} tarefa${created.length !== 1 ? 's' : ''} criada${created.length !== 1 ? 's' : ''}!`)
      onGenerated(created)
      onClose()
    } catch {
      toast.error('Erro ao salvar tarefas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Gerar Tarefas com IA</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {preview.length === 0 ? (
            <>
              <p className="text-sm text-slate-600">Descreva em linguagem natural o que precisa ser feito e a IA vai extrair as tarefas:</p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Ex: Preciso criar um site para o cliente João, desenvolver a landing page, integrar o formulário de contato, configurar o domínio e fazer o SEO básico..."
                rows={5}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={handleGenerate} disabled={loading || !text.trim()} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={14} className="animate-spin" />Gerando...</> : <><Sparkles size={14} />Gerar Tarefas</>}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <p className="text-sm font-medium text-slate-700">{preview.length} tarefa{preview.length !== 1 ? 's' : ''} encontrada{preview.length !== 1 ? 's' : ''}. Confirme para criar:</p>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {preview.map((t, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-sm font-medium text-slate-800">{t.name}</p>
                    <div className="flex gap-3 mt-1">
                      {t.project && <span className="text-xs text-slate-500 flex items-center gap-1"><Briefcase size={10} />{t.project}</span>}
                      {t.assignee && <span className="text-xs text-slate-500 flex items-center gap-1"><User size={10} />{t.assignee}</span>}
                      {t.due && <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={10} />{formatDate(t.due)}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setPreview([])} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">Voltar</button>
                <button onClick={handleConfirm} disabled={saving} className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={14} className="animate-spin" />Criando...</> : <><CheckCircle2 size={14} />Criar Tarefas</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    tasksApi.getTasks()
      .then(r => setTasks(r.tasks))
      .catch(() => toast.error('Erro ao carregar tarefas'))
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      const updated = await tasksApi.updateTask(taskId, { status }) as Task
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, ...(updated || {}) } : t))
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await tasksApi.deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
      setDeletingId(null)
      toast.success('Tarefa excluída!')
    } catch {
      toast.error('Erro ao excluir tarefa')
    }
  }

  const handleSaved = (task: Task) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id)
      if (idx >= 0) { const copy = [...prev]; copy[idx] = task; return copy }
      return [task, ...prev]
    })
  }

  const handleAIGenerated = (newTasks: Task[]) => {
    setTasks(prev => [...newTasks, ...prev])
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tarefas</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} no total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAI(true)}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition"
          >
            <Sparkles size={16} />
            IA
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus size={16} />
            Nova Tarefa
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {STATUSES.map(status => {
            const statusTasks = tasks.filter(t => t.status === status.key)
            return (
              <div key={status.key} className="flex flex-col">
                {/* Column header */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border mb-3 ${status.bg} ${status.border}`}>
                  <span className={status.color}>{status.icon}</span>
                  <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>
                  <span className="ml-auto text-xs text-slate-400 font-medium bg-white/70 px-2 py-0.5 rounded-full">{statusTasks.length}</span>
                </div>

                {/* Tasks */}
                <div className="space-y-3">
                  {statusTasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-150"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-slate-800 flex-1">{task.name}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => setEditTask(task)} className="p-1 rounded text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition">
                            <CheckSquare size={14} />
                          </button>
                          {deletingId === task.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleDelete(task.id)} className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded">✓</button>
                              <button onClick={() => setDeletingId(null)} className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-xs rounded">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeletingId(task.id)} className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 mb-3">
                        {task.project && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Briefcase size={11} className="text-slate-400" />
                            <span>{task.project}</span>
                          </div>
                        )}
                        {task.assignee && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <User size={11} className="text-slate-400" />
                            <span>{task.assignee}</span>
                          </div>
                        )}
                        {task.due && (
                          <div className={`flex items-center gap-1.5 text-xs ${isOverdue(task.due) && task.status !== 'completed' ? 'text-red-500' : 'text-slate-500'}`}>
                            {isOverdue(task.due) && task.status !== 'completed' ? (
                              <AlertCircle size={11} />
                            ) : (
                              <Calendar size={11} className="text-slate-400" />
                            )}
                            <span>{formatDate(task.due)}</span>
                          </div>
                        )}
                      </div>

                      {/* Status selector */}
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(task.id, e.target.value as Task['status'])}
                        onClick={e => e.stopPropagation()}
                        className={`w-full text-xs py-1.5 px-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white transition ${
                          task.status === 'completed' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                          task.status === 'in_progress' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                          'border-slate-200 text-slate-600'
                        }`}
                      >
                        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                  ))}

                  {statusTasks.length === 0 && (
                    <div className="text-center py-8 text-slate-300 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                      Nenhuma tarefa
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <TaskModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />
      )}
      {editTask && (
        <TaskModal task={editTask} onClose={() => setEditTask(null)} onSaved={handleSaved} />
      )}
      {showAI && (
        <AIGenerateModal onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />
      )}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import {
  Plus,
  X,
  Loader2,
  Trash2,
  Edit2,
  Users,
  ShieldCheck,
  User,
  Key,
  Mail,
} from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '../lib/api'
import type { AppUser } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

const PERMISSION_LIST = [
  { key: 'analytics', label: 'Analytics' },
  { key: 'crm', label: 'CRM' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'tarefas', label: 'Tarefas' },
  { key: 'pdfs', label: 'PDFs' },
  { key: 'repositorio', label: 'Repositório' },
  { key: 'social-media', label: 'Social Media' },
  { key: 'orcamento', label: 'Orçamentos' },
]

interface UserFormData {
  name: string
  email: string
  password: string
  role: 'admin' | 'member'
  permissions: string[]
}

const EMPTY_FORM: UserFormData = {
  name: '',
  email: '',
  password: '',
  role: 'member',
  permissions: [],
}

function RoleBadge({ role }: { role?: string }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
        <ShieldCheck size={11} />
        Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
      <User size={11} />
      Membro
    </span>
  )
}

function UserModal({
  user,
  isEdit,
  onClose,
  onSaved,
}: {
  user?: AppUser | null
  isEdit: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<UserFormData>(() => {
    if (isEdit && user) {
      return {
        name: user.user_metadata?.name || '',
        email: user.email,
        password: '',
        role: (user.user_metadata?.role as 'admin' | 'member') || 'member',
        permissions: user.user_metadata?.permissions || [],
      }
    }
    return EMPTY_FORM
  })
  const [loading, setLoading] = useState(false)

  const set = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const togglePermission = (perm: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return }
    if (!form.email.trim()) { toast.error('E-mail é obrigatório'); return }
    if (!isEdit && !form.password.trim()) { toast.error('Senha é obrigatória'); return }

    setLoading(true)
    try {
      if (isEdit && user) {
        const payload: Partial<{ name: string; role: string; password: string; permissions: string[] }> = {
          name: form.name.trim(),
          role: form.role,
          permissions: form.permissions,
        }
        if (form.password.trim()) payload.password = form.password.trim()
        await authApi.updateUser(user.id, payload)
        toast.success('Usuário atualizado!')
      } else {
        await authApi.signup({
          email: form.email.trim(),
          password: form.password.trim(),
          name: form.name.trim(),
          role: form.role,
          permissions: form.permissions,
        })
        toast.success('Usuário criado!')
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-50">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Nome *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              placeholder="Nome completo"
              className="w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">E-mail *</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
                type="email"
                disabled={isEdit}
                placeholder="usuario@empresa.com"
                className="w-full pl-8 pr-3 py-2 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-zinc-950 disabled:text-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Senha {isEdit ? '(deixe em branco para não alterar)' : '*'}
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={form.password}
                onChange={e => set('password', e.target.value)}
                type="password"
                required={!isEdit}
                placeholder={isEdit ? 'Nova senha (opcional)' : 'Senha de acesso'}
                className="w-full pl-8 pr-3 py-2 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">Cargo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set('role', 'member')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition ${
                  form.role === 'member'
                    ? 'bg-blue-500/10 border-blue-300 text-blue-400'
                    : 'border-zinc-700 text-zinc-400 hover:bg-zinc-950'
                }`}
              >
                <User size={14} />
                Membro
              </button>
              <button
                type="button"
                onClick={() => set('role', 'admin')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition ${
                  form.role === 'admin'
                    ? 'bg-violet-500/10 border-violet-300 text-violet-400'
                    : 'border-zinc-700 text-zinc-400 hover:bg-zinc-950'
                }`}
              >
                <ShieldCheck size={14} />
                Admin
              </button>
            </div>
          </div>

          {form.role === 'member' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">Permissões</label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSION_LIST.map(perm => (
                  <label
                    key={perm.key}
                    className={`flex items-center gap-2.5 p-3 border rounded-lg cursor-pointer transition ${
                      form.permissions.includes(perm.key)
                        ? 'bg-emerald-900/20 border-emerald-600'
                        : 'border-zinc-700 hover:border-slate-300 hover:bg-zinc-950'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(perm.key)}
                      onChange={() => togglePermission(perm.key)}
                      className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className={`text-sm font-medium ${form.permissions.includes(perm.key) ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Admins têm acesso a todos os módulos automaticamente.
              </p>
            </div>
          )}

          {form.role === 'admin' && (
            <div className="flex items-center gap-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <ShieldCheck size={16} className="text-violet-600 flex-shrink-0" />
              <p className="text-sm text-violet-400">Admins têm acesso completo a todos os módulos.</p>
            </div>
          )}
        </form>

        <div className="p-5 border-t border-zinc-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-950 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit as React.MouseEventHandler}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Salvar' : 'Criar Usuário'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchUsers = () => {
    setLoading(true)
    authApi.getUsers()
      .then(r => setUsers(r.users))
      .catch(() => toast.error('Erro ao carregar usuários'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await authApi.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      setConfirmDeleteId(null)
      toast.success('Usuário removido!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover usuário')
    } finally {
      setDeletingId(null)
    }
  }

  const getUserName = (u: AppUser) => u.user_metadata?.name || u.email
  const getUserInitials = (u: AppUser) => {
    const name = u.user_metadata?.name || u.email
    return name
      .split(' ')
      .slice(0, 2)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="min-h-full bg-zinc-950 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Usuários</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm"
        >
          <Plus size={16} />
          Novo Usuário
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20">
          <Users size={40} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400 font-medium">Nenhum usuário encontrado</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
          >
            Criar primeiro usuário
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950">
                  <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">E-mail</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Cargo</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400 text-xs">Permissões</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-400 text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isCurrentUser = u.id === currentUser?.id
                  const role = u.user_metadata?.role
                  const permissions: string[] = u.user_metadata?.permissions || []

                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-50 hover:bg-zinc-950/50 transition ${isCurrentUser ? 'bg-emerald-900/20/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            role === 'admin' ? 'bg-violet-500/10 text-violet-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {getUserInitials(u)}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-50">
                              {getUserName(u)}
                              {isCurrentUser && (
                                <span className="ml-1.5 text-xs text-indigo-500 font-normal">(você)</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 text-sm">{u.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={role} />
                      </td>
                      <td className="px-4 py-3">
                        {role === 'admin' ? (
                          <span className="text-xs text-zinc-500 italic">Acesso total</span>
                        ) : permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {permissions.map(perm => {
                              const permLabel = PERMISSION_LIST.find(p => p.key === perm)?.label || perm
                              return (
                                <span
                                  key={perm}
                                  className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full"
                                >
                                  {permLabel}
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">Sem permissões</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditUser(u)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-500 hover:bg-emerald-900/20 transition"
                            title="Editar usuário"
                          >
                            <Edit2 size={15} />
                          </button>

                          {!isCurrentUser && (
                            confirmDeleteId === u.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(u.id)}
                                  disabled={deletingId === u.id}
                                  className="px-2 py-1 bg-rose-500/100 text-white text-xs font-medium rounded-lg hover:bg-rose-600 transition disabled:opacity-70 flex items-center gap-1"
                                >
                                  {deletingId === u.id ? <Loader2 size={10} className="animate-spin" /> : null}
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 border border-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-950 transition"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(u.id)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Remover usuário"
                              >
                                <Trash2 size={15} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <UserModal
          isEdit={false}
          onClose={() => setShowAdd(false)}
          onSaved={fetchUsers}
        />
      )}

      {editUser && (
        <UserModal
          user={editUser}
          isEdit={true}
          onClose={() => setEditUser(null)}
          onSaved={fetchUsers}
        />
      )}
    </div>
  )
}

import { supabase, SUPABASE_ANON_KEY } from './supabase'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://thcjrzluhsbgtbirdoxl.supabase.co/functions/v1/make-server-cee56a32'

// ── Types ───────────────────────────────────────────────────────────────────

export interface Site {
  id: string
  name: string
  url: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  trackingCode?: string
  createdAt: string
}

export interface AnalyticsStats {
  totalVisits: number
  pageViews: number
  uniqueVisitors: number
  visitsByDay: { date: string; visits: number }[]
  topPages: { page: string; views: number }[]
  deviceBreakdown: { device: string; count: number }[]
}

export interface AnalyticsEvent {
  id: string
  siteId: string
  type: string
  page: string
  device?: string
  referrer?: string
  createdAt: string
}

export interface Lead {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
  website?: string
  service?: string
  budget?: number
  source?: string
  priority?: 'low' | 'medium' | 'high'
  notes?: string
  responsible?: string
  responsibleUserId?: string
  movedBy?: string
  movedById?: string
  nextFollowUp?: string
  folderId?: string
  stage: 'novo' | 'contato' | 'proposta' | 'negociacao' | 'fechado' | 'perdido'
  activities?: Activity[]
  createdAt: string
  updatedAt?: string
}

export interface Activity {
  type: 'note' | 'stage_change'
  text?: string
  note?: string
  from?: string
  to?: string
  movedBy?: string
  movedById?: string
  at: string
  createdAt?: string
}

export interface Folder {
  id: string
  name: string
  color?: string
}

export interface FinancialEntry {
  id: string
  type: 'receivable' | 'payable'
  description: string
  amount: number
  dueDate: string
  category?: string
  clientOrSupplier?: string
  notes?: string
  recurrence?: string
  status: 'pending' | 'paid' | 'overdue'
  createdAt: string
  paidAt?: string
}

export interface Task {
  id: string
  name: string
  project?: string
  assignee?: string
  due?: string
  status: 'not_started' | 'in_progress' | 'completed'
  attachments?: string[]
  sprintId?: string
  description?: string
  priority?: 'urgent' | 'high' | 'medium' | 'low'
  tags?: string[]
  estimatedHours?: number | null
  createdAt: string
}

export interface TaskSprint {
  id: string
  name: string
  startDate?: string
  endDate?: string
  createdAt: string
}

export interface PDF {
  id: string
  title: string
  fileName: string
  size?: number
  createdAt: string
  path?: string
}

export interface RepoItem {
  id: string
  title?: string
  tags?: string[]
  path: string
  createdAt: string
  mimeType?: string
}

export interface ArtRequest {
  id: string
  client: string
  format: string
  deadline?: string
  description?: string
  status: 'pendente' | 'em_andamento' | 'entregue'
  createdAt: string
  updatedAt?: string
}

export interface DeliveredArt {
  id: string
  title?: string
  path: string
  createdAt: string
  mimeType?: string
}

export interface AppUser {
  id: string
  email: string
  user_metadata: {
    name?: string
    role?: string
    permissions?: string[]
  }
  created_at: string
}

// ── Activity Log types ───────────────────────────────────────────────────────

export interface ActivityLog {
  id: string
  userId: string
  userEmail: string
  userName: string
  action: string
  module: string
  description: string
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface Meeting {
  id: string
  title: string
  date: string
  time: string
  notes?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// ── Core fetch helper ────────────────────────────────────────────────────────

async function getAuthHeaders(isFormData = false): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

// ── Auto-log mapping ─────────────────────────────────────────────────────────

function inferLogInfo(method: string, path: string): { action: string; module: string; description: string } | null {
  const m = (method || 'GET').toUpperCase()
  if (m === 'GET') return null
  if (path.includes('/activity-log')) return null

  // CRM
  if (path === '/crm/leads' && m === 'POST') return { module: 'CRM', action: 'Criação', description: 'Novo lead criado' }
  if (path === '/crm/leads/bulk' && m === 'POST') return { module: 'CRM', action: 'Importação', description: 'Leads importados em massa' }
  if (/^\/crm\/leads\/.+/.test(path) && m === 'PUT') return { module: 'CRM', action: 'Atualização', description: 'Lead atualizado' }
  if (/^\/crm\/leads\/.+/.test(path) && m === 'DELETE') return { module: 'CRM', action: 'Exclusão', description: 'Lead excluído' }
  if (path === '/crm/folders' && m === 'PUT') return { module: 'CRM', action: 'Atualização', description: 'Pastas do CRM atualizadas' }

  // Financeiro
  if (path === '/financeiro/entries' && m === 'POST') return { module: 'Financeiro', action: 'Criação', description: 'Lançamento financeiro criado' }
  if (/^\/financeiro\/entries\/.+/.test(path) && m === 'PUT') return { module: 'Financeiro', action: 'Atualização', description: 'Lançamento financeiro atualizado' }
  if (/^\/financeiro\/entries\/.+/.test(path) && m === 'DELETE') return { module: 'Financeiro', action: 'Exclusão', description: 'Lançamento financeiro excluído' }

  // Tarefas
  if (path === '/tasks/ai-generate' && m === 'POST') return { module: 'Tarefas', action: 'IA', description: 'Tarefas geradas com IA' }
  if (path === '/tasks' && m === 'POST') return { module: 'Tarefas', action: 'Criação', description: 'Tarefa criada' }
  if (/^\/tasks\/.+/.test(path) && m === 'PUT') return { module: 'Tarefas', action: 'Atualização', description: 'Tarefa atualizada' }
  if (/^\/tasks\/.+/.test(path) && m === 'DELETE') return { module: 'Tarefas', action: 'Exclusão', description: 'Tarefa excluída' }

  // PDFs
  if (path === '/pdfs' && m === 'POST') return { module: 'PDFs', action: 'Upload', description: 'PDF enviado' }
  if (/^\/pdfs\/.+/.test(path) && m === 'DELETE') return { module: 'PDFs', action: 'Exclusão', description: 'PDF excluído' }

  // Repositório
  if (path === '/repo' && m === 'POST') return { module: 'Repositório', action: 'Upload', description: 'Arquivo enviado ao repositório' }
  if (/^\/repo\/.+/.test(path) && m === 'DELETE') return { module: 'Repositório', action: 'Exclusão', description: 'Arquivo excluído do repositório' }

  // Social Media
  if (path === '/social/requests' && m === 'POST') return { module: 'Social Media', action: 'Criação', description: 'Solicitação de arte criada' }
  if (/^\/social\/requests\/.+/.test(path) && m === 'PUT') return { module: 'Social Media', action: 'Atualização', description: 'Solicitação de arte atualizada' }
  if (/^\/social\/requests\/.+/.test(path) && m === 'DELETE') return { module: 'Social Media', action: 'Exclusão', description: 'Solicitação de arte excluída' }
  if (path === '/social/arts' && m === 'POST') return { module: 'Social Media', action: 'Entrega', description: 'Arte entregue' }
  if (/^\/social\/arts\/.+/.test(path) && m === 'DELETE') return { module: 'Social Media', action: 'Exclusão', description: 'Arte entregue excluída' }

  // Orçamentos
  if (path === '/quotes' && m === 'POST') return { module: 'Orçamentos', action: 'Criação', description: 'Orçamento criado' }
  if (/^\/quotes\/.+/.test(path) && m === 'PUT') return { module: 'Orçamentos', action: 'Atualização', description: 'Orçamento atualizado' }
  if (/^\/quotes\/.+/.test(path) && m === 'DELETE') return { module: 'Orçamentos', action: 'Exclusão', description: 'Orçamento excluído' }

  // Usuários
  if (path === '/auth/signup' && m === 'POST') return { module: 'Usuários', action: 'Criação', description: 'Novo usuário criado' }
  if (/^\/auth\/users\/.+/.test(path) && m === 'PUT') return { module: 'Usuários', action: 'Atualização', description: 'Usuário atualizado' }
  if (/^\/auth\/users\/.+/.test(path) && m === 'DELETE') return { module: 'Usuários', action: 'Exclusão', description: 'Usuário excluído' }

  // Analytics / Sites
  if (path === '/sites' && m === 'POST') return { module: 'Analytics', action: 'Criação', description: 'Site criado' }

  return null
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  isFormData = false
): Promise<T> {
  const headers = await getAuthHeaders(isFormData)
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> || {}),
    },
  })

  if (res.status === 401) {
    // Try to parse for SESSION_EXPIRED
    try {
      const body = await res.json()
      if (body?.code === 'SESSION_EXPIRED') {
        await supabase.auth.signOut()
        window.location.href = '/login'
      }
    } catch {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    throw new Error('Não autorizado')
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.message || errBody?.error || `HTTP ${res.status}`)
  }

  // Handle empty responses
  const text = await res.text()
  if (!text) return {} as T
  const result = JSON.parse(text) as T

  // Fire-and-forget activity log for mutating requests
  const logInfo = inferLogInfo(options.method || 'GET', path)
  if (logInfo) {
    apiFetch('/activity-log', {
      method: 'POST',
      body: JSON.stringify(logInfo),
    }).catch(() => {})
  }

  return result
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  checkInit: () => apiFetch<{ initialized: boolean }>('/auth/check-init'),

  init: (email: string, password: string, name: string) =>
    apiFetch('/auth/init', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  signup: (data: {
    email: string
    password: string
    name: string
    role: string
    permissions: string[]
  }) =>
    apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUsers: () => apiFetch<{ users: AppUser[] }>('/auth/users'),

  updateUser: (id: string, data: Partial<{ name: string; role: string; password: string; permissions: string[] }>) =>
    apiFetch(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteUser: (id: string) =>
    apiFetch(`/auth/users/${id}`, { method: 'DELETE' }),
}

// ── Sites / Analytics ────────────────────────────────────────────────────────

export const sitesApi = {
  list: () => apiFetch<{ sites: Site[] }>('/sites'),

  create: (data: {
    name: string
    url: string
    clientName?: string
    clientEmail?: string
    clientPhone?: string
  }) =>
    apiFetch('/sites', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (siteId: string) => apiFetch<{ site: Site; analytics: AnalyticsStats }>(`/sites/${siteId}`),

  getAnalytics: (siteId: string) => apiFetch<AnalyticsStats>(`/analytics/${siteId}`),

  getEvents: (siteId: string) => apiFetch<{ events: AnalyticsEvent[] }>(`/events/${siteId}`),
}

// ── CRM ──────────────────────────────────────────────────────────────────────

export const crmApi = {
  getLeads: () => apiFetch<{ leads: Lead[] }>('/crm/leads'),

  createLead: (data: Partial<Lead>) =>
    apiFetch<{ lead: Lead }>('/crm/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.lead),

  updateLead: (id: string, data: Partial<Lead> & { activityNote?: string; stage?: string }) =>
    apiFetch<{ lead: Lead }>(`/crm/leads/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then(r => r.lead),

  deleteLead: (id: string) =>
    apiFetch(`/crm/leads/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getFolders: () => apiFetch<{ folders: Folder[] }>('/crm/folders'),

  updateFolders: (folders: Folder[]) =>
    apiFetch('/crm/folders', {
      method: 'PUT',
      body: JSON.stringify({ folders }),
    }),
}

// ── Financial ────────────────────────────────────────────────────────────────

export const financeiroApi = {
  getEntries: () => apiFetch<{ entries: FinancialEntry[] }>('/financeiro/entries'),

  createEntry: (data: {
    type: 'receivable' | 'payable'
    description: string
    amount: number
    dueDate: string
    category?: string
    clientOrSupplier?: string
    notes?: string
    recurrence?: string
  }) =>
    apiFetch<{ entry: FinancialEntry }>('/financeiro/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.entry),

  updateEntry: (id: string, data: Partial<FinancialEntry>) =>
    apiFetch<{ entry: FinancialEntry }>(`/financeiro/entries/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then(r => r.entry),

  markPaid: (id: string) =>
    apiFetch<{ entry: FinancialEntry }>(`/financeiro/entries/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'paid' }),
    }).then(r => r.entry),

  deleteEntry: (id: string) =>
    apiFetch(`/financeiro/entries/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const tasksApi = {
  getTasks: () => apiFetch<{ tasks: Task[] }>('/tasks'),

  createTask: (data: Partial<Task>) =>
    apiFetch<{ task: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.task),

  updateTask: (id: string, data: Partial<Task>) =>
    apiFetch<{ task: Task }>(`/tasks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then(r => r.task),

  deleteTask: (id: string) =>
    apiFetch(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  aiGenerate: (text: string) =>
    apiFetch<{ tasks: Task[] }>('/tasks/ai-generate', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
}

export const taskSprintsApi = {
  list: () => apiFetch<{ sprints: TaskSprint[] }>('/tasks/sprints'),

  create: (data: { name: string; startDate?: string; endDate?: string }) =>
    apiFetch<{ sprint: TaskSprint }>('/tasks/sprints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAll: (sprints: TaskSprint[]) =>
    apiFetch('/tasks/sprints', {
      method: 'PUT',
      body: JSON.stringify({ sprints }),
    }),

  delete: (id: string) =>
    apiFetch(`/tasks/sprints/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

// ── PDFs ─────────────────────────────────────────────────────────────────────

export const pdfsApi = {
  list: () => apiFetch<{ pdfs: PDF[] }>('/pdfs'),

  upload: async (file: File, title: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    return apiFetch('/pdfs', {
      method: 'POST',
      body: formData,
    }, true)
  },

  getUrl: (id: string) => apiFetch<{ url: string }>(`/pdfs/${id}/url`),

  delete: (id: string) =>
    apiFetch(`/pdfs/${id}`, { method: 'DELETE' }),
}

// ── Repository ────────────────────────────────────────────────────────────────

export const repoApi = {
  list: () => apiFetch<{ items: RepoItem[] }>('/repo'),

  upload: async (file: File, title?: string, tags?: string[]) => {
    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)
    if (tags && tags.length > 0) formData.append('tags', JSON.stringify(tags))
    return apiFetch('/repo', {
      method: 'POST',
      body: formData,
    }, true)
  },

  getAttachmentUrl: (path: string) =>
    apiFetch<{ signedUrl: string }>(`/repo/attachment?path=${encodeURIComponent(path)}`),

  delete: (id: string) =>
    apiFetch(`/repo/${id}`, { method: 'DELETE' }),
}

// ── Social Media ──────────────────────────────────────────────────────────────

export const socialApi = {
  listRequests: () => apiFetch<{ requests: ArtRequest[] }>('/social/requests'),

  createRequest: (data: {
    client: string
    format: string
    deadline?: string
    description?: string
  }) =>
    apiFetch('/social/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRequest: (id: string, data: Partial<ArtRequest>) =>
    apiFetch(`/social/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteRequest: (id: string) =>
    apiFetch(`/social/requests/${id}`, { method: 'DELETE' }),

  listArts: () => apiFetch<{ arts: DeliveredArt[] }>('/social/arts'),

  uploadArt: async (file: File, title?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)
    return apiFetch('/social/arts', {
      method: 'POST',
      body: formData,
    }, true)
  },

  getArtUrl: (path: string) =>
    apiFetch<{ signedUrl: string }>(`/social/arts/url?path=${encodeURIComponent(path)}`),

  deleteArt: (id: string) =>
    apiFetch(`/social/arts/${id}`, { method: 'DELETE' }),
}

// ── Activity Logs ─────────────────────────────────────────────────────────────

export const logsApi = {
  log: (data: { action: string; module: string; description: string; metadata?: Record<string, unknown> }) =>
    apiFetch('/activity-log', { method: 'POST', body: JSON.stringify(data) }),

  getLogs: () => apiFetch<{ logs: ActivityLog[] }>('/activity-log'),

  clearLogs: () => apiFetch('/activity-log', { method: 'DELETE' }),
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export const quotesApi = {
  list: () => apiFetch<{ quotes: any[] }>('/quotes'),

  create: (data: Record<string, unknown>) =>
    apiFetch<{ quote: any }>('/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<{ quote: any }>(`/quotes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch(`/quotes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

// ── Copy ──────────────────────────────────────────────────────────────────────

export interface CopyText {
  id: string
  group_id: string
  title: string
  content: string
  created_at: string
}

export interface CopyGroup {
  id: string
  name: string
  created_at: string
  texts: CopyText[]
}

export const copyApi = {
  listGroups: () => apiFetch<{ groups: CopyGroup[] }>('/copy/groups'),

  createGroup: (name: string) =>
    apiFetch<{ group: CopyGroup }>('/copy/groups', { method: 'POST', body: JSON.stringify({ name }) }),

  renameGroup: (id: string, name: string) =>
    apiFetch<{ group: CopyGroup }>(`/copy/groups/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ name }) }),

  deleteGroup: (id: string) =>
    apiFetch(`/copy/groups/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  createText: (group_id: string, title: string, content: string) =>
    apiFetch<{ text: CopyText }>('/copy/texts', { method: 'POST', body: JSON.stringify({ group_id, title, content }) }),

  updateText: (id: string, title: string, content: string) =>
    apiFetch<{ text: CopyText }>(`/copy/texts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ title, content }) }),

  deleteText: (id: string) =>
    apiFetch(`/copy/texts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

// ── Reuniões ──────────────────────────────────────────────────────────────────

export const meetingsApi = {
  list: () => apiFetch<{ meetings: Meeting[] }>('/meetings'),

  create: (data: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiFetch<{ meeting: Meeting }>('/meetings', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Meeting>) =>
    apiFetch<{ meeting: Meeting }>(`/meetings/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch(`/meetings/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

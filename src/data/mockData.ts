// ─── Mock Data ────────────────────────────────────────────────────────────────

// ── Tasks ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'not_started' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface MockTask {
  id: string
  project: string
  name: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  due: string
  assignee: string
  tags?: string[]
  estimatedHours?: number
  completedAt?: string
  createdAt: string
}

export const MOCK_TASKS: MockTask[] = [
  {
    id: 't1',
    project: 'Clínica Bella Forma',
    name: 'Desenvolver landing page',
    description: 'Criar landing page responsiva com seções: hero, serviços, depoimentos, contato. Integrar formulário com CRM.',
    status: 'in_progress',
    priority: 'urgent',
    due: '2026-03-20',
    assignee: 'Rafael',
    tags: ['frontend', 'urgente'],
    estimatedHours: 12,
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 't2',
    project: 'Clínica Bella Forma',
    name: 'SEO On-Page',
    description: 'Otimizar meta tags, headings, alt texts e sitemap para as principais palavras-chave.',
    status: 'not_started',
    priority: 'medium',
    due: '2026-03-28',
    assignee: 'Ana',
    tags: ['seo'],
    estimatedHours: 4,
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 't3',
    project: 'Construtora Panorama',
    name: 'Configurar Google Ads',
    description: 'Criar campanhas de busca para imóveis. Definir palavras-chave, segmentação geográfica e orçamento diário.',
    status: 'in_progress',
    priority: 'high',
    due: '2026-03-18',
    assignee: 'Lucas',
    tags: ['ads', 'google'],
    estimatedHours: 6,
    createdAt: '2026-03-05T09:00:00Z',
  },
  {
    id: 't4',
    project: 'Construtora Panorama',
    name: 'Criar relatório de performance',
    description: 'Montar relatório mensal com métricas de tráfego, leads gerados e ROI de cada canal.',
    status: 'done',
    priority: 'low',
    due: '2026-03-15',
    assignee: 'Ana',
    tags: ['relatório'],
    estimatedHours: 3,
    completedAt: '2026-03-14T17:00:00Z',
    createdAt: '2026-03-05T09:00:00Z',
  },
  {
    id: 't5',
    project: 'Ateliê Fernanda Lima',
    name: 'Reformular identidade visual',
    description: 'Atualizar logo, paleta de cores e tipografia. Entregar manual de marca em PDF.',
    status: 'not_started',
    priority: 'medium',
    due: '2026-04-05',
    assignee: 'Camila',
    tags: ['design', 'branding'],
    estimatedHours: 20,
    createdAt: '2026-03-10T11:00:00Z',
  },
  {
    id: 't6',
    project: 'Ateliê Fernanda Lima',
    name: 'Integrar loja no Instagram',
    description: 'Configurar catálogo de produtos no Meta Business, vincular ao Instagram e testar checkout.',
    status: 'in_progress',
    priority: 'high',
    due: '2026-03-22',
    assignee: 'Rafael',
    tags: ['social', 'ecommerce'],
    estimatedHours: 5,
    createdAt: '2026-03-10T11:00:00Z',
  },
  {
    id: 't7',
    project: 'Tech Startup XYZ',
    name: 'Setup pipeline CI/CD',
    description: 'Configurar GitHub Actions para build, testes e deploy automático em staging e produção.',
    status: 'done',
    priority: 'urgent',
    due: '2026-03-12',
    assignee: 'Lucas',
    tags: ['devops', 'ci-cd'],
    estimatedHours: 8,
    completedAt: '2026-03-12T15:30:00Z',
    createdAt: '2026-03-08T08:00:00Z',
  },
  {
    id: 't8',
    project: 'Tech Startup XYZ',
    name: 'Documentar API REST',
    description: 'Criar documentação Swagger/OpenAPI para todos os endpoints. Incluir exemplos de request/response.',
    status: 'not_started',
    priority: 'low',
    due: '2026-04-10',
    assignee: 'Ana',
    tags: ['docs', 'api'],
    estimatedHours: 6,
    createdAt: '2026-03-08T08:00:00Z',
  },
  {
    id: 't9',
    project: 'Clínica Bella Forma',
    name: 'Implementar chat online',
    description: 'Integrar widget de chat (Intercom ou Tawk.to) com fluxo de qualificação de leads.',
    status: 'not_started',
    priority: 'medium',
    due: '2026-04-01',
    assignee: 'Camila',
    tags: ['frontend', 'integração'],
    estimatedHours: 4,
    createdAt: '2026-03-12T10:00:00Z',
  },
]

// ── Quotes ────────────────────────────────────────────────────────────────────

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected'

export interface QuoteItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Quote {
  id: string
  number: string
  client: string
  clientEmail: string
  clientPhone: string
  validUntil: string
  deliveryDays: number
  paymentTerms: string
  notes: string
  items: QuoteItem[]
  discount: number
  status: QuoteStatus
  createdAt: string
}

export const MOCK_QUOTES: Quote[] = [
  {
    id: 'q1',
    number: 'ORC-2026-038',
    client: 'Clínica Bella Forma',
    clientEmail: 'contato@bellaforma.com.br',
    clientPhone: '(11) 98765-4321',
    validUntil: '2026-04-17',
    deliveryDays: 20,
    paymentTerms: '50%+50%',
    notes: 'Incluir integração com sistema de agendamento. Hospedagem por conta da Syntax por 12 meses.',
    items: [
      { id: 'q1i1', description: 'Desenvolvimento de Landing Page', quantity: 1, unitPrice: 3500, total: 3500 },
      { id: 'q1i2', description: 'SEO On-Page (configuração inicial)', quantity: 1, unitPrice: 800, total: 800 },
      { id: 'q1i3', description: 'Integração com Google Analytics', quantity: 1, unitPrice: 200, total: 200 },
    ],
    discount: 0,
    status: 'approved',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'q2',
    number: 'ORC-2026-039',
    client: 'Construtora Panorama',
    clientEmail: 'marketing@panorama.com.br',
    clientPhone: '(11) 3333-4444',
    validUntil: '2026-04-01',
    deliveryDays: 30,
    paymentTerms: '30/60/90',
    notes: 'Campanha focada em lançamento de empreendimento na Zona Sul. Revisão mensal de performance.',
    items: [
      { id: 'q2i1', description: 'Gestão de Google Ads (3 meses)', quantity: 3, unitPrice: 1500, total: 4500 },
      { id: 'q2i2', description: 'Criação de Landing Page de Captação', quantity: 1, unitPrice: 2700, total: 2700 },
    ],
    discount: 0,
    status: 'sent',
    createdAt: '2026-03-08T14:00:00Z',
  },
  {
    id: 'q3',
    number: 'ORC-2026-040',
    client: 'Ateliê Fernanda Lima',
    clientEmail: 'fernanda@atelie.com.br',
    clientPhone: '(11) 99999-1234',
    validUntil: '2026-04-10',
    deliveryDays: 25,
    paymentTerms: '50%+50%',
    notes: 'Projeto inclui manual de marca completo e assets para redes sociais.',
    items: [
      { id: 'q3i1', description: 'Redesign de Identidade Visual', quantity: 1, unitPrice: 3500, total: 3500 },
      { id: 'q3i2', description: 'Pack de Templates para Instagram (12 peças)', quantity: 1, unitPrice: 1200, total: 1200 },
      { id: 'q3i3', description: 'Manual de Marca (PDF)', quantity: 1, unitPrice: 800, total: 800 },
      { id: 'q3i4', description: 'Suporte pós-entrega (30 dias)', quantity: 1, unitPrice: 500, total: 500 },
    ],
    discount: 0,
    status: 'draft',
    createdAt: '2026-03-15T09:00:00Z',
  },
]

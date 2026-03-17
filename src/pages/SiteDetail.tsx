import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  ArrowLeft,
  Globe,
  Eye,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Copy,
  Loader2,
  TrendingUp,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { sitesApi } from '../lib/api'
import type { Site, AnalyticsStats } from '../lib/api'

const PIE_COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534']

function StatCard({ title, value, icon, color, subtitle }: { title: string; value: string | number; icon: React.ReactNode; color: string; subtitle?: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-zinc-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-zinc-50 mt-0.5">{value}</p>
        {subtitle && <p className="text-zinc-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function TrackingModal({ site, onClose }: { site: Site; onClose: () => void }) {
  const code = site.trackingCode || `<!-- Syntax Analytics -->\n<script>\n(function(){\n  var s=document.createElement('script');\n  s.src='https://thcjrzluhsbgtbirdoxl.supabase.co/functions/v1/make-server-cee56a32/tracker.js';\n  s.dataset.siteId='${site.id}';\n  document.head.appendChild(s);\n})();\n</script>`
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-50">Código de Rastreamento</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-zinc-300 mb-3">Cole este código no <code className="bg-zinc-800 px-1 rounded text-xs">&lt;head&gt;</code> do site:</p>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 whitespace-pre-wrap break-all">{code}</div>
          <button onClick={() => { navigator.clipboard.writeText(code).then(() => toast.success('Código copiado!')) }} className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
            <Copy size={14} />Copiar Código
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SiteDetail() {
  const { siteId } = useParams<{ siteId: string }>()
  const navigate = useNavigate()
  const [site, setSite] = useState<Site | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTracking, setShowTracking] = useState(false)

  useEffect(() => {
    if (!siteId) return
    sitesApi.get(siteId)
      .then(r => {
        setSite(r.site)
        setAnalytics(r.analytics)
      })
      .catch(() => {
        toast.error('Erro ao carregar site')
        navigate('/analytics')
      })
      .finally(() => setLoading(false))
  }, [siteId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!site) return null

  const visitsByDay = analytics?.visitsByDay?.slice(-14).map(d => ({
    ...d,
    dateLabel: (() => { try { return format(parseISO(d.date), 'dd/MM', { locale: ptBR }) } catch { return d.date } })(),
  })) || []

  const deviceData = analytics?.deviceBreakdown || []
  const topPages = analytics?.topPages?.slice(0, 10) || []

  const getDeviceIcon = (device: string) => {
    const d = device.toLowerCase()
    if (d.includes('mobile') || d.includes('phone')) return <Smartphone size={14} />
    if (d.includes('tablet')) return <Tablet size={14} />
    return <Monitor size={14} />
  }

  return (
    <div className="min-h-full bg-zinc-950 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/analytics')}
          className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
            <Globe size={18} className="text-emerald-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-zinc-50 truncate">{site.name}</h1>
            <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-emerald-500 truncate block">
              {site.url}
            </a>
          </div>
        </div>
        <button
          onClick={() => setShowTracking(true)}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:border-emerald-600 hover:text-emerald-500 transition"
        >
          <Copy size={14} />
          Tracking Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total de Visitas"
          value={(analytics?.totalVisits || 0).toLocaleString('pt-BR')}
          icon={<TrendingUp size={20} className="text-emerald-500" />}
          color="bg-emerald-900/20"
        />
        <StatCard
          title="Visualizações"
          value={(analytics?.pageViews || 0).toLocaleString('pt-BR')}
          icon={<Eye size={20} className="text-blue-600" />}
          color="bg-blue-500/10"
        />
        <StatCard
          title="Visitantes Únicos"
          value={(analytics?.uniqueVisitors || 0).toLocaleString('pt-BR')}
          icon={<Users size={20} className="text-violet-600" />}
          color="bg-violet-500/10"
        />
        <StatCard
          title="Dispositivos"
          value={deviceData.length > 0 ? deviceData[0].device : '—'}
          icon={<Monitor size={20} className="text-emerald-600" />}
          color="bg-emerald-500/10"
          subtitle={deviceData.length > 0 ? 'Mais comum' : 'Sem dados'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Visits by day chart */}
        <div className="xl:col-span-2 bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
          <h3 className="font-semibold text-zinc-50 mb-4">Visitas por Dia</h3>
          {visitsByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={visitsByDay} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [v, 'Visitas']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="visits" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-zinc-500 text-sm">
              Nenhum dado de visitas disponível
            </div>
          )}
        </div>

        {/* Device breakdown */}
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
          <h3 className="font-semibold text-zinc-50 mb-4">Dispositivos</h3>
          {deviceData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    dataKey="count"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-zinc-300">{value}</span>}
                  />
                  <Tooltip formatter={(v: number) => [v, 'Visitas']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {deviceData.map((d, i) => (
                  <div key={d.device} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex items-center gap-1 text-zinc-300">{getDeviceIcon(d.device)}{d.device}</span>
                    </div>
                    <span className="font-medium text-zinc-100">{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
              Sem dados de dispositivos
            </div>
          )}
        </div>
      </div>

      {/* Top pages */}
      {topPages.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 shadow-xl shadow-black/10">
          <h3 className="font-semibold text-zinc-50 mb-4">Páginas Mais Acessadas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-zinc-800">
                  <th className="pb-3 font-medium text-zinc-400">#</th>
                  <th className="pb-3 font-medium text-zinc-400">Página</th>
                  <th className="pb-3 font-medium text-zinc-400 text-right">Visualizações</th>
                  <th className="pb-3 font-medium text-zinc-400 text-right">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((page, i) => {
                  const totalViews = topPages.reduce((s, p) => s + p.views, 0)
                  const pct = totalViews > 0 ? ((page.views / totalViews) * 100).toFixed(1) : '0'
                  return (
                    <tr key={page.page} className="border-b border-slate-50 hover:bg-zinc-950/50">
                      <td className="py-3 pr-4 text-zinc-500 font-mono text-xs">{i + 1}</td>
                      <td className="py-3 font-mono text-xs text-zinc-100 max-w-xs truncate">{page.page}</td>
                      <td className="py-3 text-right font-semibold text-zinc-100">{page.views.toLocaleString('pt-BR')}</td>
                      <td className="py-3 text-right text-zinc-400">{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTracking && <TrackingModal site={site} onClose={() => setShowTracking(false)} />}
    </div>
  )
}

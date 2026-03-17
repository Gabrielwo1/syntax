import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../lib/api'

// Syntax S logo
function SyntaxLogo() {
  return (
    <svg width="52" height="52" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Upper right-pointing chevron */}
      <polygon points="5,5 22,5 22,26 5,26"       fill="#0a3010" />
      <polygon points="22,5 42,5 42,26 22,26"      fill="#165018" />
      <polygon points="42,5 68,26 42,26"           fill="#28882e" />
      <polygon points="42,26 68,26 42,47 22,47"    fill="#52cc2c" />
      {/* Lower left-pointing chevron */}
      <polygon points="95,53 78,53 78,74 95,74"    fill="#0a3010" />
      <polygon points="78,53 58,53 58,74 78,74"    fill="#165018" />
      <polygon points="58,53 32,74 58,74"          fill="#28882e" />
      <polygon points="58,74 32,74 58,95 78,95"    fill="#52cc2c" />
    </svg>
  )
}

const REMEMBER_KEY = 'syntax_remember'

export default function Login() {
  const { login, initialized, refreshUser } = useAuth()
  const navigate = useNavigate()

  const saved = (() => { try { return JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null') } catch { return null } })()

  const [email, setEmail] = useState(saved?.email || '')
  const [password, setPassword] = useState(saved?.password || '')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(!!saved)

  const isSetup = initialized === false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isSetup) {
        if (!name.trim()) { toast.error('Informe seu nome'); setLoading(false); return }
        await authApi.init(email, password, name)
        toast.success('Sistema configurado! Faça login.')
        await login(email, password)
        await refreshUser()
        navigate('/')
      } else {
        await login(email, password)
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }))
        } else {
          localStorage.removeItem(REMEMBER_KEY)
        }
        navigate('/')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
        toast.error('E-mail ou senha inválidos')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all"

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Subtle background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-60 w-96 h-96 bg-emerald-800/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 p-3 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl shadow-black/40">
            <SyntaxLogo />
          </div>
          <h1 className="text-3xl font-black text-zinc-50 tracking-widest uppercase">SYNTAX</h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Plataforma de Gestão</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl shadow-black/40 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-zinc-50">
              {isSetup ? 'Configuração Inicial' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {isSetup
                ? 'Crie a conta de administrador para começar'
                : 'Entre com suas credenciais para continuar'}
            </p>
          </div>

          {isSetup && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-emerald-400 text-xs font-medium">
                Nenhum usuário cadastrado. Configure o primeiro administrador.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSetup && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className={inputCls}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={`${inputCls} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isSetup && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 accent-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-zinc-400">Salvar informações de login</span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 mt-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" />{isSetup ? 'Configurando...' : 'Entrando...'}</>
              ) : (
                isSetup ? 'Criar Conta Admin' : 'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          © {new Date().getFullYear()} Syntax. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}

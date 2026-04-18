import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import {
  MessageSquare, Search, Send, RefreshCw, Phone,
  CheckCheck, Check, Clock, AlertCircle, Wifi, WifiOff,
  ArrowLeft, Megaphone, Inbox, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import ProspeccaoPanel from './ProspeccaoPanel'

const API = 'http://localhost:5001/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Chat {
  phone: string
  name?: string
  lastMessage?: string
  lastMessageTime?: string | number
  unreadMessages?: number
  photo?: string
  isGroup?: boolean
}

interface Message {
  messageId?: string
  phone?: string
  fromMe?: boolean
  text?: string
  body?: string
  message?: string
  timestamp?: number
  time?: number
  status?: string
  type?: string
}

type Tab = 'inbox' | 'prospeccao'

interface NavItem {
  id: Tab
  label: string
  icon: React.ReactNode
  badge?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(ts?: string | number): string {
  if (!ts) return ''
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function msgText(m: Message): string {
  return m.text || m.body || m.message || ''
}

function StatusIcon({ status }: { status?: string }) {
  if (!status) return null
  if (status === 'READ')     return <CheckCheck size={12} className="text-emerald-300" />
  if (status === 'RECEIVED') return <CheckCheck size={12} className="text-zinc-400" />
  if (status === 'SENT')     return <Check size={12} className="text-zinc-400" />
  if (status === 'ERROR')    return <AlertCircle size={12} className="text-red-400" />
  return <Clock size={12} className="text-zinc-500" />
}

function Avatar({ name, photo, size = 'md' }: { name?: string; photo?: string; size?: 'sm' | 'md' }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  if (photo) {
    return <img src={photo} alt={name} className={`${dim} rounded-full object-cover flex-shrink-0`} />
  }
  return (
    <div className={`${dim} rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  )
}

// ── Inbox Panel ───────────────────────────────────────────────────────────────
function InboxPanel() {
  const [chats, setChats]       = useState<Chat[]>([])
  const [filtered, setFiltered] = useState<Chat[]>([])
  const [selected, setSelected] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [search, setSearch]     = useState('')
  const [input, setInput]       = useState('')
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingMsgs, setLoadingMsgs]   = useState(false)
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchChats = useCallback(async () => {
    setLoadingChats(true)
    try {
      const res = await fetch(`${API}/inbox/chats`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Chat[] = await res.json()
      if (Array.isArray(data)) setChats(data)
    } catch {
      toast.error('Erro ao carregar conversas')
    } finally {
      setLoadingChats(false)
    }
  }, [])

  const fetchMessages = useCallback(async (phone: string) => {
    setLoadingMsgs(true)
    try {
      const res = await fetch(`${API}/inbox/messages/${phone}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Message[] = await res.json()
      if (Array.isArray(data)) setMessages([...data].reverse())
    } catch {
      toast.error('Erro ao carregar mensagens')
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  useEffect(() => { fetchChats() }, [fetchChats])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q ? chats.filter(c => (c.name || c.phone).toLowerCase().includes(q)) : chats)
  }, [chats, search])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!selected) { if (pollRef.current) clearInterval(pollRef.current); return }
    fetchMessages(selected.phone)
    pollRef.current = setInterval(() => fetchMessages(selected.phone), 10000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selected, fetchMessages])

  const handleSend = async () => {
    if (!selected || !input.trim()) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    try {
      const res = await fetch(`${API}/inbox/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selected.phone, message: msg }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success('Mensagem enviada')
        setTimeout(() => fetchMessages(selected.phone), 1500)
      } else {
        toast.error(`Erro: ${data.detalhe || 'Falha no envio'}`)
      }
    } catch {
      toast.error('Erro de conexão com o backend')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadMessages ?? 0), 0)

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Lista de conversas */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/30">
        <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>
          <button
            onClick={fetchChats}
            disabled={loadingChats}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors flex-shrink-0"
            title="Atualizar conversas"
          >
            <RefreshCw size={14} className={loadingChats ? 'animate-spin' : ''} />
          </button>
        </div>

        {totalUnread > 0 && (
          <div className="px-3 py-2 border-b border-zinc-800">
            <span className="text-xs text-emerald-400 font-medium">
              {totalUnread} mensagem{totalUnread > 1 ? 's' : ''} não lida{totalUnread > 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loadingChats && chats.length === 0 && (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-sm gap-2">
              <RefreshCw size={13} className="animate-spin" /> Carregando...
            </div>
          )}
          {!loadingChats && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600 text-sm gap-2">
              <Phone size={22} className="text-zinc-700" />
              {chats.length === 0 ? 'Nenhuma conversa' : 'Sem resultados'}
            </div>
          )}
          {filtered.map(chat => (
            <button
              key={chat.phone}
              onClick={() => { setSelected(chat); setMessages([]) }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/40 ${
                selected?.phone === chat.phone ? 'bg-zinc-800 border-l-2 border-l-emerald-500' : ''
              }`}
            >
              <Avatar name={chat.name || chat.phone} photo={chat.photo} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium text-zinc-100 truncate">{chat.name || chat.phone}</span>
                  <span className="text-[10px] text-zinc-500 flex-shrink-0">{formatTime(chat.lastMessageTime)}</span>
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <span className="text-xs text-zinc-500 truncate">{chat.lastMessage || ''}</span>
                  {(chat.unreadMessages ?? 0) > 0 && (
                    <span className="flex-shrink-0 text-[10px] font-bold bg-emerald-600 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {chat.unreadMessages}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Área de mensagens */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-600">
          <MessageSquare size={44} className="text-zinc-700" />
          <p className="text-sm">Selecione uma conversa para visualizar as mensagens</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header da conversa */}
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-3 flex-shrink-0 bg-zinc-900/30">
            <Avatar name={selected.name || selected.phone} photo={selected.photo} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-100">{selected.name || selected.phone}</p>
              <p className="text-xs text-zinc-500">{selected.phone}</p>
            </div>
            <button
              onClick={() => fetchMessages(selected.phone)}
              disabled={loadingMsgs}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Atualizar mensagens"
            >
              <RefreshCw size={13} className={loadingMsgs ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {loadingMsgs && messages.length === 0 && (
              <div className="flex items-center justify-center py-8 text-zinc-500 text-sm gap-2">
                <RefreshCw size={13} className="animate-spin" /> Carregando mensagens...
              </div>
            )}
            {!loadingMsgs && messages.length === 0 && (
              <div className="flex items-center justify-center py-8 text-zinc-600 text-sm">
                Nenhuma mensagem nesta conversa
              </div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.fromMe === true
              const text = msgText(msg)
              const time = formatTime(msg.timestamp || msg.time)
              return (
                <div key={msg.messageId || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    isMe ? 'bg-emerald-700 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                  }`}>
                    {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
                    {!text && msg.type && <p className="italic text-xs opacity-60">[{msg.type}]</p>}
                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-[10px] ${isMe ? 'text-emerald-200/70' : 'text-zinc-500'}`}>{time}</span>
                      {isMe && <StatusIcon status={msg.status} />}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Campo de envio */}
          <div className="px-4 py-3 border-t border-zinc-800 flex gap-3 items-end flex-shrink-0 bg-zinc-900/30">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem... (Enter para enviar)"
              rows={1}
              className="flex-1 resize-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600 transition-colors max-h-32 overflow-y-auto"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              title="Enviar"
            >
              {sending
                ? <RefreshCw size={15} className="animate-spin text-white" />
                : <Send size={15} className="text-white" />
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sidebar lateral do WhatsApp ────────────────────────────────────────────────
function WhatsappSidebar({
  tab,
  setTab,
  backendOk,
  unreadCount,
}: {
  tab: Tab
  setTab: (t: Tab) => void
  backendOk: boolean | null
  unreadCount: number
}) {
  const navigate = useNavigate()

  const navItems: NavItem[] = [
    { id: 'inbox',      label: 'Inbox',      icon: <Inbox size={18} />,    badge: unreadCount },
    { id: 'prospeccao', label: 'Prospecção', icon: <Megaphone size={18} /> },
  ]

  return (
    <aside className="flex flex-col w-56 flex-shrink-0 h-full bg-zinc-950 border-r border-zinc-800">
      {/* Logo / header */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <img src="/logo-syntax.png" alt="Syntax" className="h-7 w-auto mb-4" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-700/40 flex items-center justify-center">
            <MessageSquare size={15} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-zinc-100 text-sm font-semibold leading-tight">WhatsApp</p>
            <p className="text-zinc-500 text-xs">Central de mensagens</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = tab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className={`text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={14} className="text-emerald-300 flex-shrink-0" />}
            </button>
          )
        })}
      </nav>

      {/* Status + Voltar */}
      <div className="px-3 py-4 border-t border-zinc-800 space-y-2">
        {/* Status backend */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
          backendOk === true
            ? 'bg-emerald-900/30 text-emerald-400'
            : backendOk === false
            ? 'bg-red-900/30 text-red-400'
            : 'bg-zinc-800/50 text-zinc-500'
        }`}>
          {backendOk === true
            ? <><Wifi size={12} /> Backend online</>
            : backendOk === false
            ? <><WifiOff size={12} /> Backend offline</>
            : <><RefreshCw size={12} className="animate-spin" /> Verificando...</>
          }
        </div>

        {/* Voltar */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-all duration-150"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao sistema</span>
        </button>
      </div>
    </aside>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function WhatsappInbox() {
  const [tab, setTab]           = useState<Tab>('inbox')
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch(`${API}/log`)
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false))
  }, [])

  // Atualiza badge de não lidos
  const handleUnread = useCallback((count: number) => setUnreadCount(count), [])

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Menu lateral próprio */}
      <WhatsappSidebar
        tab={tab}
        setTab={setTab}
        backendOk={backendOk}
        unreadCount={unreadCount}
      />

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Banner backend offline */}
        {backendOk === false && (
          <div className="px-5 py-2.5 bg-red-900/20 border-b border-red-800/30 text-red-400 text-xs flex items-center gap-2">
            <WifiOff size={12} />
            Backend offline — inicie com:{' '}
            <code className="text-red-300 bg-red-950/60 px-1.5 py-0.5 rounded font-mono">python3 app.py</code>
          </div>
        )}

        {tab === 'inbox' && <InboxPanel />}
        {tab === 'prospeccao' && (
          <div className="flex-1 overflow-y-auto">
            <ProspeccaoPanel />
          </div>
        )}
      </div>
    </div>
  )
}

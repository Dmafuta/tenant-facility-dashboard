'use client'
import { useState, useRef, useEffect } from 'react'
import { runAiQuery, type AiQueryResponse } from '@/lib/api/ai'
import { cn } from '@/lib/cn'

interface AiQueryPanelProps {
  open: boolean
  onClose: () => void
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
  result?: AiQueryResponse
  error?: string
}

const SUGGESTIONS = [
  'Which units are currently vacant?',
  'Show me all tenants with outstanding balances above 10,000',
  'List the top 10 water consumers for June 2026',
  'Which meters have not been read for July 2026?',
  'Show overdue invoices older than 30 days',
  'How many units are occupied vs vacant?',
  'List all payments received in the last 30 days',
  'Which tenants have anomalous water readings?',
]

let msgCounter = 0
function nextId() { return ++msgCounter }

export default function AiQueryPanel({ open, onClose }: AiQueryPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [expandSql, setExpandSql] = useState<Record<number, boolean>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  async function send(question: string) {
    if (!question.trim() || loading) return
    const userMsg: Message = { id: nextId(), role: 'user', text: question.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const result = await runAiQuery(question.trim())
      const assistantMsg: Message = {
        id:     nextId(),
        role:   'assistant',
        text:   result.explanation || 'Here are the results.',
        result: result.rows.length > 0 || result.sql ? result : undefined,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      const assistantMsg: Message = {
        id:    nextId(),
        role:  'assistant',
        text:  '',
        error: err instanceof Error ? err.message : 'An error occurred.',
      }
      setMessages(prev => [...prev, assistantMsg])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  function toggleSql(id: number) {
    setExpandSql(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[560px] flex flex-col bg-white dark:bg-dark-surface border-l border-surface-border dark:border-dark-border shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text">Ask AI</h2>
              <p className="text-[11px] text-text-muted">Query your facility data in plain English</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {messages.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-text-muted text-center pt-4">
                Ask any question about your property data. I&apos;ll generate a query and show the results.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="text-left text-xs px-3 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-text hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
              )}

              <div className={cn(
                'max-w-[85%] space-y-2',
                msg.role === 'user' ? 'items-end' : 'items-start'
              )}>
                {/* Bubble */}
                {(msg.text || msg.error) && (
                  <div className={cn(
                    'px-3.5 py-2.5 rounded-2xl text-sm',
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : msg.error
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800 rounded-bl-sm'
                        : 'bg-surface-muted dark:bg-dark-card text-text rounded-bl-sm'
                  )}>
                    {msg.error ? msg.error : msg.text}
                  </div>
                )}

                {/* Results */}
                {msg.result && (
                  <div className="space-y-2 w-full">
                    {/* SQL toggle */}
                    {msg.result.sql && (
                      <button
                        onClick={() => toggleSql(msg.id)}
                        className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text transition-colors"
                      >
                        <svg className={cn('w-3 h-3 transition-transform', expandSql[msg.id] && 'rotate-90')}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        {expandSql[msg.id] ? 'Hide' : 'Show'} SQL
                      </button>
                    )}
                    {expandSql[msg.id] && msg.result.sql && (
                      <pre className="text-[11px] bg-gray-900 text-green-400 p-3 rounded-xl overflow-x-auto leading-relaxed">
                        {msg.result.sql}
                      </pre>
                    )}

                    {/* Table */}
                    {msg.result.rows.length > 0 ? (
                      <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden">
                        <div className="overflow-x-auto max-h-64">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-surface-muted dark:bg-dark-card border-b border-surface-border dark:border-dark-border">
                                {msg.result.columns.map(col => (
                                  <th key={col} className="px-3 py-2 text-left font-semibold text-text-muted whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                              {msg.result.rows.map((row, ri) => (
                                <tr key={ri} className="hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-2 text-text whitespace-nowrap">
                                      {cell ?? <span className="text-text-muted italic">null</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="px-3 py-1.5 bg-surface-muted dark:bg-dark-card border-t border-surface-border dark:border-dark-border">
                          <p className="text-[11px] text-text-muted">
                            {msg.result.rows.length} row{msg.result.rows.length !== 1 ? 's' : ''}
                            {msg.result.rows.length === 500 && ' (limit reached — refine your question to see more)'}
                          </p>
                        </div>
                      </div>
                    ) : msg.result.sql ? (
                      <p className="text-xs text-text-muted italic">No rows returned.</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-3.5 h-3.5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-surface-muted dark:bg-dark-card">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-4 border-t border-surface-border dark:border-dark-border flex-shrink-0">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="mb-2 text-[11px] text-text-muted hover:text-text transition-colors"
            >
              Clear conversation
            </button>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your data…"
              rows={2}
              disabled={loading}
              className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition disabled:opacity-50"
            />
            <button
              onClick={() => void send(input)}
              disabled={!input.trim() || loading}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="Send"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-text-muted">
            Press Enter to send · Shift+Enter for new line · Results are read-only
          </p>
        </div>
      </div>
    </>
  )
}

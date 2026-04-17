'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { LogOut, ChevronDown, Upload, Check, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import ThemeSetSelector from '@/components/ThemeSetSelector'

// ── Import Overlay ──────────────────────────────────────────────────────────

type ImportPhase = 'idle' | 'parsing' | 'uploading' | 'processing' | 'done' | 'error'

const PHASE_LABEL: Record<ImportPhase, string> = {
  idle: '',
  parsing: 'Reading file…',
  uploading: 'Uploading to server…',
  processing: 'Processing race data…',
  done: 'Import complete',
  error: 'Import failed',
}

const PHASE_PROGRESS: Record<ImportPhase, number> = {
  idle: 0,
  parsing: 15,
  uploading: 40,
  processing: 75,
  done: 100,
  error: 100,
}

function ImportOverlay({ phase, message, onDismiss }: {
  phase: ImportPhase
  message: string | null
  onDismiss: () => void
}) {
  if (phase === 'idle') return null

  const progress = PHASE_PROGRESS[phase]
  const isError = phase === 'error'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated, #1a1a1a)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '40px 48px',
          minWidth: 400,
          maxWidth: 480,
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div className="mb-4">
          {phase === 'done' ? (
            <Check size={40} style={{ color: '#66bb6a', margin: '0 auto' }} />
          ) : isError ? (
            <AlertCircle size={40} style={{ color: '#ef5350', margin: '0 auto' }} />
          ) : (
            <Loader2 size={40} className="animate-spin" style={{ color: 'var(--border-accent)', margin: '0 auto' }} />
          )}
        </div>

        {/* Phase label */}
        <h3
          className="font-bold mb-2"
          style={{ fontSize: 'var(--fs-lg, 18px)', fontFamily: 'var(--ff-display)', color: 'var(--text)' }}
        >
          {phase === 'done' ? 'Import Complete' : isError ? 'Import Failed' : 'Importing iRacing Data'}
        </h3>
        <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
          {message || PHASE_LABEL[phase]}
        </p>

        {/* Progress bar */}
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: 'var(--bg, #222)',
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: 3,
              background: isError ? '#ef5350' : phase === 'done' ? '#66bb6a' : 'var(--border-accent, #e53935)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>

        {/* Dismiss on error */}
        {isError && (
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-xs rounded-lg font-medium transition-colors"
            style={{
              background: 'var(--bg, #222)',
              color: 'var(--text-dim)',
              border: '1px solid var(--border)',
            }}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

// ── UserMenu ────────────────────────────────────────────────────────────────

interface UserMenuProps {
  user: {
    name: string
    image?: string | null
    isAdmin: boolean
    isPluginConnected: boolean
  }
  signOutAction: () => Promise<void>
}

export default function UserMenu({ user, signOutAction }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [resetStatus, setResetStatus] = useState<'idle' | 'confirm' | 'resetting' | 'done'>('idle')
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOpen(false) // close dropdown
    setImportPhase('parsing')
    setImportMsg(null)
    try {
      const raw = await file.text()
      let payload = JSON.parse(raw)
      if (Array.isArray(payload)) {
        while (payload.length === 1 && Array.isArray(payload[0])) payload = payload[0]
      }
      const body = Array.isArray(payload) ? { recentRaces: payload } : payload
      if (body.cust_id && !body.custId) {
        body.custId = body.cust_id
        body.displayName = body.display_name || body.displayName || ''
      }

      setImportPhase('uploading')
      const res = await fetch('/api/iracing/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      setImportPhase('processing')
      const data = await res.json()

      if (res.ok && data.success) {
        const sessions = data.imported?.sessions ?? 0
        const ratings = data.imported?.historyPoints ?? 0
        const parts: string[] = []
        if (sessions) parts.push(`${sessions} sessions`)
        if (ratings) parts.push(`${ratings} rating points`)
        setImportMsg(parts.length > 0 ? `Imported ${parts.join(' and ')}` : 'Import complete — no new data found')
        setImportPhase('done')
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setImportPhase('error')
        setImportMsg(data.error || 'Import failed')
      }
    } catch (err: any) {
      setImportPhase('error')
      setImportMsg(err.message || 'Invalid JSON file')
    }
    // Reset file input so the same file can be re-selected
    e.target.value = ''
  }, [])

  const handleResetRatings = useCallback(async () => {
    if (resetStatus === 'idle') {
      setResetStatus('confirm')
      return
    }
    if (resetStatus !== 'confirm') return
    setResetStatus('resetting')
    try {
      const res = await fetch('/api/ratings/reset', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        setResetStatus('done')
        const d = data.deleted
        const parts: string[] = []
        if (d.sessionRows) parts.push(`${d.sessionRows} sessions`)
        if (d.historyRows) parts.push(`${d.historyRows} history`)
        if (d.ratingRows) parts.push(`${d.ratingRows} ratings`)
        if (d.accountRows) parts.push(`${d.accountRows} accounts`)
        setResetMsg(`Cleared ${parts.join(', ') || 'all data'} — reloading…`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setResetMsg(data.error || 'Reset failed')
        setResetStatus('idle')
        setTimeout(() => setResetMsg(null), 4000)
      }
    } catch {
      setResetMsg('Network error')
      setResetStatus('idle')
      setTimeout(() => setResetMsg(null), 4000)
    }
  }, [resetStatus])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer hover:bg-[var(--bg-surface)]"
      >
        {/* Connection status dot */}
        {user.isPluginConnected && (
          <span
            className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"
            title="SimHub connected"
          />
        )}
        {user.image && (
          <img src={user.image} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
        )}
        <span className="text-xs text-[var(--text-secondary)] font-medium">{user.name}</span>
        <ChevronDown
          size={12}
          className="text-[var(--text-muted)]"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: 220,
            background: 'var(--bg-elevated, var(--bg-panel))',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 100,
            padding: '8px 0',
          }}
        >
          {/* Theme section */}
          <div className="px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Theme
            </div>
            <div className="flex flex-col gap-2">
              <ThemeSetSelector />
              <ThemeToggle />
            </div>
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-[var(--border)]" />

          {/* iRacing Import */}
          <div className="px-3 py-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer">
              <Upload size={14} />
              Import iRacing Data
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Reset iRacing Data */}
          <div className="px-3 py-1.5">
            {resetStatus === 'idle' && (
              <button
                onClick={handleResetRatings}
                className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                {resetMsg || 'Reset iRacing Data'}
              </button>
            )}
            {resetStatus === 'confirm' && (
              <button
                onClick={handleResetRatings}
                className="flex items-center gap-2 text-xs font-medium text-red-400 cursor-pointer"
              >
                <Trash2 size={14} />
                Click again to confirm
              </button>
            )}
            {resetStatus === 'resetting' && (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-red-400" />
                <span className="text-xs text-[var(--text-dim)]">Resetting...</span>
              </div>
            )}
            {resetStatus === 'done' && (
              <div className="flex items-center gap-1.5">
                <Check size={13} style={{ color: '#66bb6a' }} />
                <span className="text-xs font-medium" style={{ color: '#66bb6a' }}>{resetMsg}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-[var(--border)]" />

          {/* Sign out */}
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </form>
        </div>
      )}

      {/* Full-page import overlay */}
      <ImportOverlay
        phase={importPhase}
        message={importMsg}
        onDismiss={() => { setImportPhase('idle'); setImportMsg(null) }}
      />
    </div>
  )
}

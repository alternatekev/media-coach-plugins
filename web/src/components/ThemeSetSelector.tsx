'use client'

import { useState, useEffect } from 'react'

interface ThemeSet {
  slug: string
  name: string
}

const SET_COOKIE = 'racecor-theme-set'

export default function ThemeSetSelector() {
  const [sets, setSets] = useState<ThemeSet[]>([])
  const [activeSlug, setActiveSlug] = useState<string>('default')

  useEffect(() => {
    // Read current set from cookie
    const match = document.cookie.match(new RegExp(`${SET_COOKIE}=([^;]+)`))
    if (match) setActiveSlug(match[1])

    // Fetch available sets
    fetch('/api/admin/theme-sets')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.sets) setSets(data.sets)
      })
      .catch(() => {})
  }, [])

  const handleChange = (slug: string) => {
    setActiveSlug(slug)
    document.cookie = `${SET_COOKIE}=${slug};path=/;max-age=31536000;SameSite=Lax`
    // Dispatch a custom event so the TokenEditor can react
    window.dispatchEvent(new CustomEvent('theme-set-change', { detail: { slug } }))
  }

  if (sets.length === 0) return null

  return (
    <select
      value={activeSlug}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md border transition-colors appearance-none cursor-pointer"
      style={{
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
        background: 'var(--bg-panel)',
      }}
      title="Theme set"
    >
      {sets.map((s) => (
        <option key={s.slug} value={s.slug}>
          {s.name}
        </option>
      ))}
    </select>
  )
}

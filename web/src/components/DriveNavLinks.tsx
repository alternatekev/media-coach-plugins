'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Dna,
  CalendarClock,
  MapPin,
  Sparkles,
  Settings,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/drive/dashboard', label: 'Dashboard', icon: LayoutDashboard },

  { href: '/drive/dna', label: 'DNA', icon: Dna },
  { href: '/drive/tracks', label: 'Tracks & Cars', icon: MapPin },
  { href: '/drive/moments', label: 'Moments', icon: Sparkles },
]

function NavTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div
        className="
          pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5
          px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap
          bg-[var(--bg-elevated)] text-[var(--text-primary)]
          border border-[var(--border)]
          opacity-0 scale-95 translate-y-0.5
          group-hover/tip:opacity-100 group-hover/tip:scale-100 group-hover/tip:translate-y-0
          transition-all duration-150 ease-out
          shadow-lg backdrop-blur-md
          z-50
        "
      >
        {label}
        {/* Arrow */}
        <div
          className="
            absolute left-1/2 -translate-x-1/2 -top-1
            w-2 h-2 rotate-45
            bg-[var(--bg-elevated)] border-l border-t border-[var(--border)]
          "
        />
      </div>
    </div>
  )
}

export default function DriveNavLinks({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = pathname.startsWith(item.href)
        return (
          <NavTooltip key={item.href} label={item.label}>
            <Link
              href={item.href}
              className={`
                px-3 py-2 flex items-center gap-1.5
                text-sm font-medium whitespace-nowrap
                border-b-2 transition-colors
                ${
                  isActive
                    ? 'text-[var(--text-secondary)] border-b-[var(--border-accent)]'
                    : 'text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-dim)]'
                }
              `}
            >
              <Icon size={24} />
            </Link>
          </NavTooltip>
        )
      })}
      {isAdmin && (
        <NavTooltip label="Admin">
          <Link
            href="/drive/admin"
            className={`
              px-3 py-2 flex items-center gap-1.5
              text-sm font-medium whitespace-nowrap
              border-b-2 transition-colors
              ${
                pathname.startsWith('/drive/admin')
                  ? 'text-[var(--k10-red)] border-b-[var(--k10-red)]'
                  : 'text-[var(--k10-red)]/60 border-b-transparent hover:text-[var(--k10-red)]'
              }
            `}
          >
            <Settings size={24} />
          </Link>
        </NavTooltip>
      )}
    </div>
  )
}

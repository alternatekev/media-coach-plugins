'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTelemetry } from './TelemetryProvider'

/**
 * Features mapped to dashboard modules.
 * `module` matches the key in the embed's _moduleMap (postMessage shim).
 */
const FEATURES = [
  {
    module: 'tacho',
    title: 'Live Telemetry HUD',
    desc: 'Gear, speed, RPM with color-coded tachometer. Redline flash at 91%+ RPM ratio. All rendered at display refresh rate.',
    accent: 'var(--k10-red)',
  },
  {
    module: 'pedals',
    title: 'Driver Inputs',
    desc: 'Layered throttle, brake, and clutch pedal traces with real-time percentage readout. BB/TC/ABS controls with adjustability detection per car.',
    accent: 'var(--green)',
  },
  {
    module: 'fuel',
    title: 'Race Strategy',
    desc: 'Fuel burn rate, estimated laps remaining, pit window suggestions. Four-corner tyre temps with wear bars and degradation tracking.',
    accent: 'var(--amber)',
  },
  {
    module: 'maps',
    title: 'Track Map & Sectors',
    desc: 'SVG minimap with heading-up rotation. Opponent dots with proximity glow. Per-sector timing with live delta and PB tracking.',
    accent: 'var(--blue)',
  },
  {
    module: 'position',
    title: 'Race Position',
    desc: 'Live position with delta-to-start. iRating and Safety Rating with sparkline charts. Ahead/behind gaps with driver names and iRating.',
    accent: 'var(--cyan)',
  },
] as const

const CYCLE_MS = 8000

export function FeatureShowcase() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { data, status } = useTelemetry()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Cycle through features ──
  useEffect(() => {
    if (isHovered) return
    timerRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % FEATURES.length)
    }, CYCLE_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isHovered])

  // ── Send telemetry data to iframe ──
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow || !data) return
    iframe.contentWindow.postMessage(
      { type: 'k10-telemetry', snapshot: data },
      '*',
    )
  }, [data])

  // ── Send isolate command when active feature changes ──
  const sendIsolate = useCallback((module: string) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    iframe.contentWindow.postMessage(
      { type: 'k10-isolate', module },
      '*',
    )
  }, [])

  useEffect(() => {
    sendIsolate(FEATURES[activeIndex].module)
  }, [activeIndex, sendIsolate])

  // Also re-send isolate after iframe loads (it needs time to initialize)
  const handleIframeLoad = useCallback(() => {
    // Small delay to let the embed's JS initialize
    setTimeout(() => {
      sendIsolate(FEATURES[activeIndex].module)
    }, 500)
  }, [activeIndex, sendIsolate])

  const selectFeature = (index: number) => {
    setActiveIndex(index)
    // Reset the cycle timer when manually selecting
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % FEATURES.length)
    }, CYCLE_MS)
  }

  const active = FEATURES[activeIndex]

  return (
    <section id="features" className="px-6 py-20 max-w-6xl mx-auto w-full">
      <h2 className="text-3xl font-black mb-10 text-center">What&apos;s Inside</h2>

      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Left: live module preview */}
        <div
          className="relative flex-1 min-h-[300px] rounded-xl overflow-hidden border border-[var(--border-subtle)]"
          style={{ background: '#0a0a14' }}
        >
          {status !== 'live' && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span className="text-sm text-[var(--text-dim)] animate-pulse">
                Connecting to telemetry…
              </span>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src="/_demo/dashboard-embed.html"
            title="K10 Feature Preview"
            className="border-0 block w-full h-full"
            sandbox="allow-scripts allow-same-origin"
            onLoad={handleIframeLoad}
            style={{
              background: '#0a0a14',
              minHeight: '300px',
              opacity: status === 'live' ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}
          />
        </div>

        {/* Right: feature list */}
        <div
          className="flex flex-col gap-2 lg:w-[340px] flex-shrink-0"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {FEATURES.map((f, i) => {
            const isActive = i === activeIndex
            return (
              <button
                key={f.module}
                onClick={() => selectFeature(i)}
                className={`
                  text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer
                  ${isActive
                    ? 'bg-[var(--bg-surface)] border-[var(--border)]'
                    : 'bg-transparent border-transparent hover:bg-[var(--bg-surface)]/50 hover:border-[var(--border-subtle)]'
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className={`w-1 rounded-full transition-all duration-300 ${isActive ? 'h-5' : 'h-3'}`}
                    style={{ background: isActive ? f.accent : 'var(--text-muted)' }}
                  />
                  <h3 className={`text-base font-bold transition-colors ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
                    {f.title}
                  </h3>
                </div>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: isActive ? '120px' : '0px',
                    opacity: isActive ? 1 : 0,
                  }}
                >
                  <p className="text-sm text-[var(--text-dim)] leading-relaxed pl-4 pt-1">
                    {f.desc}
                  </p>
                  {/* Progress bar */}
                  {isActive && !isHovered && (
                    <div className="mt-3 ml-4 h-[2px] rounded-full bg-[var(--border-subtle)] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: f.accent,
                          animation: `feature-progress ${CYCLE_MS}ms linear`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </button>
            )
          })}

          {/* Inline keyframe for the progress bar */}
          <style>{`
            @keyframes feature-progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTelemetry } from './TelemetryProvider'

/**
 * Full-bleed dashboard embed. The iframe loads the real HUD; a zoom-to-fit
 * script inside it scales the ~904px dashboard to fill whatever width we
 * give it. The parent (this component) owns the resize loop — the iframe
 * never listens to its own resize event (that would loop, since zoom
 * changes trigger resize).
 *
 * Protocol:
 *   parent → iframe: { type: 'k10-container-width', width }
 *   iframe → parent: { type: 'k10-ready', naturalWidth }
 *   iframe → parent: { type: 'k10-resize', height }
 */
export function DashboardEmbed() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { data, status } = useTelemetry()
  const [height, setHeight] = useState(280)

  // Send current container width to the iframe
  const sendWidth = useCallback(() => {
    const el = containerRef.current
    const iframe = iframeRef.current
    if (!el || !iframe?.contentWindow) return
    iframe.contentWindow.postMessage(
      { type: 'k10-container-width', width: el.clientWidth },
      '*',
    )
  }, [])

  // ── Listen for messages from iframe ──
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data?.type) return
      if (e.data.type === 'k10-resize' && typeof e.data.height === 'number') {
        setHeight(e.data.height)
      }
      // iframe measured its natural width and is ready — send ours
      if (e.data.type === 'k10-ready') {
        sendWidth()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [sendWidth])

  // ── ResizeObserver: when container width changes, tell iframe ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => sendWidth())
    ro.observe(el)
    return () => ro.disconnect()
  }, [sendWidth])

  // ── Post telemetry data to iframe on every update ──
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow || !data) return
    iframe.contentWindow.postMessage(
      { type: 'k10-telemetry', snapshot: data },
      '*',
    )
  }, [data])

  return (
    <div ref={containerRef} className="w-full" style={{ background: '#000' }}>
      <div className="relative w-full overflow-hidden" style={{ height }}>
        {status !== 'live' && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: '#000' }}
          >
            <span className="text-sm text-[var(--text-dim)] animate-pulse">
              Connecting to telemetry…
            </span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/_demo/dashboard-embed.html"
          title="K10 Motorsports Dashboard Demo"
          className="border-0 block"
          sandbox="allow-scripts allow-same-origin"
          style={{
            background: '#000',
            width: '100%',
            height: '100%',
            opacity: status === 'live' ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}

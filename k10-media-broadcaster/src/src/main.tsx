/**
 * K10 Pro Driver — iPad Drive Mode
 * Stripped-down entry point: telemetry polling only.
 * Drive Mode JS/CSS and initialization handled by remote-server.js injection.
 * This module only provides the telemetry polling loop.
 */

// Telemetry client for polling SimHub
import { createTelemetryClient } from './lib/telemetry-client'

// Start telemetry polling as soon as this module loads (deferred via type="module")
const url = (window as any)._simhubUrlOverride || 'http://localhost:8889/k10mediabroadcaster/'
const client = createTelemetryClient(url)

client.startPolling((data: Record<string, any>) => {
  const updateDM = (window as any)._driveModeUpdate
  if (updateDM) {
    updateDM(data, data['K10MediaBroadcaster.Plugin.DemoMode'] ? 1 : 0)
  }
})

/**
 * HTTP polling client for K10 Media Broadcaster plugin telemetry.
 * Implements exponential backoff, timeout handling, and connection state tracking.
 */

import type { TelemetryProps, ConnectionStatus } from '../types/telemetry';

/**
 * Configuration for the telemetry client.
 */
export interface TelemetryClientConfig {
  /** Poll interval in milliseconds (default: 33ms ~30fps) */
  pollMs?: number;
  /** Fetch timeout in milliseconds (default: 2000ms) */
  timeoutMs?: number;
  /** Maximum backoff duration in milliseconds (default: 10000ms) */
  maxBackoffMs?: number;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
}

/**
 * Internal client state tracking.
 */
interface ClientState {
  connectionStatus: ConnectionStatus;
  failureCount: number;
  backoffUntil: number;
  pollCount: number;
  lastUpdateTime: number;
  connectedCount: number;
  latencySum: number;
  isPolling: boolean;
}

/**
 * Create a telemetry polling client.
 * Returns an async function that fetches the latest telemetry snapshot.
 */
export function createTelemetryClient(url: string, config?: TelemetryClientConfig) {
  const {
    pollMs = 33,
    timeoutMs = 2000,
    maxBackoffMs = 10000,
    onStatusChange,
  } = config || {};

  const state: ClientState = {
    connectionStatus: 'disconnected',
    failureCount: 0,
    backoffUntil: 0,
    pollCount: 0,
    lastUpdateTime: 0,
    connectedCount: 0,
    latencySum: 0,
    isPolling: false,
  };

  let currentUrl = url;

  /**
   * Update connection status and notify listeners.
   */
  function setStatus(status: ConnectionStatus) {
    if (state.connectionStatus !== status) {
      state.connectionStatus = status;
      onStatusChange?.(status);
    }
  }

  /**
   * Fetch with timeout using Promise.race.
   */
  async function fetchWithTimeout(
    fetchUrl: string,
    timeoutDuration: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    try {
      return await fetch(fetchUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch properties from the plugin server.
   * Implements exponential backoff on failure.
   */
  async function fetchProps(): Promise<TelemetryProps | null> {
    // Check if we're in a backoff window
    if (state.backoffUntil > Date.now()) {
      return null;
    }

    try {
      setStatus('connecting');
      const startTime = performance.now();
      const resp = await fetchWithTimeout(currentUrl, timeoutMs);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json() as TelemetryProps;
      const latencyMs = performance.now() - startTime;

      // Success: reset backoff
      state.failureCount = 0;
      state.backoffUntil = 0;
      state.pollCount++;
      state.connectedCount++;
      state.lastUpdateTime = Date.now();
      state.latencySum += latencyMs;

      setStatus('connected');
      return data;
    } catch (error) {
      // Failure: enter exponential backoff
      state.failureCount++;
      state.backoffUntil = Date.now() + Math.min(
        1000 * Math.pow(2, state.failureCount - 1),
        maxBackoffMs
      );
      state.pollCount++;

      if (state.failureCount <= 3) {
        console.warn(
          `[K10 Media Broadcaster] Plugin server unreachable at ${url} — fail #${state.failureCount}`,
          error
        );
      }

      setStatus('disconnected');
      return null;
    }
  }

  /**
   * Main polling loop. Returns a promise that resolves when polling starts.
   */
  async function startPolling(callback: (data: TelemetryProps) => void): Promise<() => void> {
    if (state.isPolling) {
      throw new Error('Polling already active');
    }

    state.isPolling = true;
    let running = true;

    const poll = async () => {
      if (!running) return;

      const data = await fetchProps();
      if (data) {
        callback(data);
      }

      // Schedule next poll
      setTimeout(poll, pollMs);
    };

    // Start the loop
    setTimeout(poll, 0);

    // Return stop function
    return () => {
      running = false;
      state.isPolling = false;
    };
  }

  /**
   * One-shot fetch for immediate telemetry data.
   */
  async function fetchOnce(): Promise<TelemetryProps | null> {
    return fetchProps();
  }

  /**
   * Get current client statistics.
   */
  function getStats() {
    return {
      pollCount: state.pollCount,
      connectedCount: state.connectedCount,
      failureCount: state.failureCount,
      lastUpdateTime: state.lastUpdateTime,
      connectionStatus: state.connectionStatus,
      averageLatencyMs:
        state.connectedCount > 0 ? state.latencySum / state.connectedCount : 0,
    };
  }

  return {
    fetch: fetchOnce,
    startPolling,
    getStats,
    setUrl: (updatedUrl: string) => {
      currentUrl = updatedUrl;
    },
    getUrl: () => currentUrl,
  };
}

/**
 * Type of the client returned by createTelemetryClient.
 */
export type TelemetryClient = ReturnType<typeof createTelemetryClient>;

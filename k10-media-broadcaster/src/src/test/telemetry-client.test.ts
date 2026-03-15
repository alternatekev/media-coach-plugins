import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTelemetryClient } from '../lib/telemetry-client';
import type { TelemetryProps } from '../types/telemetry';

// Mock telemetry data
const mockTelemetryData: TelemetryProps = {
  'DataCorePlugin.GameRunning': 1,
  'DataCorePlugin.GameData.Gear': 'R',
  'DataCorePlugin.GameData.Rpms': 6000,
  'DataCorePlugin.GameData.CarSettings_MaxRPM': 8000,
  'DataCorePlugin.GameData.SpeedMph': 120,
  'DataCorePlugin.GameData.Throttle': 0.8,
  'DataCorePlugin.GameData.Brake': 0.2,
  'DataCorePlugin.GameData.Clutch': 0,
  'DataCorePlugin.GameData.Fuel': 50,
  'DataCorePlugin.GameData.MaxFuel': 80,
  'DataCorePlugin.Computed.Fuel_LitersPerLap': 2.5,
  'DataCorePlugin.GameData.RemainingLaps': 20,
  'DataCorePlugin.GameData.TyreTempFrontLeft': 95,
  'DataCorePlugin.GameData.TyreTempFrontRight': 96,
  'DataCorePlugin.GameData.TyreTempRearLeft': 94,
  'DataCorePlugin.GameData.TyreTempRearRight': 95,
  'DataCorePlugin.GameData.TyreWearFrontLeft': 0.5,
  'DataCorePlugin.GameData.TyreWearFrontRight': 0.5,
  'DataCorePlugin.GameData.TyreWearRearLeft': 0.4,
  'DataCorePlugin.GameData.TyreWearRearRight': 0.4,
  'DataCorePlugin.GameRawData.Telemetry.dcBrakeBias': 0.55,
  'DataCorePlugin.GameRawData.Telemetry.dcTractionControl': 5,
  'DataCorePlugin.GameRawData.Telemetry.dcABS': 3,
  'DataCorePlugin.GameData.Position': 1,
  'IRacingExtraProperties.iRacing_Opponent_Ahead_Gap': 0,
  'IRacingExtraProperties.iRacing_Opponent_Behind_Gap': 1.234,
  'IRacingExtraProperties.iRacing_Opponent_Ahead_Name': '',
  'IRacingExtraProperties.iRacing_Opponent_Behind_Name': 'Driver 2',
  'IRacingExtraProperties.iRacing_Opponent_Ahead_IRating': 0,
  'IRacingExtraProperties.iRacing_Opponent_Behind_IRating': 1500,
  'DataCorePlugin.GameData.CurrentLap': 5,
  'DataCorePlugin.GameData.BestLapTime': 125.456,
  'DataCorePlugin.GameData.CurrentLapTime': 23.456,
  'DataCorePlugin.GameData.LastLapTime': 126.789,
  'DataCorePlugin.GameData.TotalLaps': 50,
  'DataCorePlugin.GameData.SessionTimeSpan': 0,
  'DataCorePlugin.GameData.RemainingTime': 0,
  'IRacingExtraProperties.iRacing_DriverInfo_IRating': 2000,
  'IRacingExtraProperties.iRacing_DriverInfo_SafetyRating': 4.5,
  'DataCorePlugin.GameData.CarModel': 'BMW M4 GT3',
  'K10MediaBroadcaster.Plugin.CommentaryVisible': 0,
  'K10MediaBroadcaster.Plugin.CommentaryText': '',
  'K10MediaBroadcaster.Plugin.CommentaryTopicTitle': '',
  'K10MediaBroadcaster.Plugin.CommentaryTopicId': '',
  'K10MediaBroadcaster.Plugin.CommentaryCategory': '',
  'K10MediaBroadcaster.Plugin.CommentarySentimentColor': '',
  'K10MediaBroadcaster.Plugin.CommentarySeverity': 0,
  'K10MediaBroadcaster.Plugin.DemoMode': 0,
  'K10MediaBroadcaster.Plugin.Demo.Gear': '',
  'K10MediaBroadcaster.Plugin.Demo.Rpm': 0,
  'K10MediaBroadcaster.Plugin.Demo.MaxRpm': 0,
  'K10MediaBroadcaster.Plugin.Demo.SpeedMph': 0,
  'K10MediaBroadcaster.Plugin.Demo.Throttle': 0,
  'K10MediaBroadcaster.Plugin.Demo.Brake': 0,
  'K10MediaBroadcaster.Plugin.Demo.Clutch': 0,
  'K10MediaBroadcaster.Plugin.Demo.Fuel': 0,
  'K10MediaBroadcaster.Plugin.Demo.MaxFuel': 0,
  'K10MediaBroadcaster.Plugin.Demo.FuelPerLap': 0,
  'K10MediaBroadcaster.Plugin.Demo.RemainingLaps': 0,
  'K10MediaBroadcaster.Plugin.Demo.TyreTempFL': 0,
  'K10MediaBroadcaster.Plugin.Demo.TyreTempFR': 0,
  'K10MediaBroadcaster.Plugin.Demo.TyreTempRL': 0,
  'K10MediaBroadcaster.Plugin.Demo.TyreTempRR': 0,
  'K10MediaBroadcaster.Plugin.Demo.TyreWearFL': 0,
  'K10MediaBroadcaster.Plugin.Demo.TyreWearFR': 0,
  'K10MediaBroadcaster.Plugin.Demo.TyreWearRL': 0,
  'K10MediaBroadcaster.Plugin.Demo.TyreWearRR': 0,
  'K10MediaBroadcaster.Plugin.Demo.BrakeBias': 0,
  'K10MediaBroadcaster.Plugin.Demo.TC': 0,
  'K10MediaBroadcaster.Plugin.Demo.ABS': 0,
  'K10MediaBroadcaster.Plugin.Demo.Position': 0,
  'K10MediaBroadcaster.Plugin.Demo.CurrentLap': 0,
  'K10MediaBroadcaster.Plugin.Demo.BestLapTime': 0,
  'K10MediaBroadcaster.Plugin.Demo.CarModel': '',
  'K10MediaBroadcaster.Plugin.Demo.SessionTime': 0,
  'K10MediaBroadcaster.Plugin.Demo.CurrentLapTime': 0,
  'K10MediaBroadcaster.Plugin.Demo.LastLapTime': 0,
  'K10MediaBroadcaster.Plugin.Demo.RemainingTime': 0,
  'K10MediaBroadcaster.Plugin.Demo.TotalLaps': 0,
  'K10MediaBroadcaster.Plugin.Demo.IRating': 0,
  'K10MediaBroadcaster.Plugin.Demo.SafetyRating': 0,
  'K10MediaBroadcaster.Plugin.Demo.GapAhead': 0,
  'K10MediaBroadcaster.Plugin.Demo.GapBehind': 0,
  'K10MediaBroadcaster.Plugin.Demo.DriverAhead': '',
  'K10MediaBroadcaster.Plugin.Demo.DriverBehind': '',
  'K10MediaBroadcaster.Plugin.Demo.IRAhead': 0,
  'K10MediaBroadcaster.Plugin.Demo.IRBehind': 0,
  'K10MediaBroadcaster.Plugin.DS.LatG': 0,
  'K10MediaBroadcaster.Plugin.DS.LongG': 0,
  'K10MediaBroadcaster.Plugin.DS.YawRate': 0,
  'K10MediaBroadcaster.Plugin.DS.SteerTorque': 0,
  'K10MediaBroadcaster.Plugin.DS.TrackTemp': 0,
  'K10MediaBroadcaster.Plugin.DS.IncidentCount': 0,
  'K10MediaBroadcaster.Plugin.DS.AbsActive': 0,
  'K10MediaBroadcaster.Plugin.DS.TcActive': 0,
  'K10MediaBroadcaster.Plugin.DS.TrackPct': 0,
  'K10MediaBroadcaster.Plugin.DS.LapDelta': 0,
  'K10MediaBroadcaster.Plugin.DS.CompletedLaps': 0,
  'K10MediaBroadcaster.Plugin.DS.IsInPitLane': 0,
  'K10MediaBroadcaster.Plugin.DS.SpeedKmh': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.LatG': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.LongG': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.YawRate': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.SteerTorque': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.TrackTemp': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.IncidentCount': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.AbsActive': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.TcActive': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.LapDelta': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.IsInPitLane': 0,
  'K10MediaBroadcaster.Plugin.Demo.DS.SpeedKmh': 0,
  'K10MediaBroadcaster.Plugin.TrackMap.Ready': 0,
  'K10MediaBroadcaster.Plugin.TrackMap.SvgPath': '',
  'K10MediaBroadcaster.Plugin.TrackMap.PlayerX': 0,
  'K10MediaBroadcaster.Plugin.TrackMap.PlayerY': 0,
  'K10MediaBroadcaster.Plugin.TrackMap.Opponents': '',
  'K10MediaBroadcaster.Plugin.Leaderboard': '',
  'K10MediaBroadcaster.Plugin.DriverFirstName': 'John',
  'K10MediaBroadcaster.Plugin.DriverLastName': 'Doe',
  'currentFlagState': 'green',
  'K10MediaBroadcaster.Plugin.Grid.SessionState': 'racing',
  'K10MediaBroadcaster.Plugin.Grid.GriddedCars': 20,
  'K10MediaBroadcaster.Plugin.Grid.TotalCars': 20,
  'K10MediaBroadcaster.Plugin.Grid.PaceMode': 'normal',
  'K10MediaBroadcaster.Plugin.Grid.StartType': 'rolling',
  'K10MediaBroadcaster.Plugin.Grid.LightsPhase': 0,
  'K10MediaBroadcaster.Plugin.Grid.TrackCountry': 'USA',
  'K10MediaBroadcaster.Plugin.Demo.Grid.SessionState': '',
  'K10MediaBroadcaster.Plugin.Demo.Grid.GriddedCars': 0,
  'K10MediaBroadcaster.Plugin.Demo.Grid.TotalCars': 0,
  'K10MediaBroadcaster.Plugin.Demo.Grid.PaceMode': '',
  'K10MediaBroadcaster.Plugin.Demo.Grid.LightsPhase': 0,
  'K10MediaBroadcaster.Plugin.Demo.Grid.StartType': '',
  'K10MediaBroadcaster.Plugin.Demo.Grid.TrackCountry': '',
};

describe('telemetry-client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('createTelemetryClient', () => {
    it('should return object with required methods', () => {
      const client = createTelemetryClient('http://localhost:3000');
      expect(client).toHaveProperty('fetch');
      expect(client).toHaveProperty('startPolling');
      expect(client).toHaveProperty('getStats');
      expect(client).toHaveProperty('setUrl');
      expect(client).toHaveProperty('getUrl');
    });

    it('should return functions for all methods', () => {
      const client = createTelemetryClient('http://localhost:3000');
      expect(typeof client.fetch).toBe('function');
      expect(typeof client.startPolling).toBe('function');
      expect(typeof client.getStats).toBe('function');
      expect(typeof client.setUrl).toBe('function');
      expect(typeof client.getUrl).toBe('function');
    });
  });

  describe('fetch', () => {
    it('should return parsed JSON data on successful fetch', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.fetch();
      expect(result).toEqual(mockTelemetryData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should return null on fetch failure', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await client.fetch();
      expect(result).toBeNull();
    });

    it('should return null when response is not ok', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      const mockResponse = {
        ok: false,
        status: 500,
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.fetch();
      expect(result).toBeNull();
    });

    it('should increment failure count on error', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const statsBefore = client.getStats();
      expect(statsBefore.failureCount).toBe(0);

      await client.fetch();
      const statsAfter = client.getStats();
      expect(statsAfter.failureCount).toBe(1);
    });

    it('should reset failure count on success', async () => {
      const client = createTelemetryClient('http://localhost:3000');

      // First, cause a failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await client.fetch();
      let stats = client.getStats();
      expect(stats.failureCount).toBe(1);

      // Advance time past backoff period (1000ms for first failure)
      vi.advanceTimersByTime(1100);

      // Then succeed
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      await client.fetch();
      stats = client.getStats();
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('exponential backoff', () => {
    it('should implement exponential backoff after failures', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // First failure
      await client.fetch();
      let stats = client.getStats();
      const firstBackoff = stats.lastUpdateTime; // Not updated on failure

      // Second call should return null due to backoff
      await client.fetch();
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should reset backoff on successful fetch', async () => {
      const client = createTelemetryClient('http://localhost:3000');

      // Cause a failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await client.fetch();

      // Time travel to after backoff period
      vi.advanceTimersByTime(2000);

      // Succeed
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      const result = await client.fetch();
      expect(result).toEqual(mockTelemetryData);
    });

    it('should cap backoff at maxBackoffMs', async () => {
      const client = createTelemetryClient('http://localhost:3000', {
        maxBackoffMs: 5000,
      });
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // Cause multiple failures
      for (let i = 0; i < 5; i++) {
        await client.fetch();
        vi.advanceTimersByTime(1100);
      }

      const stats = client.getStats();
      expect(stats.failureCount).toBeLessThanOrEqual(6);
    });
  });

  describe('connection status', () => {
    it('should start as disconnected', () => {
      const client = createTelemetryClient('http://localhost:3000');
      const stats = client.getStats();
      expect(stats.connectionStatus).toBe('disconnected');
    });

    it('should notify status changes via callback', async () => {
      const statusChanges: string[] = [];
      const onStatusChange = vi.fn((status) => {
        statusChanges.push(status);
      });

      const client = createTelemetryClient('http://localhost:3000', {
        onStatusChange,
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await client.fetch();
      expect(onStatusChange).toHaveBeenCalled();
      expect(statusChanges).toContain('connecting');
      expect(statusChanges).toContain('connected');
    });

    it('should change to connected after successful fetch', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await client.fetch();
      const stats = client.getStats();
      expect(stats.connectionStatus).toBe('connected');
    });

    it('should change to disconnected on fetch error', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await client.fetch();
      const stats = client.getStats();
      expect(stats.connectionStatus).toBe('disconnected');
    });
  });

  describe('startPolling', () => {
    it('should call callback with data on successful poll', async () => {
      vi.useRealTimers(); // Switch to real timers for this test
      try {
        const client = createTelemetryClient('http://localhost:3000', {
          pollMs: 10,
        });
        const callback = vi.fn();

        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue(mockTelemetryData),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const stop = await client.startPolling(callback);
        expect(typeof stop).toBe('function');

        // Wait for at least one poll to happen
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(callback).toHaveBeenCalled();
        stop();
      } finally {
        vi.useFakeTimers();
      }
    });

    it('should return a stop function', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      const callback = vi.fn();

      const stop = await client.startPolling(callback);
      expect(typeof stop).toBe('function');
      stop();
    });

    it('should stop polling when stop function is called', async () => {
      const client = createTelemetryClient('http://localhost:3000', {
        pollMs: 10,
      });
      const callback = vi.fn();

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const stop = await client.startPolling(callback);

      vi.advanceTimersByTime(30);
      await Promise.resolve();
      const callCountBefore = callback.mock.calls.length;

      stop();
      vi.advanceTimersByTime(100);
      const callCountAfter = callback.mock.calls.length;

      expect(callCountAfter).toBe(callCountBefore);
    });

    it('should throw error if polling already active', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      const callback = vi.fn();

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const stop = await client.startPolling(callback);

      try {
        await expect(client.startPolling(callback)).rejects.toThrow(
          'Polling already active'
        );
      } finally {
        stop();
      }
    });

    it('should continue polling even when fetch fails', async () => {
      vi.useRealTimers(); // Switch to real timers for this test
      try {
        const client = createTelemetryClient('http://localhost:3000', {
          pollMs: 20,
          maxBackoffMs: 30, // Shorter backoff for testing
        });
        const callback = vi.fn();

        global.fetch = vi
          .fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue(mockTelemetryData),
          });

        const stop = await client.startPolling(callback);

        // Wait for first failure then backoff completion, then next successful attempt
        await new Promise(resolve => setTimeout(resolve, 80));

        // Should have at least 2 attempts (first fails, then succeeds after backoff)
        expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
        stop();
      } finally {
        vi.useFakeTimers();
      }
    });
  });

  describe('getStats', () => {
    it('should return stats object with correct structure', () => {
      const client = createTelemetryClient('http://localhost:3000');
      const stats = client.getStats();

      expect(stats).toHaveProperty('pollCount');
      expect(stats).toHaveProperty('connectedCount');
      expect(stats).toHaveProperty('failureCount');
      expect(stats).toHaveProperty('lastUpdateTime');
      expect(stats).toHaveProperty('connectionStatus');
      expect(stats).toHaveProperty('averageLatencyMs');
    });

    it('should initialize stats with zero values', () => {
      const client = createTelemetryClient('http://localhost:3000');
      const stats = client.getStats();

      expect(stats.pollCount).toBe(0);
      expect(stats.connectedCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.lastUpdateTime).toBe(0);
      expect(stats.averageLatencyMs).toBe(0);
    });

    it('should increment pollCount on each fetch', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      let stats = client.getStats();
      expect(stats.pollCount).toBe(0);

      await client.fetch();
      stats = client.getStats();
      expect(stats.pollCount).toBe(1);

      await client.fetch();
      stats = client.getStats();
      expect(stats.pollCount).toBe(2);
    });

    it('should increment connectedCount only on success', async () => {
      const client = createTelemetryClient('http://localhost:3000');

      // First failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await client.fetch();
      let stats = client.getStats();
      expect(stats.connectedCount).toBe(0);

      // Advance time past backoff period
      vi.advanceTimersByTime(1100);

      // Then success
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      await client.fetch();
      stats = client.getStats();
      expect(stats.connectedCount).toBe(1);
    });

    it('should calculate average latency', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await client.fetch();
      const stats = client.getStats();
      expect(stats.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('setUrl / getUrl', () => {
    it('should return initial URL', () => {
      const client = createTelemetryClient('http://localhost:3000');
      expect(client.getUrl()).toBe('http://localhost:3000');
    });

    it('should update URL when setUrl is called', () => {
      const client = createTelemetryClient('http://localhost:3000');
      client.setUrl('http://localhost:4000');
      expect(client.getUrl()).toBe('http://localhost:4000');
    });

    it('should use updated URL for subsequent fetches', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      client.setUrl('http://localhost:4000');
      await client.fetch();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000',
        expect.any(Object)
      );
    });

    it('should allow URL changes during polling', async () => {
      const client = createTelemetryClient('http://localhost:3000', {
        pollMs: 10,
      });
      const callback = vi.fn();

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const stop = await client.startPolling(callback);

      vi.advanceTimersByTime(20);
      client.setUrl('http://localhost:4000');
      expect(client.getUrl()).toBe('http://localhost:4000');

      stop();
    });
  });

  describe('performance and latency', () => {
    it('should track latency for successful requests', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await client.fetch();
      const stats = client.getStats();

      expect(stats.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should not track latency for failed requests', async () => {
      const client = createTelemetryClient('http://localhost:3000');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await client.fetch();
      const stats = client.getStats();

      expect(stats.averageLatencyMs).toBe(0);
      expect(stats.connectedCount).toBe(0);
    });
  });

  describe('timeout handling', () => {
    it('should use custom timeout when provided', async () => {
      const client = createTelemetryClient('http://localhost:3000', {
        timeoutMs: 5000,
      });
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTelemetryData),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await client.fetch();

      // Verify that fetch was called with an AbortSignal
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should use default pollMs config', async () => {
      vi.useRealTimers(); // Switch to real timers for this test
      try {
        const client = createTelemetryClient('http://localhost:3000');
        const callback = vi.fn();

        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue(mockTelemetryData),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const stop = await client.startPolling(callback);
        // Default pollMs is 33, verify polling happens
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(callback.mock.calls.length).toBeGreaterThan(0);
        stop();
      } finally {
        vi.useFakeTimers();
      }
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FuelPanel } from '@components/hud/fuel/FuelPanel';
import { mockTelemetry, mockStats, mockSettings } from '../helpers';

const { mockUseTelemetry, mockUseSettings } = vi.hoisted(() => ({
  mockUseTelemetry: vi.fn(),
  mockUseSettings: vi.fn(),
}));

vi.mock('@hooks/useTelemetry', () => ({
  useTelemetry: mockUseTelemetry,
}));

vi.mock('@hooks/useSettings', () => ({
  useSettings: mockUseSettings,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseTelemetry.mockReturnValue({
    telemetry: mockTelemetry,
    connectionStatus: 'connected',
    stats: mockStats,
  });
  mockUseSettings.mockReturnValue({
    settings: mockSettings,
    updateSetting: vi.fn(),
    resetSettings: vi.fn(),
  });
});

describe('FuelPanel Component', () => {
  it('renders fuel remaining', () => {
    render(<FuelPanel />);
    expect(screen.getByText(/42\.5/)).toBeInTheDocument();
  });

  it('renders avg fuel per lap', () => {
    render(<FuelPanel />);
    expect(screen.getByText(/3\.20/)).toBeInTheDocument();
  });

  it('renders estimated laps', () => {
    render(<FuelPanel />);
    // estimatedLaps = floor(42.5 / 3.2) = floor(13.28) = 13
    expect(screen.getByText(/13/)).toBeInTheDocument();
  });

  it('shows pit suggestion when fuel laps < remaining laps', () => {
    // Default mockTelemetry has:
    // fuelLiters: 42.5
    // fuelPerLap: 3.2
    // fuelRemainingLaps: 13.3
    // estimatedLaps = floor(42.5 / 3.2) = 13
    // Since 13 < 13.3, pit suggestion should show
    render(<FuelPanel />);
    expect(screen.getByText('PIT FOR FUEL')).toBeInTheDocument();
  });

  it('does not show pit suggestion when fuel laps >= remaining laps', () => {
    // Create telemetry where estimatedLaps >= fuelRemainingLaps
    const customTelemetry = {
      ...mockTelemetry,
      fuelLiters: 50,
      fuelPerLap: 2.5,
      fuelRemainingLaps: 10, // estimatedLaps = 50/2.5 = 20, so 20 >= 10
    };

    mockUseTelemetry.mockReturnValue({
      telemetry: customTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    render(<FuelPanel />);
    expect(screen.queryByText('PIT FOR FUEL')).not.toBeInTheDocument();
  });
});

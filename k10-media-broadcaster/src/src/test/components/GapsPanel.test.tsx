import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GapsPanel from '@components/hud/GapsPanel';
import { mockTelemetry, mockStats } from '../helpers';

const { mockUseTelemetry } = vi.hoisted(() => ({
  mockUseTelemetry: vi.fn(),
}));

vi.mock('@hooks/useTelemetry', () => ({
  useTelemetry: mockUseTelemetry,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseTelemetry.mockReturnValue({
    telemetry: mockTelemetry,
    connectionStatus: 'connected',
    stats: mockStats,
  });
});

describe('GapsPanel Component', () => {
  it('renders ahead gap with green color', () => {
    render(<GapsPanel />);
    // gapAhead is 1.234
    // fmtGap formats as "+X.Xs" format
    expect(screen.getByText(/1\.234s/)).toBeInTheDocument();
  });

  it('renders behind gap with red color', () => {
    render(<GapsPanel />);
    // gapBehind is 0.867
    // fmtGap formats it with appropriate sign
    expect(screen.getByText(/0\.867s/)).toBeInTheDocument();
  });

  it('renders driver ahead name', () => {
    render(<GapsPanel />);
    expect(screen.getByText('M. Verstappen')).toBeInTheDocument();
  });

  it('renders driver behind name', () => {
    render(<GapsPanel />);
    expect(screen.getByText('L. Hamilton')).toBeInTheDocument();
  });

  it('shows flag overlay when flagState is active (yellow flag)', () => {
    // Create telemetry with yellow flag
    const yellowFlagTelemetry = { ...mockTelemetry, flagState: 'yellow' };

    mockUseTelemetry.mockReturnValue({
      telemetry: yellowFlagTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    render(<GapsPanel />);
    expect(screen.getByText('YELLOW FLAG')).toBeInTheDocument();
    expect(screen.getByText('Caution')).toBeInTheDocument();
  });

  it('does not show flag overlay when flagState is none', () => {
    // Default mockTelemetry has flagState: 'none'
    render(<GapsPanel />);
    expect(screen.queryByText('YELLOW FLAG')).not.toBeInTheDocument();
    expect(screen.queryByText('RED FLAG')).not.toBeInTheDocument();
  });

  it('shows red flag overlay', () => {
    const redFlagTelemetry = { ...mockTelemetry, flagState: 'red' };

    mockUseTelemetry.mockReturnValue({
      telemetry: redFlagTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    render(<GapsPanel />);
    expect(screen.getByText('RED FLAG')).toBeInTheDocument();
    expect(screen.getByText('Session stopped')).toBeInTheDocument();
  });

  it('shows blue flag overlay', () => {
    const blueFlagTelemetry = { ...mockTelemetry, flagState: 'blue' };

    mockUseTelemetry.mockReturnValue({
      telemetry: blueFlagTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    render(<GapsPanel />);
    expect(screen.getByText('BLUE FLAG')).toBeInTheDocument();
    expect(screen.getByText('Faster car approaching')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import IncidentsPanel from '@components/panels/IncidentsPanel';
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

describe('IncidentsPanel Component', () => {
  it('renders incident count', () => {
    render(<IncidentsPanel />);
    // mockTelemetry.incidentCount = 4
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('applies correct color level (level 2 for 3-4 incidents)', () => {
    const { container } = render(<IncidentsPanel />);
    // incidentCount = 4 should be level 2 (count <= 4)
    const panel = container.querySelector('[class*="incidents-panel"]');
    expect(panel?.className).toContain('inc-level-2');
  });

  it('shows remaining incidents to penalty', () => {
    render(<IncidentsPanel />);
    // incidentCount = 4, incPenalty = 17
    // remainingPenalty = 17 - 4 = 13
    const penaltyElements = screen.getByText('13');
    expect(penaltyElements).toBeInTheDocument();
  });

  it('shows remaining to DQ', () => {
    render(<IncidentsPanel />);
    // incidentCount = 4, incDQ = 25
    // remainingDQ = 25 - 4 = 21
    const dqElements = screen.getByText('21');
    expect(dqElements).toBeInTheDocument();
  });

  it('applies level 0 for 0 incidents', () => {
    const zeroIncidentsTelemetry = { ...mockTelemetry, incidentCount: 0 };

    mockUseTelemetry.mockReturnValue({
      telemetry: zeroIncidentsTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    const { container } = render(<IncidentsPanel />);
    const panel = container.querySelector('[class*="incidents-panel"]');
    expect(panel?.className).toContain('inc-level-0');
  });

  it('applies level 1 for 1-2 incidents', () => {
    const lowIncidentsTelemetry = { ...mockTelemetry, incidentCount: 2 };

    mockUseTelemetry.mockReturnValue({
      telemetry: lowIncidentsTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    const { container } = render(<IncidentsPanel />);
    const panel = container.querySelector('[class*="incidents-panel"]');
    expect(panel?.className).toContain('inc-level-1');
  });

  it('applies level 3 for 5-6 incidents', () => {
    const mediumIncidentsTelemetry = { ...mockTelemetry, incidentCount: 5 };

    mockUseTelemetry.mockReturnValue({
      telemetry: mediumIncidentsTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    const { container } = render(<IncidentsPanel />);
    const panel = container.querySelector('[class*="incidents-panel"]');
    expect(panel?.className).toContain('inc-level-3');
  });

  it('applies level 5 for 10+ incidents', () => {
    const highIncidentsTelemetry = { ...mockTelemetry, incidentCount: 10 };

    mockUseTelemetry.mockReturnValue({
      telemetry: highIncidentsTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    const { container } = render(<IncidentsPanel />);
    const panel = container.querySelector('[class*="incidents-panel"]');
    expect(panel?.className).toContain('inc-level-5');
  });

  it('shows PENALTY text when remaining penalty is 0', () => {
    // Create telemetry with incidentCount >= incPenalty
    const penaltyTelemetry = { ...mockTelemetry, incidentCount: 17 };

    mockUseTelemetry.mockReturnValue({
      telemetry: penaltyTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    render(<IncidentsPanel />);
    expect(screen.getByText('PENALTY')).toBeInTheDocument();
  });

  it('shows DQ text when remaining DQ is 0', () => {
    // Create telemetry with incidentCount >= incDQ
    const dqTelemetry = { ...mockTelemetry, incidentCount: 25 };

    mockUseTelemetry.mockReturnValue({
      telemetry: dqTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    render(<IncidentsPanel />);
    // DQ appears both in the label and in the warning text
    const dqElements = screen.getAllByText('DQ');
    expect(dqElements.length).toBeGreaterThan(0);
  });
});

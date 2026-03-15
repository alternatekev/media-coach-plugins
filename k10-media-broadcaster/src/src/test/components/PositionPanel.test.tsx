import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PositionPanel from '@components/hud/PositionPanel';
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

describe('PositionPanel Component', () => {
  it('renders position P5', () => {
    render(<PositionPanel />);
    // Position is 5 in mockTelemetry
    // P5 appears multiple times on the page (fixed header + cycling page)
    const posElements = screen.getAllByText(/P5/);
    expect(posElements.length).toBeGreaterThan(0);
  });

  it('renders current lap', () => {
    render(<PositionPanel />);
    // currentLap is 12 in mockTelemetry
    // The lap appears multiple times on the page (fixed header + cycling page)
    const lapElements = screen.getAllByText(/^12$/);
    expect(lapElements.length).toBeGreaterThan(0);
  });

  it('renders best lap time formatted', () => {
    render(<PositionPanel />);
    // bestLapTime is 83.456 seconds
    // fmtLap formats as M:SS.mmm format
    // 83.456 seconds = 1 minute 23.456 seconds = "1:23.456"
    // Best lap time appears in both the fixed header and the cycling page
    const lapElements = screen.getAllByText(/1:23\.456/);
    expect(lapElements.length).toBeGreaterThan(0);
  });

  it('displays iRating on initial render (rating page)', () => {
    render(<PositionPanel />);
    // mockTelemetry.iRating = 3500
    expect(screen.getByText('3500')).toBeInTheDocument();
  });

  it('displays safety rating on initial render', () => {
    render(<PositionPanel />);
    // mockTelemetry.safetyRating = 3.45
    // The value appears in the rating row during the active rating page
    const allElements = screen.getAllByText(/3\.45/);
    expect(allElements.length).toBeGreaterThan(0);
  });
});

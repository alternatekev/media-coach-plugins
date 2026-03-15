import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tachometer } from '@components/hud/tachometer/Tachometer';
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

describe('Tachometer Component', () => {
  it('renders gear text', () => {
    render(<Tachometer />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders speed value', () => {
    render(<Tachometer />);
    expect(screen.getByText('112')).toBeInTheDocument();
  });

  it('renders RPM text', () => {
    render(<Tachometer />);
    expect(screen.getByText('6500')).toBeInTheDocument();
  });

  it('shows correct number of segments (11)', () => {
    const { container } = render(<Tachometer />);
    const segments = container.querySelectorAll('[class*="tacho-seg"]');
    expect(segments.length).toBe(11);
  });

  it('applies redline class when RPM ratio > 0.91', () => {
    // RPM ratio = 6500 / 8500 = 0.765, which is NOT redline
    const { container } = render(<Tachometer />);
    const tacho = container.querySelector('[class*="tacho-block"]');
    expect(tacho?.className).not.toContain('tacho-redline');
  });

  it('applies redline class when RPM is high enough', () => {
    // Create a custom mock with high RPM
    const highRpmTelemetry = { ...mockTelemetry, rpm: 7800 }; // ratio = 0.918 > 0.91
    mockUseTelemetry.mockReturnValue({
      telemetry: highRpmTelemetry,
      connectionStatus: 'connected',
      stats: mockStats,
    });

    const { container } = render(<Tachometer />);
    const tacho = container.querySelector('[class*="tacho-block"]');
    expect(tacho?.className).toContain('tacho-redline');
  });
});

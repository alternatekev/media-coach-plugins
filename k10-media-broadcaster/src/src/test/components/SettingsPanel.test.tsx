import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '@components/settings/SettingsPanel';
import { SettingsProvider } from '@hooks/useSettings';
import { mockSettings } from '../helpers';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

/**
 * Wrapper component that provides SettingsProvider context
 */
function SettingsPanelWithProvider() {
  return (
    <SettingsProvider>
      <SettingsPanel />
    </SettingsProvider>
  );
}

describe('SettingsPanel Component', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Visibility and Opening', () => {
    it('is hidden by default', () => {
      render(<SettingsPanelWithProvider />);
      const overlay = screen.getByRole('dialog', { hidden: true });
      expect(overlay.className).toMatch(/overlay/);
      expect(overlay.className).not.toMatch(/overlayOpen/);
    });

    it('opens when Ctrl+Shift+S is pressed', async () => {
      render(<SettingsPanelWithProvider />);
      const overlay = screen.getByRole('dialog', { hidden: true });

      // Initially hidden
      expect(overlay.className).not.toMatch(/overlayOpen/);

      // Press Ctrl+Shift+S
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });

      // Should now be visible
      expect(overlay.className).toMatch(/overlayOpen/);
    });

    it('toggles closed when Ctrl+Shift+S is pressed again', async () => {
      render(<SettingsPanelWithProvider />);
      const overlay = screen.getByRole('dialog', { hidden: true });

      // Open
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });
      expect(overlay.className).toMatch(/overlayOpen/);

      // Close
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });
      expect(overlay.className).not.toMatch(/overlayOpen/);
    });

    it('closes when Close Settings button is clicked', async () => {
      render(<SettingsPanelWithProvider />);
      const overlay = screen.getByRole('dialog', { hidden: true });

      // Open
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });
      expect(overlay.className).toMatch(/overlayOpen/);

      // Click close button
      const closeBtn = screen.getByRole('button', { name: /close settings/i });
      fireEvent.click(closeBtn);

      // Should be hidden
      expect(overlay.className).not.toMatch(/overlayOpen/);
    });
  });

  describe('Tabs', () => {
    beforeEach(() => {
      render(<SettingsPanelWithProvider />);
      // Open the settings panel
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });
    });

    it('renders three tabs: Sections, Layout, System', () => {
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
      expect(tabs[0]).toHaveTextContent('Sections');
      expect(tabs[1]).toHaveTextContent('Layout');
      expect(tabs[2]).toHaveTextContent('System');
    });

    it('shows Sections tab content by default when opened', () => {
      // Look for content that only appears in Sections tab
      expect(screen.getByText(/Display/i)).toBeInTheDocument();
      // Fuel should be in the Sections tab
      expect(screen.getByLabelText(/toggle fuel/i)).toBeInTheDocument();
    });

    it('switches to Layout tab when clicked', async () => {
      const layoutTab = screen.getByRole('tab', { name: /layout/i });
      fireEvent.click(layoutTab);

      // Should show Layout-specific content
      expect(screen.getByLabelText(/dashboard position/i)).toBeInTheDocument();
    });

    it('switches to System tab when clicked', async () => {
      const systemTab = screen.getByRole('tab', { name: /system/i });
      fireEvent.click(systemTab);

      // Should show System-specific content
      expect(screen.getByLabelText(/simhub url/i)).toBeInTheDocument();
    });

    it('marks active tab with tabActive class', () => {
      const tabs = screen.getAllByRole('tab');
      const sectionsTab = tabs[0];
      const layoutTab = tabs[1];

      // Sections should be active by default
      expect(sectionsTab.className).toMatch(/tabActive/);
      expect(layoutTab.className).not.toMatch(/tabActive/);

      // Switch to Layout
      fireEvent.click(layoutTab);
      expect(layoutTab.className).toMatch(/tabActive/);
      expect(sectionsTab.className).not.toMatch(/tabActive/);
    });

    it('has correct aria-selected attributes', () => {
      const tabs = screen.getAllByRole('tab');
      const sectionsTab = tabs[0];
      const layoutTab = tabs[1];

      expect(sectionsTab).toHaveAttribute('aria-selected', 'true');
      expect(layoutTab).toHaveAttribute('aria-selected', 'false');

      fireEvent.click(layoutTab);
      expect(sectionsTab).toHaveAttribute('aria-selected', 'false');
      expect(layoutTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Sections Tab', () => {
    beforeEach(() => {
      render(<SettingsPanelWithProvider />);
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });
    });

    it('renders all section toggles in Sections tab', () => {
      const expectedToggles = [
        'Fuel',
        'Tyres',
        'Controls',
        'Pedals',
        'Track Maps',
        'Position',
        'Tachometer',
        'Commentary',
        'Leaderboard',
        'Datastream',
        'Incidents',
        'WebGL',
        'K10 Logo',
        'Car Logo',
      ];

      expectedToggles.forEach((label) => {
        expect(screen.getByLabelText(new RegExp(`toggle ${label}`, 'i'))).toBeInTheDocument();
      });
    });

    it('toggles showFuel when Fuel toggle is clicked', async () => {
      const fuelToggle = screen.getByLabelText(/toggle fuel/i);

      // Should be checked by default (mockSettings has showFuel: true)
      expect(fuelToggle).toHaveAttribute('aria-checked', 'true');

      // Click to toggle
      fireEvent.click(fuelToggle);

      // Should now be unchecked
      expect(fuelToggle).toHaveAttribute('aria-checked', 'false');

      // Click again to re-enable
      fireEvent.click(fuelToggle);
      expect(fuelToggle).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles showTyres when Tyres toggle is clicked', async () => {
      const tyresToggle = screen.getByLabelText(/toggle tyres/i);
      expect(tyresToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(tyresToggle);
      expect(tyresToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showControls when Controls toggle is clicked', async () => {
      const controlsToggle = screen.getByLabelText(/toggle controls/i);
      expect(controlsToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(controlsToggle);
      expect(controlsToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showPedals when Pedals toggle is clicked', async () => {
      const pedalsToggle = screen.getByLabelText(/toggle pedals/i);
      expect(pedalsToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(pedalsToggle);
      expect(pedalsToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showMaps when Track Maps toggle is clicked', async () => {
      const mapsToggle = screen.getByLabelText(/toggle track maps/i);
      expect(mapsToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(mapsToggle);
      expect(mapsToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showPosition when Position toggle is clicked', async () => {
      const posToggle = screen.getByLabelText(/toggle position/i);
      expect(posToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(posToggle);
      expect(posToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showTacho when Tachometer toggle is clicked', async () => {
      const tachoToggle = screen.getByLabelText(/toggle tachometer/i);
      expect(tachoToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(tachoToggle);
      expect(tachoToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showCommentary when Commentary toggle is clicked', async () => {
      const commentaryToggle = screen.getByLabelText(/toggle commentary/i);
      expect(commentaryToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(commentaryToggle);
      expect(commentaryToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showLeaderboard when Leaderboard toggle is clicked', async () => {
      const leaderboardToggle = screen.getByLabelText(/toggle leaderboard/i);
      expect(leaderboardToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(leaderboardToggle);
      expect(leaderboardToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showDatastream when Datastream toggle is clicked', async () => {
      const datastreamToggle = screen.getByLabelText(/toggle datastream/i);
      expect(datastreamToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(datastreamToggle);
      expect(datastreamToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showIncidents when Incidents toggle is clicked', async () => {
      const incidentsToggle = screen.getByLabelText(/toggle incidents/i);
      expect(incidentsToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(incidentsToggle);
      expect(incidentsToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showWebGL when WebGL toggle is clicked', async () => {
      const webglToggle = screen.getByLabelText(/toggle webgl/i);
      expect(webglToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(webglToggle);
      expect(webglToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showK10Logo when K10 Logo toggle is clicked', async () => {
      const k10LogoToggle = screen.getByLabelText(/toggle k10 logo/i);
      expect(k10LogoToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(k10LogoToggle);
      expect(k10LogoToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles showCarLogo when Car Logo toggle is clicked', async () => {
      const carLogoToggle = screen.getByLabelText(/toggle car logo/i);
      expect(carLogoToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(carLogoToggle);
      expect(carLogoToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('applies toggleOn class to enabled toggles', () => {
      const fuelToggle = screen.getByLabelText(/toggle fuel/i);
      expect(fuelToggle.className).toMatch(/toggleOn/);

      // Disable it
      fireEvent.click(fuelToggle);
      expect(fuelToggle.className).not.toMatch(/toggleOn/);
    });
  });

  describe('Layout Tab', () => {
    beforeEach(() => {
      render(<SettingsPanelWithProvider />);
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });
      const layoutTab = screen.getByRole('tab', { name: /layout/i });
      fireEvent.click(layoutTab);
    });

    it('renders position select with all 6 layout options', () => {
      const positionSelect = screen.getByLabelText(/dashboard position/i) as HTMLSelectElement;
      expect(positionSelect).toBeInTheDocument();

      const options = Array.from(positionSelect.options);
      expect(options).toHaveLength(6);
      expect(options[0]).toHaveValue('top-right');
      expect(options[1]).toHaveValue('top-left');
      expect(options[2]).toHaveValue('bottom-right');
      expect(options[3]).toHaveValue('bottom-left');
      expect(options[4]).toHaveValue('top-center');
      expect(options[5]).toHaveValue('bottom-center');
    });

    it('position select defaults to top-right', () => {
      const positionSelect = screen.getByLabelText(/dashboard position/i) as HTMLSelectElement;
      expect(positionSelect.value).toBe('top-right');
    });

    it('changes position when select is changed', async () => {
      const positionSelect = screen.getByLabelText(/dashboard position/i) as HTMLSelectElement;
      expect(positionSelect.value).toBe('top-right');

      fireEvent.change(positionSelect, { target: { value: 'bottom-left' } });
      expect(positionSelect.value).toBe('bottom-left');
    });

    it('shows flow direction select only when position is center', () => {
      // Default is top-right, so flow direction should NOT be shown
      let flowSelect = screen.queryByLabelText(/text flow/i);
      expect(flowSelect).not.toBeInTheDocument();

      // Change to top-center
      const positionSelect = screen.getByLabelText(/dashboard position/i) as HTMLSelectElement;
      fireEvent.change(positionSelect, { target: { value: 'top-center' } });

      // Now flow direction should be shown
      flowSelect = screen.getByLabelText(/text flow/i);
      expect(flowSelect).toBeInTheDocument();

      // Change back to top-right
      fireEvent.change(positionSelect, { target: { value: 'top-right' } });

      // Flow direction should be hidden again
      flowSelect = screen.queryByLabelText(/text flow/i);
      expect(flowSelect).not.toBeInTheDocument();
    });

    it('shows flow direction select when position is bottom-center', async () => {
      const positionSelect = screen.getByLabelText(/dashboard position/i) as HTMLSelectElement;
      fireEvent.change(positionSelect, { target: { value: 'bottom-center' } });

      const flowSelect = screen.getByLabelText(/text flow/i);
      expect(flowSelect).toBeInTheDocument();
    });

    it('renders vertical swap toggle', () => {
      const verticalSwapToggle = screen.getByLabelText(/toggle vertical swap/i);
      expect(verticalSwapToggle).toBeInTheDocument();
      expect(verticalSwapToggle).toHaveAttribute('aria-checked', 'false'); // Default is false
    });

    it('toggles vertical swap', () => {
      const verticalSwapToggle = screen.getByLabelText(/toggle vertical swap/i);
      expect(verticalSwapToggle).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(verticalSwapToggle);
      expect(verticalSwapToggle).toHaveAttribute('aria-checked', 'true');
    });

    it('renders secondary layout select', () => {
      const secLayoutSelect = screen.getByLabelText(/secondary layout mode/i) as HTMLSelectElement;
      expect(secLayoutSelect).toBeInTheDocument();
      expect(secLayoutSelect.value).toBe('stack');
    });

    it('secondary layout select has all 3 options', () => {
      const secLayoutSelect = screen.getByLabelText(/secondary layout mode/i) as HTMLSelectElement;
      const options = Array.from(secLayoutSelect.options);
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveValue('stack');
      expect(options[1]).toHaveValue('compact');
      expect(options[2]).toHaveValue('minimal');
    });

    it('changes secondary layout when select is changed', () => {
      const secLayoutSelect = screen.getByLabelText(/secondary layout mode/i) as HTMLSelectElement;
      expect(secLayoutSelect.value).toBe('stack');

      fireEvent.change(secLayoutSelect, { target: { value: 'compact' } });
      expect(secLayoutSelect.value).toBe('compact');
    });

    it('renders offset X range slider with correct range', () => {
      const offsetXSlider = screen.getByLabelText(/offset x/i) as HTMLInputElement;
      expect(offsetXSlider).toBeInTheDocument();
      expect(offsetXSlider.type).toBe('range');
      expect(offsetXSlider.min).toBe('-200');
      expect(offsetXSlider.max).toBe('200');
      expect(offsetXSlider.value).toBe('0'); // Default is 0
    });

    it('renders offset Y range slider with correct range', () => {
      const offsetYSlider = screen.getByLabelText(/offset y/i) as HTMLInputElement;
      expect(offsetYSlider).toBeInTheDocument();
      expect(offsetYSlider.type).toBe('range');
      expect(offsetYSlider.min).toBe('-200');
      expect(offsetYSlider.max).toBe('200');
      expect(offsetYSlider.value).toBe('0'); // Default is 0
    });

    it('changes offset X when slider is moved', () => {
      const offsetXSlider = screen.getByLabelText(/offset x/i) as HTMLInputElement;
      expect(offsetXSlider.value).toBe('0');

      fireEvent.change(offsetXSlider, { target: { value: '50' } });
      expect(offsetXSlider.value).toBe('50');
    });

    it('changes offset Y when slider is moved', () => {
      const offsetYSlider = screen.getByLabelText(/offset y/i) as HTMLInputElement;
      expect(offsetYSlider.value).toBe('0');

      fireEvent.change(offsetYSlider, { target: { value: '-75' } });
      expect(offsetYSlider.value).toBe('-75');
    });

    it('renders zoom range slider with correct range', () => {
      const zoomSlider = screen.getByLabelText(/zoom level/i) as HTMLInputElement;
      expect(zoomSlider).toBeInTheDocument();
      expect(zoomSlider.type).toBe('range');
      expect(zoomSlider.min).toBe('100');
      expect(zoomSlider.max).toBe('200');
      expect(zoomSlider.value).toBe('165'); // Default from mockSettings
    });

    it('zoom slider default value is 165%', () => {
      const zoomSlider = screen.getByLabelText(/zoom level/i) as HTMLInputElement;
      expect(zoomSlider.value).toBe('165');
    });

    it('changes zoom when slider is moved', () => {
      const zoomSlider = screen.getByLabelText(/zoom level/i) as HTMLInputElement;
      expect(zoomSlider.value).toBe('165');

      fireEvent.change(zoomSlider, { target: { value: '150' } });
      expect(zoomSlider.value).toBe('150');
    });

    it('displays zoom value with percentage symbol', () => {
      // The component should display the value with % (e.g., "165%")
      const zoomText = screen.getByText('165%');
      expect(zoomText).toBeInTheDocument();
    });
  });

  describe('System Tab', () => {
    beforeEach(() => {
      render(<SettingsPanelWithProvider />);
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });
      const systemTab = screen.getByRole('tab', { name: /system/i });
      fireEvent.click(systemTab);
    });

    it('renders force flag select with all flag options', () => {
      const forceFlagSelect = screen.getByLabelText(/force flag/i) as HTMLSelectElement;
      expect(forceFlagSelect).toBeInTheDocument();

      const options = Array.from(forceFlagSelect.options);
      // Should have: None, yellow, red, blue, white, black, chequered, orange
      expect(options.length).toBeGreaterThanOrEqual(7);
    });

    it('force flag select defaults to empty string (None)', () => {
      const forceFlagSelect = screen.getByLabelText(/force flag/i) as HTMLSelectElement;
      expect(forceFlagSelect.value).toBe('');
    });

    it('changes force flag when select is changed', () => {
      const forceFlagSelect = screen.getByLabelText(/force flag/i) as HTMLSelectElement;
      fireEvent.change(forceFlagSelect, { target: { value: 'yellow' } });
      expect(forceFlagSelect.value).toBe('yellow');
    });

    it('renders green screen toggle', () => {
      const greenScreenToggle = screen.getByLabelText(/toggle green screen/i);
      expect(greenScreenToggle).toBeInTheDocument();
      expect(greenScreenToggle).toHaveAttribute('aria-checked', 'false'); // Default is false
    });

    it('toggles green screen', () => {
      const greenScreenToggle = screen.getByLabelText(/toggle green screen/i);
      expect(greenScreenToggle).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(greenScreenToggle);
      expect(greenScreenToggle).toHaveAttribute('aria-checked', 'true');
    });

    it('renders SimHub URL input', () => {
      const simhubUrlInput = screen.getByLabelText(/simhub url/i) as HTMLInputElement;
      expect(simhubUrlInput).toBeInTheDocument();
      expect(simhubUrlInput.type).toBe('text');
      expect(simhubUrlInput.value).toBe('http://localhost:8889/k10mediabroadcaster/');
    });

    it('changes SimHub URL when input is modified', async () => {
      const simhubUrlInput = screen.getByLabelText(/simhub url/i) as HTMLInputElement;
      const newUrl = 'http://example.com:9000/overlay/';

      fireEvent.change(simhubUrlInput, { target: { value: newUrl } });
      expect(simhubUrlInput.value).toBe(newUrl);
    });

    it('SimHub URL input has placeholder', () => {
      const simhubUrlInput = screen.getByLabelText(/simhub url/i) as HTMLInputElement;
      expect(simhubUrlInput).toHaveAttribute('placeholder', 'http://localhost:8889/k10mediabroadcaster/');
    });

    it('renders force flag select with flag options: yellow, red, blue, white, black, chequered, orange', () => {
      const forceFlagSelect = screen.getByLabelText(/force flag/i) as HTMLSelectElement;
      const options = Array.from(forceFlagSelect.options);

      const values = options.map((opt) => opt.value);
      expect(values).toContain('yellow');
      expect(values).toContain('red');
      expect(values).toContain('blue');
      expect(values).toContain('white');
      expect(values).toContain('black');
      expect(values).toContain('chequered');
      expect(values).toContain('orange');
    });
  });

  describe('Keyboard Shortcut', () => {
    it('keyboard shortcut only works with Ctrl+Shift+S (not just S)', () => {
      render(<SettingsPanelWithProvider />);
      const overlay = screen.getByRole('dialog', { hidden: true });

      // Just pressing S should not open
      fireEvent.keyDown(window, { key: 'S' });
      expect(overlay.className).not.toMatch(/overlayOpen/);

      // Ctrl+S should not open
      fireEvent.keyDown(window, { ctrlKey: true, key: 'S' });
      expect(overlay.className).not.toMatch(/overlayOpen/);

      // Shift+S should not open
      fireEvent.keyDown(window, { shiftKey: true, key: 'S' });
      expect(overlay.className).not.toMatch(/overlayOpen/);

      // Only Ctrl+Shift+S should work
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });
      expect(overlay.className).toMatch(/overlayOpen/);
    });
  });

  describe('Panel Structure', () => {
    it('renders title and subtitle', () => {
      render(<SettingsPanelWithProvider />);
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('K10 Media Broadcaster')).toBeInTheDocument();
    });

    it('renders hotkey hint at the bottom', () => {
      render(<SettingsPanelWithProvider />);
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });

      const hint = screen.getByText(/press/i);
      expect(hint).toBeInTheDocument();
      expect(hint).toHaveTextContent('Ctrl');
      expect(hint).toHaveTextContent('Shift');
      expect(hint).toHaveTextContent('S');
      expect(hint).toHaveTextContent('toggle settings');
    });

    it('dialog has aria-label attribute', () => {
      render(<SettingsPanelWithProvider />);
      const overlay = screen.getByRole('dialog', { hidden: true });
      expect(overlay).toHaveAttribute('aria-label', 'Settings Panel');
    });

    it('dialog has aria-hidden when closed', () => {
      render(<SettingsPanelWithProvider />);
      const overlay = screen.getByRole('dialog', { hidden: true });
      expect(overlay).toHaveAttribute('aria-hidden', 'true');
    });

    it('dialog aria-hidden is false when open', () => {
      render(<SettingsPanelWithProvider />);
      const overlay = screen.getByRole('dialog', { hidden: true });

      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });
      expect(overlay).toHaveAttribute('aria-hidden', 'false');
    });
  });

  describe('Integration Tests', () => {
    it('settings persist across tab switches', () => {
      render(<SettingsPanelWithProvider />);
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });

      // Disable Fuel in Sections tab
      const fuelToggle = screen.getByLabelText(/toggle fuel/i);
      fireEvent.click(fuelToggle);
      expect(fuelToggle).toHaveAttribute('aria-checked', 'false');

      // Switch to Layout tab
      const layoutTab = screen.getByRole('tab', { name: /layout/i });
      fireEvent.click(layoutTab);

      // Switch back to Sections tab
      const sectionsTab = screen.getByRole('tab', { name: /sections/i });
      fireEvent.click(sectionsTab);

      // Fuel should still be disabled
      expect(fuelToggle).toHaveAttribute('aria-checked', 'false');
    });

    it('can make multiple changes and toggle between tabs', async () => {
      render(<SettingsPanelWithProvider />);
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'S' });

      // Change setting in Sections
      const fuelToggle = screen.getByLabelText(/toggle fuel/i);
      fireEvent.click(fuelToggle);

      // Switch to Layout and change setting
      const layoutTab = screen.getByRole('tab', { name: /layout/i });
      fireEvent.click(layoutTab);
      const zoomSlider = screen.getByLabelText(/zoom level/i) as HTMLInputElement;
      fireEvent.change(zoomSlider, { target: { value: '180' } });

      // Switch to System and change setting
      const systemTab = screen.getByRole('tab', { name: /system/i });
      fireEvent.click(systemTab);
      const greenScreenToggle = screen.getByLabelText(/toggle green screen/i);
      fireEvent.click(greenScreenToggle);

      // Go back to each tab and verify changes persisted
      fireEvent.click(layoutTab);
      expect((screen.getByLabelText(/zoom level/i) as HTMLInputElement).value).toBe('180');

      fireEvent.click(systemTab);
      expect(greenScreenToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(screen.getByRole('tab', { name: /sections/i }));
      expect(fuelToggle).toHaveAttribute('aria-checked', 'false');
    });
  });
});

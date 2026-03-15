import { useState, useEffect } from 'react';
import { useSettings } from '@hooks/useSettings';
import type { LayoutPosition, SecondaryLayout } from '../../types/settings';
import styles from './SettingsPanel.module.css';

type TabType = 'sections' | 'layout' | 'system';

/**
 * SettingsPanel: Overlay settings UI
 * Opens/closes with Ctrl+Shift+S keyboard shortcut
 */
export function SettingsPanel() {
  const { settings, updateSetting } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('sections');

  // Keyboard shortcut: Ctrl+Shift+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => setIsOpen(false);

  const handleToggle = (key: keyof typeof settings) => {
    if (typeof settings[key] === 'boolean') {
      updateSetting(key as any, !settings[key]);
    }
  };

  const handleSelectChange = (key: keyof typeof settings, value: any) => {
    updateSetting(key as any, value);
  };

  const handleRangeChange = (key: keyof typeof settings, value: number) => {
    updateSetting(key as any, value);
  };

  const handleTextInputChange = (key: keyof typeof settings, value: string) => {
    updateSetting(key as any, value);
  };

  // Layout position options
  const layoutPositions: LayoutPosition[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'];

  // Flag options for forcing
  const flagOptions = ['', 'yellow', 'red', 'blue', 'white', 'black', 'chequered', 'orange'];

  // Secondary layout options
  const secLayoutOptions: SecondaryLayout[] = ['stack', 'compact', 'minimal'];

  // Check if current position is center (for conditional flow direction)
  const isCenterPosition = settings.layoutPosition === 'top-center' || settings.layoutPosition === 'bottom-center';

  return (
    <div
      className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
      role="dialog"
      aria-label="Settings Panel"
      aria-hidden={!isOpen}
    >
      <div className={styles.panel}>
        <div className={styles.title}>Settings</div>
        <div className={styles.subtitle}>K10 Media Broadcaster</div>

        {/* Tabs */}
        <div className={styles.tabs} role="tablist">
          <button
            className={`${styles.tab} ${activeTab === 'sections' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('sections')}
            role="tab"
            aria-selected={activeTab === 'sections'}
            aria-controls="sections-panel"
          >
            Sections
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'layout' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('layout')}
            role="tab"
            aria-selected={activeTab === 'layout'}
            aria-controls="layout-panel"
          >
            Layout
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'system' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('system')}
            role="tab"
            aria-selected={activeTab === 'system'}
            aria-controls="system-panel"
          >
            System
          </button>
        </div>

        {/* Sections Tab */}
        <div
          id="sections-panel"
          className={`${styles.tabContent} ${activeTab === 'sections' ? styles.tabContentActive : ''}`}
          role="tabpanel"
        >
          <div className={styles.groupLabel}>Display</div>
          {[
            { key: 'showFuel' as const, label: 'Fuel' },
            { key: 'showTyres' as const, label: 'Tyres' },
            { key: 'showControls' as const, label: 'Controls' },
            { key: 'showPedals' as const, label: 'Pedals' },
            { key: 'showMaps' as const, label: 'Track Maps' },
            { key: 'showPosition' as const, label: 'Position' },
            { key: 'showTacho' as const, label: 'Tachometer' },
            { key: 'showCommentary' as const, label: 'Commentary' },
            { key: 'showLeaderboard' as const, label: 'Leaderboard' },
            { key: 'showDatastream' as const, label: 'Datastream' },
            { key: 'showIncidents' as const, label: 'Incidents' },
            { key: 'showWebGL' as const, label: 'WebGL' },
            { key: 'showK10Logo' as const, label: 'K10 Logo' },
            { key: 'showCarLogo' as const, label: 'Car Logo' },
          ].map(({ key, label }) => (
            <div key={key} className={styles.row}>
              <span className={styles.label}>{label}</span>
              <button
                className={`${styles.toggle} ${settings[key] ? styles.toggleOn : ''}`}
                onClick={() => handleToggle(key)}
                role="switch"
                aria-checked={settings[key] as boolean}
                aria-label={`Toggle ${label}`}
              />
            </div>
          ))}
        </div>

        {/* Layout Tab */}
        <div
          id="layout-panel"
          className={`${styles.tabContent} ${activeTab === 'layout' ? styles.tabContentActive : ''}`}
          role="tabpanel"
        >
          <div className={styles.groupLabel}>Position</div>
          <div className={styles.row}>
            <span className={styles.label}>Dashboard Position</span>
            <select
              className={styles.select}
              value={settings.layoutPosition}
              onChange={(e) => handleSelectChange('layoutPosition', e.target.value)}
              aria-label="Dashboard Position"
            >
              {layoutPositions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          {isCenterPosition && (
            <>
              <div className={styles.groupLabel}>Flow Direction</div>
              <div className={styles.row}>
                <span className={styles.label}>Text Flow</span>
                <select
                  className={styles.select}
                  value={settings.layoutFlow}
                  onChange={(e) => handleSelectChange('layoutFlow', e.target.value)}
                  aria-label="Text Flow Direction"
                >
                  <option value="ltr">Left to Right</option>
                  <option value="rtl">Right to Left</option>
                </select>
              </div>
            </>
          )}

          <div className={styles.groupLabel}>Appearance</div>
          <div className={styles.row}>
            <span className={styles.label}>Vertical Swap</span>
            <button
              className={`${styles.toggle} ${settings.verticalSwap ? styles.toggleOn : ''}`}
              onClick={() => handleToggle('verticalSwap')}
              role="switch"
              aria-checked={settings.verticalSwap}
              aria-label="Toggle Vertical Swap"
            />
          </div>

          <div className={styles.groupLabel}>Secondary Layout</div>
          <div className={styles.row}>
            <span className={styles.label}>Mode</span>
            <select
              className={styles.select}
              value={settings.secLayout}
              onChange={(e) => handleSelectChange('secLayout', e.target.value)}
              aria-label="Secondary Layout Mode"
            >
              {secLayoutOptions.map((layout) => (
                <option key={layout} value={layout}>
                  {layout.charAt(0).toUpperCase() + layout.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.groupLabel}>Offset</div>
          <div className={styles.row}>
            <span className={styles.label}>Offset X</span>
            <div className={styles.rangeRow}>
              <input
                type="range"
                className={styles.range}
                min="-200"
                max="200"
                value={settings.secOffsetX}
                onChange={(e) => handleRangeChange('secOffsetX', parseInt(e.target.value, 10))}
                aria-label="Offset X"
              />
              <span className={styles.rangeVal}>{settings.secOffsetX}</span>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Offset Y</span>
            <div className={styles.rangeRow}>
              <input
                type="range"
                className={styles.range}
                min="-200"
                max="200"
                value={settings.secOffsetY}
                onChange={(e) => handleRangeChange('secOffsetY', parseInt(e.target.value, 10))}
                aria-label="Offset Y"
              />
              <span className={styles.rangeVal}>{settings.secOffsetY}</span>
            </div>
          </div>

          <div className={styles.groupLabel}>Zoom</div>
          <div className={styles.row}>
            <span className={styles.label}>Zoom Level</span>
            <div className={styles.rangeRow}>
              <input
                type="range"
                className={styles.range}
                min="100"
                max="200"
                value={settings.zoom}
                onChange={(e) => handleRangeChange('zoom', parseInt(e.target.value, 10))}
                aria-label="Zoom Level"
              />
              <span className={styles.rangeVal}>{settings.zoom}%</span>
            </div>
          </div>
        </div>

        {/* System Tab */}
        <div
          id="system-panel"
          className={`${styles.tabContent} ${activeTab === 'system' ? styles.tabContentActive : ''}`}
          role="tabpanel"
        >
          <div className={styles.groupLabel}>Testing</div>
          <div className={styles.row}>
            <span className={styles.label}>Force Flag</span>
            <select
              className={styles.select}
              value={settings.forceFlag}
              onChange={(e) => handleSelectChange('forceFlag', e.target.value)}
              aria-label="Force Flag"
            >
              {flagOptions.map((flag) => (
                <option key={flag} value={flag}>
                  {flag || 'None'}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.groupLabel}>Effects</div>
          <div className={styles.row}>
            <span className={styles.label}>Green Screen</span>
            <button
              className={`${styles.toggle} ${settings.greenScreen ? styles.toggleOn : ''}`}
              onClick={() => handleToggle('greenScreen')}
              role="switch"
              aria-checked={settings.greenScreen}
              aria-label="Toggle Green Screen"
            />
          </div>

          <div className={styles.groupLabel}>Connection</div>
          <div className={styles.row} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
            <span className={styles.label}>SimHub URL</span>
            <input
              type="text"
              className={styles.input}
              value={settings.simhubUrl}
              onChange={(e) => handleTextInputChange('simhubUrl', e.target.value)}
              placeholder="http://localhost:8889/k10mediabroadcaster/"
              aria-label="SimHub URL"
            />
          </div>
        </div>

        <button className={styles.closeBtn} onClick={handleClose} aria-label="Close Settings">
          Close Settings
        </button>

        <div className={styles.hotkeys}>
          Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> to toggle settings
        </div>
      </div>
    </div>
  );
}

/**
 * Test helpers for K10 Media Broadcast dashboard tests.
 *
 * Provides mock telemetry data and a page-setup utility that loads
 * dashboard.html with fetch() intercepted so no real HTTP server is needed.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DASHBOARD_PATH = `file://${path.resolve(__dirname, '..', 'dashboard.html')}`;

/** Realistic mid-race telemetry snapshot */
export const MOCK_TELEMETRY = {
  'DataCorePlugin.GameRunning': 1,
  'K10MediaCoach.Plugin.DemoMode': 0,
  'DataCorePlugin.GameData.Gear': '4',
  'DataCorePlugin.GameData.Rpms': 6842,
  'DataCorePlugin.GameData.CarSettings_MaxRPM': 8500,
  'DataCorePlugin.GameData.SpeedMph': 127,
  'DataCorePlugin.GameData.Throttle': 0.82,
  'DataCorePlugin.GameData.Brake': 0.0,
  'DataCorePlugin.GameData.Clutch': 0.0,
  'DataCorePlugin.GameData.Fuel': 28.4,
  'DataCorePlugin.GameData.MaxFuel': 60.0,
  'DataCorePlugin.Computed.Fuel_LitersPerLap': 3.12,
  'DataCorePlugin.GameData.RemainingLaps': 14,
  'DataCorePlugin.GameData.TyreTempFrontLeft': 196,
  'DataCorePlugin.GameData.TyreTempFrontRight': 203,
  'DataCorePlugin.GameData.TyreTempRearLeft': 188,
  'DataCorePlugin.GameData.TyreTempRearRight': 191,
  'DataCorePlugin.GameData.TyreWearFrontLeft': 0.91,
  'DataCorePlugin.GameData.TyreWearFrontRight': 0.88,
  'DataCorePlugin.GameData.TyreWearRearLeft': 0.94,
  'DataCorePlugin.GameData.TyreWearRearRight': 0.93,
  'DataCorePlugin.GameRawData.Telemetry.dcBrakeBias': 56.2,
  'DataCorePlugin.GameRawData.Telemetry.dcTractionControl': 4,
  'DataCorePlugin.GameRawData.Telemetry.dcABS': 3,
  'DataCorePlugin.GameData.Position': 5,
  'DataCorePlugin.GameData.CurrentLap': 8,
  'DataCorePlugin.GameData.BestLapTime': 92.347,
  'DataCorePlugin.GameData.CarModel': 'Porsche 911 GT3 R',
  'IRacingExtraProperties.iRacing_DriverInfo_IRating': 2847,
  'IRacingExtraProperties.iRacing_DriverInfo_SafetyRating': 3.41,
  'IRacingExtraProperties.iRacing_Opponent_Ahead_Gap': 1.3,
  'IRacingExtraProperties.iRacing_Opponent_Behind_Gap': 2.1,
  'IRacingExtraProperties.iRacing_Opponent_Ahead_Name': 'M. Broadbent',
  'IRacingExtraProperties.iRacing_Opponent_Behind_Name': 'S. Leclerc',
  'IRacingExtraProperties.iRacing_Opponent_Ahead_IRating': 3210,
  'IRacingExtraProperties.iRacing_Opponent_Behind_IRating': 2530,
  'K10MediaCoach.Plugin.CommentaryVisible': 0,
  'K10MediaCoach.Plugin.CommentaryText': '',
  'K10MediaCoach.Plugin.CommentaryTopicTitle': '',
  'K10MediaCoach.Plugin.CommentaryCategory': '',
  'K10MediaCoach.Plugin.CommentarySentimentColor': '',
  'K10MediaCoach.Plugin.CommentarySeverity': 0,
  'K10MediaCoach.Plugin.TrackMap.Ready': 0,
};

/** Demo mode telemetry — uses Demo.* keys instead */
export const MOCK_DEMO = {
  ...MOCK_TELEMETRY,
  'K10MediaCoach.Plugin.DemoMode': 1,
  'K10MediaCoach.Plugin.Demo.Gear': '3',
  'K10MediaCoach.Plugin.Demo.Rpm': 5400,
  'K10MediaCoach.Plugin.Demo.MaxRpm': 7500,
  'K10MediaCoach.Plugin.Demo.SpeedMph': 98,
  'K10MediaCoach.Plugin.Demo.Throttle': 0.65,
  'K10MediaCoach.Plugin.Demo.Brake': 0.12,
  'K10MediaCoach.Plugin.Demo.Clutch': 0.0,
  'K10MediaCoach.Plugin.Demo.Fuel': 18.0,
  'K10MediaCoach.Plugin.Demo.MaxFuel': 60.0,
  'K10MediaCoach.Plugin.Demo.FuelPerLap': 3.5,
  'K10MediaCoach.Plugin.Demo.RemainingLaps': 10,
  'K10MediaCoach.Plugin.Demo.TyreTempFL': 210,
  'K10MediaCoach.Plugin.Demo.TyreTempFR': 215,
  'K10MediaCoach.Plugin.Demo.TyreTempRL': 195,
  'K10MediaCoach.Plugin.Demo.TyreTempRR': 198,
  'K10MediaCoach.Plugin.Demo.TyreWearFL': 0.80,
  'K10MediaCoach.Plugin.Demo.TyreWearFR': 0.75,
  'K10MediaCoach.Plugin.Demo.TyreWearRL': 0.85,
  'K10MediaCoach.Plugin.Demo.TyreWearRR': 0.83,
  'K10MediaCoach.Plugin.Demo.BrakeBias': 54.0,
  'K10MediaCoach.Plugin.Demo.TC': 6,
  'K10MediaCoach.Plugin.Demo.ABS': 2,
  'K10MediaCoach.Plugin.Demo.Position': 3,
  'K10MediaCoach.Plugin.Demo.CurrentLap': 12,
  'K10MediaCoach.Plugin.Demo.BestLapTime': 88.921,
  'K10MediaCoach.Plugin.Demo.CarModel': 'BMW M4 GT3',
  'K10MediaCoach.Plugin.Demo.IRating': 3150,
  'K10MediaCoach.Plugin.Demo.SafetyRating': 3.88,
  'K10MediaCoach.Plugin.Demo.GapAhead': 0.8,
  'K10MediaCoach.Plugin.Demo.GapBehind': 3.5,
  'K10MediaCoach.Plugin.Demo.DriverAhead': 'J. Smith',
  'K10MediaCoach.Plugin.Demo.DriverBehind': 'A. Johnson',
  'K10MediaCoach.Plugin.Demo.IRAhead': 3500,
  'K10MediaCoach.Plugin.Demo.IRBehind': 2100,
};

/**
 * Load the dashboard in a Playwright page with mock fetch.
 * The mock data is served for every fetch() call so the polling loop
 * populates the dashboard without a real HTTP server.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [data] - Override mock telemetry data (merged with MOCK_TELEMETRY)
 * @returns {Promise<void>}
 */
export async function loadDashboard(page, data) {
  const mockData = data ? { ...MOCK_TELEMETRY, ...data } : MOCK_TELEMETRY;

  // Intercept all fetch requests to the plugin server and serve mock data
  await page.route(/k10mediacoach/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockData),
    });
  });

  await page.goto(DASHBOARD_PATH, { waitUntil: 'load' });

  // Wait for at least 2 poll cycles to populate data
  await page.waitForTimeout(200);
}

/**
 * Update mock data mid-test by re-routing fetch.
 */
export async function updateMockData(page, data) {
  await page.unroute(/k10mediacoach/);
  await page.route(/k10mediacoach/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...MOCK_TELEMETRY, ...data }),
    });
  });
  // Wait for a poll cycle
  await page.waitForTimeout(100);
}

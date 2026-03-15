import { SettingsProvider, useSettings } from '@hooks/useSettings'
import { TelemetryProvider } from '@hooks/useTelemetry'
import Dashboard from '@components/layout/Dashboard'

function AppContent() {
  const { settings } = useSettings()
  return (
    <TelemetryProvider settings={settings}>
      <Dashboard />
    </TelemetryProvider>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}

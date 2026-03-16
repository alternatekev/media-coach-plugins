import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// Error boundary for catching render errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[K10] React Error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', top: 20, left: 20, right: 20,
          background: 'rgba(200,0,0,0.9)', color: '#fff',
          padding: 20, borderRadius: 8, fontFamily: 'monospace',
          fontSize: 13, zIndex: 99999, whiteSpace: 'pre-wrap'
        }}>
          <strong>K10 Media Broadcaster — Render Error</strong>
          {'\n\n'}
          {this.state.error.message}
          {'\n\n'}
          {this.state.error.stack}
        </div>
      )
    }
    return this.props.children
  }
}

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element not found')
}

// Add a visible loading indicator so we know the JS is executing
root.innerHTML = '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:rgba(255,255,255,0.3);font:14px system-ui">K10 loading...</div>'

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

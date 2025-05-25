import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PerformanceMonitor } from '@/lib/performance'
import { initializeSecurity } from '@/lib/security'

// Initialize performance monitoring
const monitor = PerformanceMonitor.getInstance()
monitor.mark('app-start')

// Initialize security measures
initializeSecurity()

// Error boundary for the entire app
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application Error:', error, errorInfo)
    
    // Log performance metrics if available
    const metrics = monitor.getMetrics()
    console.error('Performance metrics at time of error:', metrics)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              申し訳ございません。エラーが発生しました。
            </h1>
            <p className="text-muted-foreground mb-4">
              ページを再読み込みしてお試しください。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)

// Mark app initialization complete
monitor.mark('app-initialized')
monitor.measure('app-initialization', 'app-start', 'app-initialized')
import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initApiInterceptor } from './config/api'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('CivicResolve UI Error Boundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans text-slate-800">
          <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
            <h1 className="text-lg font-bold text-[#1a3c6e]">CivicResolve Portal Notice</h1>
            <p className="text-sm text-slate-600">
              A temporary display issue occurred while rendering this view. Please reload the page to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#1a3c6e] hover:bg-[#15305a] transition-colors"
            >
              Reload Portal
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Initialize API interceptor for Render production backend connectivity
initApiInterceptor();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

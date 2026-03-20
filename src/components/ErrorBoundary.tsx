import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-4">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
            <span className="text-3xl">💸</span>
          </div>
          <h1 className="text-white text-xl font-semibold mb-2 text-center">Something went wrong</h1>
          <p className="text-slate-400 text-sm mb-8 text-center max-w-sm">
            Splito encountered an unexpected error. Don't worry, your data is safe.
          </p>
          <button
            onClick={() => {
              // Reset error state and reload the app
              this.setState({ hasError: false, error: null })
              window.location.href = '/'
            }}
            className="bg-white hover:bg-slate-200 text-slate-900 px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Refresh Splito
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

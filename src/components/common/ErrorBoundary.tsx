import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Workly ErrorBoundary] Caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F7F4] flex items-center justify-center p-6 text-[#202C39]">
          <div className="max-w-md w-full bg-white border border-[#DCE1E5] rounded-2xl p-7 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-[#D5A34B]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#202C39] tracking-tight">Something unexpected happened</h2>
              <p className="text-xs text-[#8293A5] mt-1.5 leading-relaxed">
                Workly encountered an unexpected issue while rendering this view. Your local data remains safe.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-[#F7F7F4] rounded-xl text-left border border-[#DCE1E5] text-[11px] font-mono text-[#202C39] overflow-auto max-h-28">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 bg-[#202C39] hover:bg-[#151E28] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D5A34B]" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

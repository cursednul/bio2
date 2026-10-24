import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by cursed ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0b0816] text-zinc-100 flex items-center justify-center p-4 select-none">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-zinc-900/90 border border-purple-500/30 backdrop-blur-2xl shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-950/80 border border-purple-400/40 flex items-center justify-center text-purple-300 text-2xl font-mono">
              ✦
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 font-['Outfit',sans-serif]">
              Something unexpected happened
            </h2>
            
            <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
              The application encountered a runtime issue. You can reload or reset stored data to restore normal operation.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 rounded-xl bg-black/40 border border-white/10 text-left overflow-auto max-h-24">
                <p className="text-[11px] font-mono text-rose-300 break-words">
                  {this.state.error.message || 'Unknown runtime error'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-medium text-xs transition-all cursor-pointer shadow-lg shadow-purple-600/25"
              >
                Reload App
              </button>
              
              <button
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 active:bg-white/15 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
              >
                Reset Stored Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

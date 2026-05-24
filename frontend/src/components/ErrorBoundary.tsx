'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0c10]">
          <div className="glass-panel p-10 rounded-[2.5rem] max-w-lg text-center space-y-6">
            <div className="w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="text-rose-500 w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Something went wrong</h2>
              <p className="text-gray-400 mt-2">The application encountered an unexpected error.</p>
            </div>
            {this.state.error && (
              <div className="bg-black/40 p-4 rounded-2xl text-left border border-white/5">
                <p className="text-rose-400 font-mono text-xs break-all">{this.state.error.message}</p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="glass-button w-full h-14 flex items-center justify-center gap-3"
            >
              <RotateCcw size={20} />
              <span className="font-bold">Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

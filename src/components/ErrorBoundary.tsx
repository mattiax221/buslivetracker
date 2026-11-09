"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="w-full h-dvh flex items-center justify-center p-6"
        style={{ background: "var(--app-bg)", color: "var(--app-fg)" }}
      >
        <div className="flex flex-col items-center gap-5 max-w-xs text-center">
          {/* App icon */}
          <div className="w-16 h-16 rounded-[1.15rem] overflow-hidden shadow-lg shadow-blue-500/30 bg-[#0B5FFF]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192.png"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Error message */}
          <div>
            <p className="font-black tracking-tight text-lg">
              Qualcosa è andato storto
            </p>
            <p
              className="text-sm mt-1.5 leading-relaxed"
              style={{ color: "var(--sheet-muted)" }}
            >
              Ricarica la pagina per riprovare.
            </p>
          </div>

          {/* Retry button */}
          <button
            onClick={this.handleReload}
            className="mt-1 px-6 py-2.5 rounded-2xl text-sm font-semibold text-white
                       bg-[var(--gtt-blue)] active:scale-95 transition-transform"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }
}

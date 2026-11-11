import { Component, type ErrorInfo, type ReactNode } from "react";

/** If a screen crashes while rendering, show a message and a way out instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Screen crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="notice notice-error" role="alert">
        <span>Something went wrong while showing this page.</span>
        <button type="button" onClick={() => this.setState({ failed: false })}>
          Try again
        </button>
        <button type="button" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}

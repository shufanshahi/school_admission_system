import { Component, type ErrorInfo, type ReactNode } from "react";
import { Crest } from "./brand/Crest";

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
      <div className="crash container" role="alert">
        <Crest size={44} />
        <p className="crash-title">Something went wrong while showing this page.</p>
        <div className="crash-actions">
          <button type="button" className="btn btn-primary" onClick={() => this.setState({ failed: false })}>
            Try again
          </button>
          <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

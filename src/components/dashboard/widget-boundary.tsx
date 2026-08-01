import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Every dashboard widget fails independently (Section 2, States).
 * An analytics fetch failure must never take down the countdown or the timer.
 */
export class WidgetBoundary extends Component<
  { children: ReactNode; label: string; className?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[widget:${this.props.label}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className={cn("min-w-0", this.props.className)} aria-label={this.props.label}>
          <div className="surface flex h-full min-h-32 flex-col items-start justify-center gap-2 p-5">
            <AlertTriangle className="size-4 text-warning" strokeWidth={1.5} aria-hidden />
            <p className="text-caption text-muted-foreground">
              {this.props.label} couldn't load. The rest of your dashboard is unaffected.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="text-caption font-medium text-primary underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </div>
        </section>
      );
    }
    // The className carries the dashboard grid column span — it must always be
    // applied, otherwise widgets collapse into single 1/12 columns.
    return <div className={cn("min-w-0", this.props.className)}>{this.props.children}</div>;
  }
}


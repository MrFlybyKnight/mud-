import React from 'react';

interface State { hasError: boolean; error: Error | null }

export class SubscriptionErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SubscriptionSection] render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2 px-1">
            Subscription
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-4">
            <p className="text-sm text-slate-200">Subscription details are unavailable right now.</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {this.state.error?.message ?? 'Please try again in a moment.'}
            </p>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

export default SubscriptionErrorBoundary;

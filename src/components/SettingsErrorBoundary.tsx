import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SettingsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SettingsScreen] render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col gap-3 min-h-0 animate-fade-in">
          <header className="flex items-center justify-between shrink-0">
            <h1 className="text-base font-semibold text-slate-50">Settings</h1>
          </header>

          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4">
            <h2 className="text-sm font-medium text-red-200">Settings failed to load.</h2>
            <p className="mt-1 text-[11px] text-red-100/80">
              {this.state.error?.message ?? 'An unexpected render error occurred.'}
            </p>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SettingsErrorBoundary;
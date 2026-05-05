import { useState } from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { format } from 'date-fns';

export const DebugPanel = () => {
  const { uid, lastSyncTime, lastWriteStatus, lastWriteAt, queuedMetricsCount, syncStatus } = useMonitoring();
  const [open, setOpen] = useState(true);

  const statusColor =
    lastWriteStatus === 'success'
      ? 'bg-green-500'
      : lastWriteStatus === 'failed'
      ? 'bg-red-500'
      : lastWriteStatus === 'queued'
      ? 'bg-yellow-500'
      : 'bg-muted-foreground';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-50 rounded-full bg-background/90 border border-border px-3 py-1 text-xs shadow-md backdrop-blur"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-50 w-64 rounded-lg border border-border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">Debug</span>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close debug panel"
        >
          ×
        </button>
      </div>
      <div className="space-y-1 font-mono">
        <div>
          <span className="text-muted-foreground">uid: </span>
          <span className={uid ? 'text-foreground' : 'text-red-500'}>
            {uid ? `${uid.slice(0, 10)}…` : 'no uid'}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">last sync: </span>
          {lastSyncTime ? format(lastSyncTime, 'HH:mm:ss') : '—'}
          <span className="ml-1 text-muted-foreground">({syncStatus})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-muted-foreground">write: </span>
          <span>{lastWriteStatus}</span>
          {lastWriteAt && <span className="text-muted-foreground">{format(lastWriteAt, 'HH:mm:ss')}</span>}
        </div>
        <div>
          <span className="text-muted-foreground">queued: </span>
          {queuedMetricsCount}
        </div>
      </div>
    </div>
  );
};

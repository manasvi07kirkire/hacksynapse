"use client";

import { AlertTriangle, Terminal } from "lucide-react";
import { Alert } from "./Badge";
import { Button } from "./Button";

export interface WorkerStatus {
  activeWorkers: number;
  queuedJobs: number;
  runningJobs: number;
  oldestQueuedSeconds: number;
}

export function WorkerStatusBanner({
  worker,
  onRefresh,
}: {
  worker: WorkerStatus | null;
  onRefresh?: () => void;
}) {
  if (!worker) return null;

  const backlog =
    worker.queuedJobs > 0 ||
    worker.runningJobs > 0 ||
    worker.oldestQueuedSeconds > 0;
  const offline = worker.activeWorkers === 0 && backlog;

  if (!offline) return null;

  return (
    <Alert variant="warning" className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Analysis worker is offline</p>
            <p className="text-sm leading-relaxed opacity-90">
              {worker.queuedJobs > 0
                ? `${worker.queuedJobs} job(s) queued`
                : "Jobs may be waiting"}
              {worker.oldestQueuedSeconds > 0 &&
                ` · oldest wait ${worker.oldestQueuedSeconds}s`}
              . Start the worker in a second terminal:{" "}
              <code className="rounded-sm bg-paper-100 px-1.5 py-0.5 font-mono text-xs text-espresso-700">
                npm run worker
              </code>
            </p>
          </div>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="shrink-0">
            <Terminal className="h-3.5 w-3.5" />
            Refresh status
          </Button>
        )}
      </div>
    </Alert>
  );
}

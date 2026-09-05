export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}
export function fail(status: number, code: string, message: string): never {
  throw new AppError(status, code, message);
}
export function errorCode(error: unknown): string {
  return error instanceof AppError ? error.code : "INTERNAL_ERROR";
}
// Log only this allow-listed record, never provider/request objects or Error.message.
export function logEvent(event: {
  event: string;
  requestId?: string;
  jobId?: string;
  projectId?: string;
  code?: string;
  durationMs?: number;
  attempt?: number;
  outcome?: string;
}) {
  console.info(JSON.stringify({ time: new Date().toISOString(), ...event }));
}

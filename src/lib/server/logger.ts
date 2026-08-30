export type LogLevel = 'info' | 'warn' | 'error';
export type ErrorCategory = 
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMITED'
  // A target tried to send more than the outbound size cap. Worth separating so
  // operators can alert on possible resource-exhaustion attempts.
  | 'RESPONSE_TOO_LARGE'
  | 'VALIDATION_ERROR'
  | 'SYSTEM_ERROR'
  | 'SECURITY_EVENT';

export interface LogContext {
  provider?: string;
  latencyMs?: number;
  status?: number;
  timeout?: boolean;
  retryCount?: number;
  errorCategory?: ErrorCategory;
  [key: string]: unknown;
}

/**
 * Strips potentially sensitive inputs or targets from the context.
 */
function sanitizeContext(context?: LogContext): Record<string, unknown> {
  if (!context) return {};
  const safe: Record<string, unknown> = { ...context };
  
  // Explicitly remove sensitive fields that might be accidentally passed
  delete safe.ip;
  delete safe.url;
  delete safe.hostname;
  delete safe.target;
  delete safe.token;
  delete safe.password;
  delete safe.secret;

  return safe;
}

function writeLog(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeContext(context),
  };

  if (error instanceof Error) {
    payload.errorName = error.name;
    payload.errorMessage = error.message;
    // We explicitly omit the stack trace by default to avoid leaking paths
    // or internal system structures to external log aggregators.
  } else if (error !== undefined) {
    payload.errorString = String(error);
  }

  // Use process.stdout for info/warn, process.stderr for errors
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(JSON.stringify(payload) + '\n');
}

export const logger = {
  info: (message: string, context?: LogContext) => writeLog('info', message, context),
  warn: (message: string, context?: LogContext, error?: unknown) => writeLog('warn', message, context, error),
  error: (message: string, context?: LogContext, error?: unknown) => writeLog('error', message, context, error),
};

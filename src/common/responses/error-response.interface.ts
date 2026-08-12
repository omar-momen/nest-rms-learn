export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  /** Structured validation / business-rule details when present (e.g. cart issues). */
  issues?: unknown;
}

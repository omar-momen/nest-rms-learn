export interface DataResponseBody<T = unknown> {
  statusCode: number;
  data: T;
  path: string;
  timestamp: string;
}

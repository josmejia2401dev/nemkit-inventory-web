export interface PageResult<T> {
  success: boolean;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total?: number;
    totalPages?: number;
  };
  metadata?: {
    pagination?: PageResult<T>["pagination"];
    summary?: unknown;
    [key: string]: unknown;
  };
}

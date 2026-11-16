export interface PageResult<T> {
  success: boolean;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total?: number;
    totalPages?: number;
  };
}

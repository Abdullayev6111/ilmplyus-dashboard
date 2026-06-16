import type { BaseEntity, PaginatedResponse } from './common.types';

export interface Expense extends BaseEntity {
  amount: number;
  description: string;
  category_id?: number;
}

export interface SaveExpensePayload {
  amount: number;
  description: string;
  category_id?: number;
}

export type ExpenseListResponse = PaginatedResponse<Expense[]>;

import type { Branch, ApiResponse } from './common.types';
import type { Group } from './groups.types';
import type { Course } from './course.types';

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface Employee {
  full_name: string;
  role?: string;
}

export interface Payment {
  id: number;
  amount: string | number;
  payment_method: string;
  payment_period: string;
  created_at: string;
  updated_at: string;
  student_id: number;
  group_id: number;
  course_id: number;
  branch_id: number;
  user_id: number;
  branch?: Branch;
  cashier?: Employee;
  student?: Student;
  group?: Group;
  course?: Course;
  teacher?: Employee;
}

export type PaymentsResponse = ApiResponse<Payment[]>;

export interface PaymentPayload {
  full_name?: string;
  amount: number;
  payment_method: string;
  payment_period: string;
  course?: string;
  group?: string;
  teacher?: string;
  course_id: number;
  branch_id: number;
  user_id: number;
  teacher_id?: number;
  group_id?: number;
  payment_date: string;
  student_id?: number;
}

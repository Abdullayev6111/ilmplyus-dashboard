import type { Branch } from './common.types';

export interface Employee {
  id: number;
  last_name: string;
  first_name: string;
  middle_name: string;
  branch_id: number;
  pinfl: string;
  passport_series: string;
  passport_number: string;
  passport_given_date: string;
  passport_given_by: string;
  birth_date: string;
  phone: string;
  photo: string | null;
  address_registration: string;
  address_living: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  full_name: string;
  photo_url: string;
  branch: Branch;
}

export interface EmployeePayload {
  first_name: string;
  last_name: string;
  middle_name: string;
  branch_id: number;
  pinfl: string;
  passport_series: string;
  passport_number: string;
  passport_given_date: string;
  passport_given_by: string;
  birth_date: string;
  phone: string;
  address_registration: string;
  address_living: string;
}

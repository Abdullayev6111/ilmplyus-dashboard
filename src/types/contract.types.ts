export interface ContractEmployee {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  full_name: string;
  phone: string;
  birth_date: string;
  pinfl: string;
  citizenship: string;
  passport_series: string;
  passport_number: string;
  passport_given_date: string;
  passport_given_by: string;
  address_registration: string;
  address_living: string;
  photo_url?: string;
  branch_id?: number;
}

export interface ContractDepartment {
  id: number;
  name_uz: string | null;
  name_ru: string | null;
  name_en: string | null;
  code?: string;
}

export interface ContractPosition {
  id: number;
  name_uz: string | null;
  name_ru: string | null;
  name_en: string | null;
}

export interface Contract {
  id: number;
  employee_id: number;
  contract_number: number;
  language: string;
  citizenship: string;
  contract_date: string;
  signed_by: string;
  department_id: number;
  position_id: number;
  contract_start_date: string;
  contract_end_date: string;
  contract_type: string;
  probation_period: string | null;
  probation_end_date: string | null;
  working_hours_monthly: string;
  base_salary: string;
  hourly_rate: string;
  total_monthly_salary: string;
  salary_start_date: string;
  salary_end_date: string;
  vacation_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  employee: ContractEmployee;
  department: ContractDepartment;
  position?: ContractPosition;
}

export interface ContractStudent {
  id: number;
  lid_id: number;
  is_minor: boolean;
  first_name?: string;
  last_name?: string;
  father_name?: string;
  phone?: string;
  level?: { name_uz: string };
  group?: { name: string };
}

export interface StudentContract {
  id: number;
  contract_number: string;
  contract_type: string;
  status: string;
  created_at: string;
  branch?: {
    name_uz: string;
    city: string;
  };
  contract_students?: ContractStudent[];
  organization?: {
    organization_name: string;
    phone?: string;
  };
  representative?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

export interface ContractsResponse {
  data: StudentContract[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface StudentFormData {
  lid_id: string;
  jshshir: string;
  language: string;
  citizenship: string;
  passport_series: string;
  passport_number: string;
  passport_given_date: string;
  passport_expiry_date: string;
  passport_given_by: string;
  birth_place: string;
  last_name: string;
  first_name: string;
  father_name: string;
  birth_date: string;
  group_id: string;
  course_id: string;
  level_id: string;
  phone: string;
  residential_address: string;
  registered_address: string;
  monthly_price: string;
  total_price: string;
  course_start_date: string;
  course_end_date: string;
  contract_date: string;
  notes: string;
}

export const emptyStudent: StudentFormData = {
  lid_id: '',
  jshshir: '',
  language: 'uz',
  citizenship: 'citizen',
  passport_series: '',
  passport_number: '',
  passport_given_date: '',
  passport_expiry_date: '',
  passport_given_by: '',
  birth_place: '',
  last_name: '',
  first_name: '',
  father_name: '',
  birth_date: '',
  group_id: '',
  course_id: '',
  level_id: '',
  phone: '',
  residential_address: '',
  registered_address: '',
  monthly_price: '',
  total_price: '',
  course_start_date: '',
  course_end_date: '',
  contract_date: '',
  notes: '',
};

export interface RepresentativeFormData {
  jshshir: string;
  citizenship: string;
  representative_type: string;
  language: string;
  birth_date: string;
  passport_series: string;
  passport_number: string;
  passport_given_date: string;
  passport_expiry_date: string;
  passport_given_by: string;
  last_name: string;
  first_name: string;
  father_name: string;
  phones: string[];
  registered_address: string;
  residential_address: string;
}

export interface MinorStudentFormData {
  lid_id: string;
  jshshir: string;
  language: string;
  citizenship: string;
  birth_cert_series: string;
  birth_cert_number: string;
  birth_cert_given_date: string;
  birth_place: string;
  last_name: string;
  first_name: string;
  father_name: string;
  birth_date: string;
  group_id: string;
  course_id: string;
  level_id: string;
  phone: string;
  residential_address: string;
  birth_cert_expiry_date: string;
  monthly_price?: string;
  total_price?: string;
  course_start_date?: string;
  course_end_date?: string;
}

export const emptyRepresentative: RepresentativeFormData = {
  jshshir: '',
  citizenship: 'citizen',
  representative_type: 'Ota',
  language: 'uz',
  birth_date: '',
  passport_series: '',
  passport_number: '',
  passport_given_date: '',
  passport_expiry_date: '',
  passport_given_by: '',
  last_name: '',
  first_name: '',
  father_name: '',
  phones: ['+998'],
  registered_address: '',
  residential_address: '',
};

export const emptyMinorStudent: MinorStudentFormData = {
  lid_id: '',
  jshshir: '',
  language: 'uz',
  citizenship: 'citizen',
  birth_cert_series: '',
  birth_cert_number: '',
  birth_cert_given_date: '',
  birth_place: '',
  last_name: '',
  first_name: '',
  father_name: '',
  birth_date: '',
  group_id: '',
  course_id: '',
  level_id: '',
  phone: '',
  residential_address: '',
  birth_cert_expiry_date: '',
  monthly_price: '',
  total_price: '',
  course_start_date: '',
  course_end_date: '',
};
export interface OrganizationFormData {
  inn: string;
  language: string;
  branch_id: string;
  city: string;
  contract_date: string;
  has_trustee: string; // "Ishonchnomasiz" or "Ishonchnoma bilan"
  trustee_date: string;
  trustee_number: string;
  organization_name: string;
  organization_branch: string; // "yo'q" or "bor"
  branch_name: string;
  branch_address: string;
  director_last_name: string;
  director_first_name: string;
  director_father_name: string;
  contract_start_date: string;
  contract_end_date: string;
  phones: string[];
  ifut: string;
  account_number: string;
  bank_name: string;
  mfo: string;
}

export const emptyOrganization: OrganizationFormData = {
  inn: '',
  language: 'uz',
  branch_id: '',
  city: '',
  contract_date: '',
  has_trustee: 'Ishonchnomasiz',
  trustee_date: '',
  trustee_number: '',
  organization_name: '',
  organization_branch: "yo'q",
  branch_name: '',
  branch_address: '',
  director_last_name: '',
  director_first_name: '',
  director_father_name: '',
  contract_start_date: '',
  contract_end_date: '',
  phones: ['+998'],
  ifut: '',
  account_number: '',
  bank_name: '',
  mfo: '',
};

export interface OrganizationStudentFormData extends MinorStudentFormData {
  is_minor: boolean;
  passport_series: string;
  passport_number: string;
  passport_given_date: string;
  passport_expiry_date: string;
  registered_address: string;
}

export const emptyOrganizationStudent: OrganizationStudentFormData = {
  ...emptyMinorStudent,
  is_minor: false,
  phone: '+998',
  passport_series: '',
  passport_number: '',
  passport_given_date: '',
  passport_expiry_date: '',
  registered_address: '',
};

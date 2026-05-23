import { API } from './api';

export interface StudentGroup {
  id: number;
  name: string;
  branch_id: number;
  course_id: number;
  level_id: number;
  teacher_id: number;
  room_id: number;
  start_date: string;
  end_date: string | null;
  duration: number;
  is_active: number | boolean;
  start_time: string;
  end_time: string;
  max_students: number;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: number;
  student_code: string;
  balance: string;
  username: string;
  is_contract_confirmed: boolean;
  is_active: boolean;
  birth_date: string;
  branch_id: number;
  district_id: number | null;
  father_name: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: string | null;
  groups: StudentGroup[];
  lid_id: number | null;
  phone: string;
  region_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface StudentPayload {
  full_name: string;
  username: string;
}

export const studentAPI = {
  getAll: async (): Promise<Student[]> => {
    const { data } = await API.get('/students');
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  update: async (id: number, payload: StudentPayload): Promise<Student> => {
    const { data } = await API.put(`/students/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await API.delete(`/students/${id}`);
  },
};

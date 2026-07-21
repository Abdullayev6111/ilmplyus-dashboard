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
  password?: string;
  birth_date?: string;
  phone?: string;
  branch_id?: number;
  gender?: string;
  father_name?: string;
  is_active?: boolean;
  is_contract_confirmed?: boolean;
}

export interface StudentsQueryParams {
  page: number;
  per_page: number;
}

export interface PaginatedStudents {
  data: Student[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export const studentAPI = {
  getAll: async (params: StudentsQueryParams): Promise<PaginatedStudents> => {
    const { data } = await API.get('/students', { params });

    if (Array.isArray(data)) {
      return {
        data,
        meta: {
          current_page: 1,
          per_page: data.length,
          total: data.length,
          last_page: 1,
        },
      };
    }

    const list: Student[] = data?.data ?? [];
    // Backend paginatsiya meta'ni yo `meta` obyektida, yo javob ildizida qaytaradi.
    const meta = data?.meta ?? data ?? {};

    return {
      data: list,
      meta: {
        current_page: meta.current_page ?? params.page,
        per_page: meta.per_page ?? params.per_page,
        total: meta.total ?? list.length,
        last_page: meta.last_page ?? 1,
      },
    };
  },

  update: async (id: number, payload: StudentPayload): Promise<Student> => {
    const { data } = await API.put(`/students/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await API.delete(`/students/${id}`);
  },
};

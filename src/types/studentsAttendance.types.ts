/** Backend yangi enum: active/frozen/dropped/graduated. Eski 'Aktiv'/'Noaktiv' ham kelishi mumkin. */
export type StudentStatus =
  | 'active'
  | 'frozen'
  | 'dropped'
  | 'graduated'
  | 'Aktiv'
  | 'Noaktiv';

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  phone: string;
  status: StudentStatus;
  balance: number;
  last_payment_date: string;
  groups?: { id: number }[];
}

export interface Attendance {
  id?: number;
  student_id: number;
  group_id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'reason';
  score?: number;
  comment_uz?: string;
}

export interface PopoverState {
  id?: number;
  student_id: number;
  group_id: number;
  date: string;
  status?: 'present' | 'absent' | 'late' | 'reason';
  grade?: number;
  comment_uz?: string;
}

export type MonthlyAttendanceResponse = Record<string, Attendance[]>;

export interface StudentsResponse {
  data: Student[];
}

export interface GroupData {
  id: number;
  name: string;
  days: string[];
  [key: string]: unknown;
}

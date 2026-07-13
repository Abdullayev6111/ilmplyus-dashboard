export type AttendanceStatusKey =
  | '+'
  | 'NB'
  | 'S'
  | 'F'
  | 'K'
  | 'absent'
  | 'present'
  | 'no_uniform'
  | 'late'
  | 'excused';
export type AttendanceStatus = AttendanceStatusKey | null;

export interface AttendanceRecord {
  id?: number;
  employee_id: number;
  date: string; // YYYY-MM-DD
  status: AttendanceStatusKey | string[];
  comment_uz?: string;
  check_in?: string;
  check_out?: string;
}

export interface AttendanceBranch {
  id?: number;
  name_uz: string | null;
  name_ru: string | null;
  name_en: string | null;
}

export interface FlatAttendanceRecord {
  id: number;
  employee_id: number;
  employee: string;
  position: string;
  branch_id?: number;
  branch?: AttendanceBranch | null;
  date: string;
  /** "in" — kirdi, "out" — chiqdi */
  type?: 'in' | 'out' | null;
  /** HH:mm:ss — type sodir bo'lgan vaqt */
  time?: string | null;
  check_in?: string;
  check_out?: string;
  comment: string | null;
  status: string[];
}

export interface EmployeeAttendance {
  id: number;
  full_name: string;
  position?: string | null;
  attendances: (Omit<AttendanceRecord, 'status'> & {
    status: AttendanceStatusKey[];
    comment?: string | null;
  })[];
}

export interface AttendanceResponse {
  data: FlatAttendanceRecord[] | EmployeeAttendance[];
}

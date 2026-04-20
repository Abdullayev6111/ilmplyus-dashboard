export type AttendanceStatusKey = '+' | 'NB' | 'S' | 'F' | 'K' | 'absent' | 'present' | 'no_uniform' | 'late' | 'excused';
export type AttendanceStatus = AttendanceStatusKey | null;

export interface AttendanceRecord {
  id?: number;
  employee_id: number;
  date: string; // YYYY-MM-DD
  status: AttendanceStatusKey | string[];
  comment?: string;
  check_in?: string;
  check_out?: string;
}

export interface FlatAttendanceRecord {
  id: number;
  employee_id: number;
  employee: string;
  position: string;
  date: string;
  check_in: string;
  check_out: string;
  comment: string | null;
  status: string[];
}

export interface EmployeeAttendance {
  id: number;
  full_name: string;
  position?: {
    id: number;
    name: string;
  } | null;
  attendances: (Omit<AttendanceRecord, "status"> & {
    status: AttendanceStatusKey[];
  })[];
}

export interface AttendanceResponse {
  data: FlatAttendanceRecord[] | EmployeeAttendance[];
}

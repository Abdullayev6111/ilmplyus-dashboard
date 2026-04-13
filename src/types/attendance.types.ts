export type AttendanceStatus = '+' | 'NB' | 'S' | 'F' | 'K' | null;

export interface AttendanceRecord {
  id?: number;
  employee_id: number;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  comment?: string;
}

export interface EmployeeAttendance {
  id: number;
  full_name: string;
  position: {
    id: number;
    name: string;
  };
  attendances: AttendanceRecord[];
}

export interface AttendanceResponse {
  data: EmployeeAttendance[];
}

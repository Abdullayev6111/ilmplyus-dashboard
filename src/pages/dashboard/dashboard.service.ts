import { API } from "@/api/api";
import type { GroupsApiResponse, Room, Employee, GroupStudent } from "@/types/groups.types";
import type { Lid } from "@/types/lid.types";
import type { Student } from "@/types/studentsAttendance.types";
import type { Payment, PaymentListResponse } from "@/types/payments.types";
import type { Expense, ExpenseListResponse } from "@/types/expense.types";

// ── Dashboard settings ────────────────────────────────────────────────────
export interface DashboardSettings {
  tabNames: Record<string, string>;
  roleVisibility: Record<string, string[]>;
  pagePermissions: Record<string, string[]>;
}

export async function fetchDashboardSettings(): Promise<DashboardSettings> {
  const { data } = await API.get<DashboardSettings>("/dashboard-settings");
  return {
    tabNames: data.tabNames ?? {},
    roleVisibility: data.roleVisibility ?? {},
    pagePermissions: data.pagePermissions ?? {},
  };
}

export async function saveDashboardSettings(settings: DashboardSettings): Promise<void> {
  await API.put("/dashboard-settings", settings);
}

// ── Generic response shape ─────────────────────────────────────────────────
type RawList<T> = T[] | { data: T[] } | { data: T[]; total?: number; meta?: { total?: number } };

export interface AttendanceRecord {
  id?: number;
  employee_id?: number;
  user_id?: number;
  student_id?: number;
  date?: string;
  created_at?: string;
  status?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function safeList<T>(raw: RawList<T>): T[] {
  if (Array.isArray(raw)) return raw;
  if ("data" in raw && Array.isArray(raw.data)) return raw.data;
  return [];
}

export function safeTotal<T>(raw: RawList<T>, fallback = 0): number {
  if (!Array.isArray(raw)) {
    if (typeof (raw as { total?: number }).total === "number") {
      return (raw as { total: number }).total;
    }
    const meta = (raw as { meta?: { total?: number } }).meta;
    if (meta && typeof meta.total === "number") return meta.total;
  }
  return fallback;
}

// ── Students ──────────────────────────────────────────────────────────────────
export async function fetchStudentsData() {
  const { data } = await API.get<RawList<Student>>("/students", {
    params: { page: 1, per_page: 500 },
  });
  const list = safeList<Student>(data);
  return { list, total: safeTotal(data, list.length) };
}

// ── Groups ────────────────────────────────────────────────────────────────────
export async function fetchGroupsData() {
  const { data } = await API.get<GroupsApiResponse>("/groups", {
    params: { page: 1, limit: 500 },
  });
  const list = Array.isArray(data.data) ? data.data : [];
  const total = data.meta?.total ?? data.total ?? list.length;
  return { list, total };
}

// ── Group students ─────────────────────────────────────────────────────────────
export async function fetchGroupStudents(groupId: number): Promise<GroupStudent[]> {
  const { data } = await API.get<RawList<GroupStudent>>(`/groups/${groupId}/students`);
  return safeList<GroupStudent>(data);
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
export async function fetchRoomsData(): Promise<Room[]> {
  const { data } = await API.get<RawList<Room>>("/rooms");
  return safeList<Room>(data);
}

// ── Employees ─────────────────────────────────────────────────────────────────
export async function fetchEmployeesData(): Promise<Employee[]> {
  const { data } = await API.get<RawList<Employee>>("/employees");
  return safeList<Employee>(data);
}

// ── Payments ──────────────────────────────────────────────────────────────────
export async function fetchPaymentsData() {
  const { data } = await API.get<PaymentListResponse>("/payments", {
    params: { page: 1, per_page: 500 },
  });
  const list = safeList<Payment>(data);
  return { list, total: safeTotal(data, list.length) };
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export async function fetchExpensesData() {
  const { data } = await API.get<ExpenseListResponse>("/expenses", {
    params: { page: 1, per_page: 500 },
  });
  const list = safeList<Expense>(data);
  return { list, total: safeTotal(data, list.length) };
}

// ── Lids ──────────────────────────────────────────────────────────────────────
export async function fetchLidsData() {
  const { data } = await API.get<RawList<Lid>>("/lids", {
    params: { page: 1, per_page: 500 },
  });
  const list = safeList<Lid>(data);
  return { list, total: safeTotal(data, list.length) };
}

// ── Student contracts ─────────────────────────────────────────────────────────
export async function fetchStudentContractsTotal(): Promise<number> {
  const { data } = await API.get<{ total?: number; data?: unknown[] }>(
    "/student-contracts",
    { params: { page: 1, per_page: 1 } },
  );
  if (typeof data?.total === "number") return data.total;
  if (Array.isArray(data)) return (data as unknown[]).length;
  return 0;
}

// ── Employee attendances ──────────────────────────────────────────────────────
export async function fetchAttendancesData(): Promise<AttendanceRecord[]> {
  const { data } = await API.get<RawList<AttendanceRecord>>("/attendances", {
    params: { page: 1, per_page: 200 },
  });
  return safeList<AttendanceRecord>(data);
}

// ── Student monthly attendance ─────────────────────────────────────────────────
export async function fetchMonthlyAttendance(): Promise<Record<string, AttendanceRecord[]>> {
  const { data } = await API.get<Record<string, AttendanceRecord[]>>(
    "/student_attendance/monthly",
  );
  if (data && typeof data === "object" && !Array.isArray(data)) return data;
  return {};
}

// ── Aggregation helpers ───────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyun",
  "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek",
];

interface MonthEntry {
  key: string;
  month: string;
  tushum: number;
  xarajat: number;
}

export function aggregateByMonth(
  payments: Payment[],
  expenses: Expense[],
): { month: string; tushum: number; xarajat: number }[] {
  const now = new Date();
  const months: MonthEntry[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: MONTH_NAMES[d.getMonth()] ?? "",
      tushum: 0,
      xarajat: 0,
    });
  }

  payments.forEach((p) => {
    const d = new Date(p.paid_at || p.created_at || '');
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const entry = months.find((r) => r.key === key);
    if (entry) entry.tushum += Number(p.amount) / 1_000_000;
  });

  expenses.forEach((e) => {
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const entry = months.find((r) => r.key === key);
    if (entry) entry.xarajat += e.amount / 1_000_000;
  });

  return months.map(({ month, tushum, xarajat }) => ({
    month,
    tushum: parseFloat(tushum.toFixed(1)),
    xarajat: parseFloat(xarajat.toFixed(1)),
  }));
}

export function weeklyAttendanceByDay(
  monthlyData: Record<string, AttendanceRecord[]>,
): { day: string; pct: number }[] {
  const days = ["Dush", "Sesh", "Chor", "Pay", "Juma", "Shan"];
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  return days.map((day, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const key = date.toISOString().split("T")[0];
    const records = monthlyData[key] ?? [];
    if (!records.length) return { day, pct: 0 };
    const present = records.filter(
      (r) => r.status === "present" || r.status === "late",
    ).length;
    return { day, pct: Math.round((present / records.length) * 100) };
  });
}

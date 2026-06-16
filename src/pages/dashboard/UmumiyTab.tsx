import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  fetchStudentsData,
  fetchGroupsData,
  fetchRoomsData,
  fetchPaymentsData,
  fetchExpensesData,
  aggregateByMonth,
} from "./dashboard.service";

const GOALS = {
  shartnoma: 400,
  tushum_mln: 500,
  retention: 90,
};

function fmtMln(val: number) {
  if (val >= 1000) return `${(val / 1000).toFixed(0)}Mlrd`;
  if (val >= 1) return `${val.toFixed(0)}M`;
  return `${(val * 1000).toFixed(0)}K`;
}

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dash-tooltip">
      <span className="dash-tooltip__label">{label}</span>
      {payload.map((p, i) => (
        <span key={i} className="dash-tooltip__row">
          <span className="dash-tooltip__dot" style={{ background: p.color }} />
          {p.name}: <b>{p.value} M</b>
        </span>
      ))}
    </div>
  );
};

export default function UmumiyTab() {
  const { t } = useTranslation();

  const { data: students } = useQuery({
    queryKey: ["dash-students"],
    queryFn: fetchStudentsData,
  });
  const { data: groups } = useQuery({
    queryKey: ["dash-groups"],
    queryFn: fetchGroupsData,
  });
  const { data: rooms } = useQuery({
    queryKey: ["dash-rooms"],
    queryFn: fetchRoomsData,
  });
  const { data: payments } = useQuery({
    queryKey: ["dash-payments"],
    queryFn: fetchPaymentsData,
  });
  const { data: expenses } = useQuery({
    queryKey: ["dash-expenses"],
    queryFn: fetchExpensesData,
  });

  const totalStudents = students?.total ?? 0;
  const totalRooms = rooms?.length ?? 0;
  const activeStudents = students?.list.filter((s) => s.status === "Aktiv").length ?? 0;
  const inactiveStudents = students?.list.filter((s) => s.status !== "Aktiv").length ?? 0;
  const churnPct = totalStudents > 0 ? ((inactiveStudents / totalStudents) * 100).toFixed(1) : "0.0";

  const chartData = useMemo(() => {
    if (!payments?.list || !expenses?.list) return [];
    return aggregateByMonth(payments.list, expenses.list);
  }, [payments, expenses]);

  const thisMonthPayments = useMemo(() => {
    const now = new Date();
    return (
      payments?.list.filter((p) => {
        const d = new Date(p.paid_at || p.created_at || '');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }) ?? []
    );
  }, [payments]);

  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    return (
      expenses?.list.filter((e) => {
        const d = new Date(e.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }) ?? []
    );
  }, [expenses]);

  const tushum = thisMonthPayments.reduce((s, p) => s + Number(p.amount), 0);
  const xarajat = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const sof = tushum - xarajat;

  const contractCount = students?.list.length ?? 0;
  const tushum_mln = tushum / 1_000_000;
  const retention = totalStudents > 0 ? parseFloat(((activeStudents / totalStudents) * 100).toFixed(1)) : 0;

  const contractPct = Math.min(100, Math.round((contractCount / GOALS.shartnoma) * 100));
  const tushumPct = Math.min(100, Math.round((tushum_mln / GOALS.tushum_mln) * 100));
  const retentionPct = retention;

  const debtorCount = students?.list.filter((s) => Number(s.balance) < 0).length ?? 0;

  return (
    <div className="dash-tab-content">
      <div className="dash-stats-row">
        <div className="dash-stat-card">
          <div className="dash-stat-card__bg dash-stat-card__bg--blue" />
          <p className="dash-stat-card__label">{t("dashboard.umumiy.activeStudents")}</p>
          <p className="dash-stat-card__value">{activeStudents.toLocaleString()}</p>
          <p className="dash-stat-card__sub">
            {t("dashboard.umumiy.totalStudents", { count: totalStudents })}
          </p>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__bg dash-stat-card__bg--green" />
          <p className="dash-stat-card__label">{t("dashboard.umumiy.monthlyProfit")}</p>
          <p className="dash-stat-card__value dash-stat-card__value--green">
            {fmtMln(sof / 1_000_000)}
          </p>
          <p className="dash-stat-card__sub dash-stat-card__sub--green">
            {t("dashboard.umumiy.incomeExpense", {
              income: fmtMln(tushum / 1_000_000),
              expense: fmtMln(xarajat / 1_000_000),
            })}
          </p>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__bg dash-stat-card__bg--indigo" />
          <p className="dash-stat-card__label">{t("dashboard.umumiy.currentLessonsRooms")}</p>
          <p className="dash-stat-card__value">{groups?.total ?? 0}</p>
          <p className="dash-stat-card__sub">
            {t("dashboard.umumiy.totalRooms", { count: totalRooms })}
          </p>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__bg dash-stat-card__bg--red" />
          <p className="dash-stat-card__label">{t("dashboard.umumiy.churnRate")}</p>
          <p className="dash-stat-card__value dash-stat-card__value--red">{churnPct}%</p>
          <p className="dash-stat-card__sub">
            {t("dashboard.umumiy.inactiveStudents", { count: inactiveStudents })}
          </p>
        </div>
      </div>

      <div className="dash-mid-row">
        <div className="dash-card dash-mid-row__chart">
          <h3 className="dash-card__title">{t("dashboard.umumiy.yearlyDynamics")}</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={chartData}
                margin={{ top: 16, right: 16, left: -10, bottom: 0 }}
              >
                <CartesianGrid stroke="#f0f4f8" strokeDasharray="4 4" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8", fontFamily: "noto-r" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "noto-r" }}
                  tickFormatter={(v) => `${v}M`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: "noto-r", paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="tushum"
                  name={t("dashboard.umumiy.chartIncome")}
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="xarajat"
                  name={t("dashboard.umumiy.chartExpense")}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ r: 3, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="dash-empty">{t("dashboard.common.loading")}</div>
          )}
        </div>

        <div className="dash-card dash-mid-row__goals">
          <h3 className="dash-card__title">{t("dashboard.umumiy.monthlyGoals")}</h3>
          <div className="dash-goals">
            <div className="dash-goal">
              <div className="dash-goal__header">
                <span className="dash-goal__name">{t("dashboard.umumiy.salesContracts")}</span>
                <span className="dash-goal__pct" style={{ color: "#22c55e" }}>
                  {contractPct}%
                </span>
              </div>
              <div className="dash-goal__track">
                <div
                  className="dash-goal__fill"
                  style={{ width: `${contractPct}%`, background: "#22c55e" }}
                />
              </div>
              <p className="dash-goal__meta">
                {t("dashboard.umumiy.goalDone", { goal: GOALS.shartnoma, done: contractCount })}
              </p>
            </div>
            <div className="dash-goal">
              <div className="dash-goal__header">
                <span className="dash-goal__name">{t("dashboard.umumiy.incomeRevenue")}</span>
                <span className="dash-goal__pct" style={{ color: "#3b82f6" }}>
                  {tushumPct}%
                </span>
              </div>
              <div className="dash-goal__track">
                <div
                  className="dash-goal__fill"
                  style={{ width: `${tushumPct}%`, background: "#3b82f6" }}
                />
              </div>
              <p className="dash-goal__meta">
                {t("dashboard.umumiy.goalMln", { goal: GOALS.tushum_mln, done: tushum_mln.toFixed(0) })}
              </p>
            </div>
            <div className="dash-goal">
              <div className="dash-goal__header">
                <span className="dash-goal__name">{t("dashboard.umumiy.retention")}</span>
                <span className="dash-goal__pct" style={{ color: "#f59e0b" }}>
                  {retentionPct}%
                </span>
              </div>
              <div className="dash-goal__track">
                <div
                  className="dash-goal__fill"
                  style={{
                    width: `${retentionPct}%`,
                    background: retentionPct < GOALS.retention ? "#ef4444" : "#f59e0b",
                  }}
                />
              </div>
              <p className="dash-goal__meta">
                {t("dashboard.umumiy.retentionNote", { pct: GOALS.retention })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-card">
        <h3 className="dash-card__title">
          <span style={{ marginRight: 8 }}>⚠️</span>
          {t("dashboard.umumiy.alerts")}
        </h3>
        <div className="dash-alerts">
          <div className="dash-alert dash-alert--red">
            <div className="dash-alert__icon">
              <i className="fa-solid fa-circle-exclamation" />
            </div>
            <div>
              <p className="dash-alert__title">{t("dashboard.umumiy.debtorStudents")}</p>
              <p className="dash-alert__body">
                {t("dashboard.umumiy.debtorBody", { count: debtorCount })}
              </p>
            </div>
          </div>
          <div className="dash-alert dash-alert--green">
            <div className="dash-alert__icon">
              <i className="fa-solid fa-arrow-trend-up" />
            </div>
            <div>
              <p className="dash-alert__title">{t("dashboard.umumiy.activeGroupsAlert")}</p>
              <p className="dash-alert__body">
                {t("dashboard.umumiy.activeGroupsBody", { count: groups?.total ?? 0, pct: contractPct })}
              </p>
            </div>
          </div>
          <div className="dash-alert dash-alert--blue">
            <div className="dash-alert__icon">
              <i className="fa-solid fa-desktop" />
            </div>
            <div>
              <p className="dash-alert__title">{t("dashboard.umumiy.roomsLoad")}</p>
              <p className="dash-alert__body">
                {t("dashboard.umumiy.roomsLoadBody", { rooms: totalRooms, groups: groups?.total ?? 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

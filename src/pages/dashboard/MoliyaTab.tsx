import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const LEAVE_COLORS = ["#3b82f6", "#6366f1", "#f59e0b", "#94a3b8"];

const KATEGORIYA_COLORS: Record<string, string> = {
  "tax":         "#fee2e2",
  "income":      "#dcfce7",
  "operational": "#fef9c3",
};
const KATEGORIYA_TEXT: Record<string, string> = {
  "tax":         "#dc2626",
  "income":      "#16a34a",
  "operational": "#ca8a04",
};

function fmtSum(val: number) {
  const sign = val < 0 ? "−" : "+";
  const abs = Math.abs(val).toLocaleString("uz-UZ");
  return `${sign} ${abs}`;
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
          {p.name}: <b>{p.value} MLN</b>
        </span>
      ))}
    </div>
  );
};

export default function MoliyaTab() {
  const { t } = useTranslation();

  const SOF_FOYDA_DATA = [
    { month: t("dashboard.months.jan"), ball: 100 },
    { month: t("dashboard.months.feb"), ball: 110 },
    { month: t("dashboard.months.mar"), ball: 120 },
    { month: t("dashboard.months.apr"), ball: 95 },
    { month: t("dashboard.months.may"), ball: 140 },
  ];

  const XARAJAT_PIE = [
    { name: t("dashboard.moliya.expenseItems.salary"),    value: 55, color: "#3b82f6" },
    { name: t("dashboard.moliya.expenseItems.rent"),      value: 20, color: "#6366f1" },
    { name: t("dashboard.moliya.expenseItems.marketing"), value: 15, color: "#f59e0b" },
    { name: t("dashboard.moliya.expenseItems.tax"),       value: 10, color: "#94a3b8" },
  ];

  const LEDGER = [
    { tavsif: t("dashboard.moliya.ledgerRows.stateTax"), kategoriya: "tax",         summa: -4500000 },
    { tavsif: t("dashboard.moliya.ledgerRows.click"),    kategoriya: "income",       summa: 550000 },
    { tavsif: t("dashboard.moliya.ledgerRows.rent"),     kategoriya: "operational",  summa: -2350000 },
  ];

  const SHLYUZLAR = [
    { label: t("dashboard.moliya.gateways.cash"),     pct: 35, color: "#3b82f6" },
    { label: t("dashboard.moliya.gateways.payme"),    pct: 42, color: "#6366f1" },
    { label: t("dashboard.moliya.gateways.terminal"), pct: 15, color: "#22c55e" },
    { label: t("dashboard.moliya.gateways.transfer"), pct: 8,  color: "#f59e0b" },
  ];

  return (
    <div className="dash-tab-content">
      <div className="dash-stats-row">
        <div className="dash-stat-card">
          <div className="dash-stat-card__bg dash-stat-card__bg--green" />
          <p className="dash-stat-card__label">{t("dashboard.moliya.totalIncome")}</p>
          <p className="dash-stat-card__value dash-stat-card__value--green">450M</p>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__bg dash-stat-card__bg--red" />
          <p className="dash-stat-card__label">{t("dashboard.moliya.totalExpense")}</p>
          <p className="dash-stat-card__value dash-stat-card__value--red">250M</p>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__bg dash-stat-card__bg--blue" />
          <p className="dash-stat-card__label">{t("dashboard.moliya.netProfit")}</p>
          <p className="dash-stat-card__value" style={{ color: "#3b82f6" }}>200M</p>
        </div>
        <div className="dash-stat-card" style={{ borderLeft: "4px solid #f59e0b" }}>
          <p className="dash-stat-card__label">{t("dashboard.moliya.debts")}</p>
          <p className="dash-stat-card__value" style={{ color: "#f59e0b" }}>35M</p>
        </div>
      </div>

      <div className="dash-mid-row">
        <div className="dash-card">
          <h3 className="dash-card__title">{t("dashboard.moliya.profitTrend")}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={SOF_FOYDA_DATA}
              margin={{ top: 16, right: 16, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.03} />
                </linearGradient>
              </defs>
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
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "noto-r", paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="ball"
                name={t("dashboard.moliya.netProfitMln")}
                stroke="#22c55e"
                strokeWidth={2.5}
                fill="url(#greenGrad)"
                dot={{ r: 4, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-card">
          <h3 className="dash-card__title">{t("dashboard.moliya.expenseStructure")}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <PieChart width={200} height={200}>
              <Pie
                data={XARAJAT_PIE}
                cx={95}
                cy={95}
                outerRadius={85}
                dataKey="value"
                paddingAngle={2}
              >
                {XARAJAT_PIE.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number | undefined, name: string | undefined) => [`${v ?? 0}%`, name ?? ""]} />
            </PieChart>
            <ul className="demo-legend">
              {XARAJAT_PIE.map((d, i) => (
                <li key={i} className="demo-legend__item">
                  <span className="demo-legend__dot" style={{ background: LEAVE_COLORS[i] }} />
                  {d.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="dash-mid-row">
        <div className="dash-card">
          <h3 className="dash-card__title">{t("dashboard.moliya.ledgerTitle")}</h3>
          <table className="moliya-table">
            <thead>
              <tr>
                <th>{t("dashboard.moliya.ledgerDesc")}</th>
                <th>{t("dashboard.moliya.ledgerCategory")}</th>
                <th style={{ textAlign: "right" }}>{t("dashboard.moliya.ledgerAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {LEDGER.map((row, i) => (
                <tr key={i}>
                  <td>{row.tavsif}</td>
                  <td>
                    <span
                      className="moliya-badge"
                      style={{
                        background: KATEGORIYA_COLORS[row.kategoriya] ?? "#f1f5f9",
                        color: KATEGORIYA_TEXT[row.kategoriya] ?? "#334155",
                      }}
                    >
                      {t(`dashboard.moliya.categories.${row.kategoriya}`)}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "noto-m",
                      color: row.summa < 0 ? "#dc2626" : "#16a34a",
                    }}
                  >
                    {fmtSum(row.summa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dash-card">
          <h3 className="dash-card__title">{t("dashboard.moliya.gatewaysTitle")}</h3>
          <div className="shlyuz-grid">
            {SHLYUZLAR.map((s, i) => (
              <div key={i} className="shlyuz-card">
                <p className="shlyuz-card__label">{s.label}</p>
                <p className="shlyuz-card__pct" style={{ color: s.color }}>
                  {s.pct}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

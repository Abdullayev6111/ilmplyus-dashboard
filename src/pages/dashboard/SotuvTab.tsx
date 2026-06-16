import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { fetchLidsData, fetchStudentContractsTotal } from './dashboard.service';
import { LID_STATUS } from '@/types/lid.types';
import type { LidStatus } from '@/types/lid.types';

type VoronkaTab = 'holat' | 'kurslar' | 'manba' | 'daraja' | 'hudud' | 'rad';

const HOLAT_STATUS_MAP: { status: LidStatus; key: string }[] = [
  { status: LID_STATUS.NEW_ONLINE, key: 'online' },
  { status: LID_STATUS.NEW_OFFLINE, key: 'offline' },
  { status: LID_STATUS.DEMO_SCHEDULED, key: 'coming' },
  { status: LID_STATUS.DEMO_ATTENDED, key: 'came' },
  { status: LID_STATUS.CONTACTED, key: 'contacted' },
  { status: LID_STATUS.CONTRACT_SIGNED, key: 'contract' },
  { status: LID_STATUS.PAID, key: 'paid' },
  { status: LID_STATUS.NOT_INTERESTED, key: 'notInterested' },
  { status: LID_STATUS.DEMO_MISSED, key: 'missed' },
  { status: LID_STATUS.NOT_CONTACTED, key: 'notContacted' },
];

const RAD_STATUSES: LidStatus[] = [
  LID_STATUS.NOT_INTERESTED,
  LID_STATUS.DEMO_MISSED,
  LID_STATUS.NOT_CONTACTED,
];

const VORONKA_COLORS = [
  '#06b6d4',
  '#38bdf8',
  '#60a5fa',
  '#818cf8',
  '#a78bfa',
  '#c084fc',
  '#e879f9',
  '#f472b6',
  '#fb7185',
  '#fda4af',
];
const RAD_COLORS = ['#fb7185', '#f472b6', '#ec4899', '#db2777', '#be185d'];

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  fill?: string;
  showFoiz?: boolean;
}

const CustomBar = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  value,
  fill,
  showFoiz,
}: BarShapeProps) => {
  if (!height) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={5} />
      <text
        x={x + width - 8}
        y={y + height / 2}
        textAnchor="end"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={12}
        fontFamily="noto-m"
      >
        {showFoiz ? `${value}%` : `${value} ta`}
      </text>
    </g>
  );
};

const NOW_MS = Date.now();

export default function SotuvTab() {
  const { t } = useTranslation();
  const [voronkaTab, setVoronkaTab] = useState<VoronkaTab>('holat');
  const [showFoiz, setShowFoiz] = useState(false);

  const { data: lidsData, isLoading } = useQuery({
    queryKey: ['dash-lids'],
    queryFn: fetchLidsData,
  });

  const { data: studentContractsTotal = 0 } = useQuery({
    queryKey: ['dash-student-contracts-total'],
    queryFn: fetchStudentContractsTotal,
  });

  const lids = useMemo(() => lidsData?.list ?? [], [lidsData]);

  const TABS: { key: VoronkaTab; label: string }[] = [
    { key: 'holat', label: t('dashboard.sotuv.tabs.holat') },
    { key: 'kurslar', label: t('dashboard.sotuv.tabs.kurslar') },
    { key: 'manba', label: t('dashboard.sotuv.tabs.manba') },
    { key: 'daraja', label: t('dashboard.sotuv.tabs.daraja') },
    { key: 'hudud', label: t('dashboard.sotuv.tabs.hudud') },
    { key: 'rad', label: t('dashboard.sotuv.tabs.rad') },
  ];


  // ── Voronka aggregation ──────────────────────────────────────────────────
  const voronkaHolat = useMemo(() => {
    const counts: Record<number, number> = {};
    lids.forEach((l) => {
      counts[l.status] = (counts[l.status] ?? 0) + 1;
    });
    return HOLAT_STATUS_MAP.map((h) => ({
      name: t(`dashboard.sotuv.holat.${h.key}`),
      value: counts[h.status] ?? 0,
    })).sort((a, b) => b.value - a.value);
  }, [lids, t]);

  const voronkaKurslar = useMemo(() => {
    const counts: Record<string, number> = {};
    lids.forEach((l) => {
      const name = l.course?.name_uz || l.course?.name || 'Boshqa';
      counts[name] = (counts[name] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [lids]);

  const voronkaManba = useMemo(() => {
    const counts: Record<string, number> = {};
    lids.forEach((l) => {
      const name = l.source?.name_uz || l.source?.name || 'Boshqa';
      counts[name] = (counts[name] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [lids]);

  const voronkaDaraja = useMemo(() => {
    const counts: Record<string, number> = {};
    lids.forEach((l) => {
      const name = l.level?.name_uz || l.level?.name || 'Boshqa';
      counts[name] = (counts[name] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [lids]);

  const voronkaHudud = useMemo(() => {
    const counts: Record<string, number> = {};
    lids.forEach((l) => {
      const name = l.region?.name_uz || 'Boshqa';
      counts[name] = (counts[name] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [lids]);

  const voronkaRad = useMemo(() => {
    const radLids = lids.filter((l) => RAD_STATUSES.includes(l.status));
    const counts: Record<string, number> = {};
    radLids.forEach((l) => {
      const h = HOLAT_STATUS_MAP.find((h) => h.status === l.status);
      const name = h ? t(`dashboard.sotuv.holat.${h.key}`) : 'Boshqa';
      counts[name] = (counts[name] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [lids, t]);

  const VORONKA_MAP: Record<VoronkaTab, { name: string; value: number }[]> = {
    holat: voronkaHolat,
    kurslar: voronkaKurslar,
    manba: voronkaManba,
    daraja: voronkaDaraja,
    hudud: voronkaHudud,
    rad: voronkaRad,
  };

  const isRad = voronkaTab === 'rad';
  const rawData = VORONKA_MAP[voronkaTab];
  const maxVal = Math.max(...rawData.map((d) => d.value), 1);
  const chartData = rawData.map((d) => ({
    ...d,
    display: showFoiz ? parseFloat(((d.value / maxVal) * 100).toFixed(1)) : d.value,
  }));

  // ── Demographics ─────────────────────────────────────────────────────────
  const maleCount = lids.filter((l) => l.gender === 'male').length;
  const femaleCount = lids.filter((l) => l.gender === 'female').length;
  const total = maleCount + femaleCount || 1;
  const malePct = Math.round((maleCount / total) * 100);

  const yoshData = useMemo(() => {
    const yoshLabels = [
      { name: t('dashboard.sotuv.age712'), value: 0, color: '#f59e0b' },
      { name: t('dashboard.sotuv.age1317'), value: 0, color: '#3b82f6' },
      { name: t('dashboard.sotuv.age1824'), value: 0, color: '#6366f1' },
      { name: t('dashboard.sotuv.age25'), value: 0, color: '#94a3b8' },
    ];
    const getAge = (birthDate: string | null): number | null => {
      if (!birthDate) return null;
      const diff = NOW_MS - new Date(birthDate).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };
    const counts = [0, 0, 0, 0];
    lids.forEach((l) => {
      const age = getAge(l.birth_date);
      if (age === null) return;
      if (age <= 12) counts[0]++;
      else if (age <= 17) counts[1]++;
      else if (age <= 24) counts[2]++;
      else counts[3]++;
    });
    return yoshLabels.map((d, i) => ({ ...d, value: counts[i] }));
  }, [lids, t]);

  const successContracts = studentContractsTotal;

  if (isLoading) return <div className="dash-loading">{t('dashboard.common.loading')}</div>;

  return (
    <div className="dash-tab-content">
      <div className="dash-mid-row dash-mid-row--sotuv">
        {/* Left: Voronka */}
        <div className="dash-card dash-mid-row__voronka">
          <div className="voronka-controls">
            <div className="voronka-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`voronka-tab${voronkaTab === tab.key ? ' voronka-tab--active' : ''}${tab.key === 'rad' ? ' voronka-tab--rad' : ''}`}
                  onClick={() => setVoronkaTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="voronka-toggle">
              <span
                className={`voronka-toggle__label${!showFoiz ? ' voronka-toggle__label--active' : ''}`}
              >
                {t('dashboard.sotuv.soni')}
              </span>
              <button
                role="switch"
                aria-checked={showFoiz}
                className={`voronka-switch${showFoiz ? ' voronka-switch--on' : ''}`}
                onClick={() => setShowFoiz(!showFoiz)}
              >
                <span className="voronka-switch__knob" />
              </button>
              <span
                className={`voronka-toggle__label${showFoiz ? ' voronka-toggle__label--active' : ''}`}
              >
                {t('dashboard.sotuv.foiz')}
              </span>
            </div>
          </div>

          <h3 className="dash-card__title" style={{ marginTop: 16 }}>
            {t('dashboard.sotuv.voronkaTitle')}
          </h3>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(chartData.length * 52, 200)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                barCategoryGap={8}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: '#475569', fontFamily: 'noto-r' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  formatter={(val: number | undefined) =>
                    showFoiz ? [`${val ?? 0}%`, ''] : [`${val ?? 0} ta`, '']
                  }
                />
                <Bar
                  dataKey="display"
                  shape={(p: unknown) => (
                    <CustomBar {...(p as BarShapeProps)} showFoiz={showFoiz} />
                  )}
                  isAnimationActive
                >
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        isRad
                          ? RAD_COLORS[i % RAD_COLORS.length]
                          : VORONKA_COLORS[i % VORONKA_COLORS.length]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="dash-empty">{t('dashboard.common.noData')}</div>
          )}
        </div>

        {/* Right: Demographics + Contracts */}
        <div className="dash-sotuv-right">
          <div className="dash-card">
            <h3 className="dash-card__title">{t('dashboard.sotuv.demographics')}</h3>

            <div className="demo-gender">
              <div className="demo-gender__labels">
                <span className="demo-gender__male">
                  <i className="fa-solid fa-mars" /> {t('dashboard.sotuv.boys')}
                </span>
                <span className="demo-gender__female">
                  {t('dashboard.sotuv.girls')} <i className="fa-solid fa-venus" />
                </span>
              </div>
              <div className="demo-gender__track">
                <div className="demo-gender__fill--male" style={{ width: `${malePct}%` }} />
                <div className="demo-gender__fill--female" style={{ width: `${100 - malePct}%` }} />
              </div>
              <div className="demo-gender__counts">
                <span>
                  {maleCount} {t('dashboard.common.nafar')}
                </span>
                <span>
                  {femaleCount} {t('dashboard.common.nafar')}
                </span>
              </div>
            </div>

            <p className="demo-subtitle">{t('dashboard.sotuv.ageGroups')}</p>
            <div className="demo-donut-row">
              <PieChart width={160} height={160}>
                <Pie
                  data={yoshData}
                  cx={75}
                  cy={75}
                  innerRadius={50}
                  outerRadius={72}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                >
                  {yoshData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
              <ul className="demo-legend">
                {yoshData.map((d, i) => (
                  <li key={i} className="demo-legend__item">
                    <span className="demo-legend__dot" style={{ background: d.color }} />
                    {d.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="dash-card dash-contracts-card">
            <p className="dash-contracts-card__label">{t('dashboard.sotuv.successContracts')}</p>
            <p className="dash-contracts-card__value">
              {successContracts} {t('dashboard.sotuv.taContract')}
            </p>
            <div className="dash-contracts-card__row">
              <span>{t('dashboard.sotuv.totalLids')}</span>
              <span className="dash-contracts-card__cac">
                {lidsData?.total ?? 0} {t('dashboard.common.ta')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

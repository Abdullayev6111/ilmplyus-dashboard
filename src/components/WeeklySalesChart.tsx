import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

type ChartItem = {
  day: string;
  naqd: number;
  karta: number;
  bank: number;
};

const COLORS = {
  naqd: '#26ff00',
  karta: '#3f88c9',
  bank: '#fe0000',
};

const defaultData: ChartItem[] = [
  { day: 'DU', naqd: 40, karta: 70, bank: 35 },
  { day: 'SE', naqd: 50, karta: 30, bank: 55 },
  { day: 'CHO', naqd: 65, karta: 15, bank: 35 },
  { day: 'PA', naqd: 20, karta: 25, bank: 15 },
  { day: 'JU', naqd: 70, karta: 55, bank: 30 },
  { day: 'SHA', naqd: 40, karta: 70, bank: 35 },
];

const WeeklySalesChart = () => {
  const [data] = useState<ChartItem[]>(defaultData);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />

        <Bar barSize={28} dataKey="naqd" fill={COLORS.naqd} radius={[6, 6, 0, 0]} />
        <Bar barSize={28} dataKey="karta" fill={COLORS.karta} radius={[6, 6, 0, 0]} />
        <Bar barSize={28} dataKey="bank" fill={COLORS.bank} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklySalesChart;

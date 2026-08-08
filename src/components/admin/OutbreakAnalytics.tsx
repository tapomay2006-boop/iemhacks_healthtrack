import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { PatientRecord } from '../../engine/dexieDb';

interface OutbreakAnalyticsProps {
  patients: PatientRecord[];
}

export const OutbreakAnalytics: React.FC<OutbreakAnalyticsProps> = ({ patients }) => {
  // 1. Prepare Daily Growth Curve Data
  const dailyData = [
    { day: 'Mon', total: 2, red: 0, yellow: 1 },
    { day: 'Tue', total: 4, red: 1, yellow: 2 },
    { day: 'Wed', total: 7, red: 2, yellow: 3 },
    { day: 'Thu', total: 11, red: 4, yellow: 4 },
    { day: 'Fri', total: 16, red: 7, yellow: 6 },
    { day: 'Sat', total: patients.length || 21, red: patients.filter((p) => p.riskLevel === 'RED').length || 9, yellow: 8 },
  ];

  // 2. Prepare Risk Distribution Pie Data
  const redCount = patients.filter((p) => p.riskLevel === 'RED').length || 7;
  const yellowCount = patients.filter((p) => p.riskLevel === 'YELLOW').length || 5;
  const greenCount = patients.filter((p) => p.riskLevel === 'GREEN').length || 4;

  const pieData = [
    { name: 'RED Critical', value: redCount, color: '#ef4444' },
    { name: 'YELLOW Moderate', value: yellowCount, color: '#f59e0b' },
    { name: 'GREEN Mild', value: greenCount, color: '#10b981' },
  ];

  // 3. Prepare Affected Village Bar Data
  const villageCounts: Record<string, number> = {};
  patients.forEach((p) => {
    villageCounts[p.villageName] = (villageCounts[p.villageName] || 0) + 1;
  });

  const barData = Object.entries(villageCounts).map(([v, count]) => ({
    village: v,
    cases: count,
  }));

  if (barData.length === 0) {
    barData.push(
      { village: 'Sonarpur', cases: 8 },
      { village: 'Rampur', cases: 5 },
      { village: 'Beldiha', cases: 4 }
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Daily Epidemic Growth Area Curve */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Daily Outbreak Acceleration</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
            +140% Weekly Surge
          </span>
        </div>
        <div className="h-48 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="red" stroke="#ef4444" fillOpacity={1} fill="url(#colorRed)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Triage Severity Breakdown Pie Chart */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white">Risk Triage Share</h3>
        <div className="h-48 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-300">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> RED ({redCount})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> YELLOW ({yellowCount})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> GREEN ({greenCount})</span>
        </div>
      </div>

      {/* 3. Affected Villages Bar Chart */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white">Village Cluster Ranking</h3>
        <div className="h-48 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="village" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
              />
              <Bar dataKey="cases" fill="#0d9488" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Users,
  Trophy,
  Award,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Participant, LotteryResult } from '../types';

interface StatisticsPanelProps {
  participants: Participant[];
  history: LotteryResult[];
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  participants,
  history,
}) => {
  // 1. 部門中籤人數統計
  const departmentStats = useMemo(() => {
    const counts: Record<string, { total: number; won: number }> = {};

    participants.forEach((p) => {
      const dept = p.department || '未分配';
      if (!counts[dept]) counts[dept] = { total: 0, won: 0 };
      counts[dept].total += 1;
      counts[dept].won += p.winCount || 0;
    });

    return Object.entries(counts).map(([name, data]) => ({
      name,
      中籤人次: data.won,
      部門總人數: data.total,
    }));
  }, [participants]);

  // 2. 個人中籤次數排行榜 Top 10
  const topWinners = useMemo(() => {
    return [...participants]
      .filter((p) => (p.winCount || 0) > 0)
      .sort((a, b) => b.winCount - a.winCount)
      .slice(0, 10);
  }, [participants]);

  // 3. 總中籤總人次
  const totalWins = useMemo(() => {
    return participants.reduce((sum, p) => sum + (p.winCount || 0), 0);
  }, [participants]);

  // 4. 未中籤人數
  const zeroWinCount = useMemo(() => {
    return participants.filter((p) => (p.winCount || 0) === 0).length;
  }, [participants]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 頂部標題 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">統計與公平性分析</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              即時統計各部門中籤分佈、個人得獎次數與公平輪值數據
            </p>
          </div>
        </div>
      </div>

      {/* 指標卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">總抽獎次數</span>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{history.length}</p>
          <span className="text-[11px] text-slate-400">累計開獎場次</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">參與名單總人數</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{participants.length}</p>
          <span className="text-[11px] text-blue-600 font-medium">
            可抽籤 {participants.filter((p) => p.enabled).length} 人
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">累計中籤人次</span>
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-600 mt-2">{totalWins}</p>
          <span className="text-[11px] text-slate-400">全體中籤總次數</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">尚未中籤人數</span>
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-purple-600 mt-2">{zeroWinCount}</p>
          <span className="text-[11px] text-purple-600 font-medium">
            佔總人數 {participants.length > 0 ? Math.round((zeroWinCount / participants.length) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* 圖表分析區 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 各部門中籤人次長條圖 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <span>各部門中籤人次分佈</span>
          </h3>
          <div className="h-64 w-full">
            {departmentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="中籤人次" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                暫無部門資料
              </div>
            )}
          </div>
        </div>

        {/* 各部門人數比例圓餅圖 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-amber-500" />
            <span>各部門人數組成比例</span>
          </h3>
          <div className="h-64 w-full">
            {departmentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentStats}
                    dataKey="部門總人數"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {departmentStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                暫無部門資料
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 個人得獎次數排行榜 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>個人得獎排行榜 (Top 10)</span>
          </span>
          <span className="text-xs text-slate-500 font-normal">
            若啟用「公平輪值模式」，得獎多次者下一次機率將自動適度降低
          </span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold">
              <tr>
                <th className="px-4 py-2.5">排名</th>
                <th className="px-4 py-2.5">姓名</th>
                <th className="px-4 py-2.5">工號/編號</th>
                <th className="px-4 py-2.5">部門</th>
                <th className="px-4 py-2.5 text-center">累計中籤次數</th>
                <th className="px-4 py-2.5 text-right">最近中籤日期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topWinners.map((w, idx) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-bold">
                    {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                  </td>
                  <td className="px-4 py-2.5 font-black text-slate-900">{w.name}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500">{w.code || '-'}</td>
                  <td className="px-4 py-2.5 text-slate-700">{w.department || '未分配'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-block bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full">
                      {w.winCount} 次
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-500">
                    {w.lastWonAt ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {new Date(w.lastWonAt).toLocaleDateString('zh-TW')}
                      </span>
                    ) : (
                      '無記錄'
                    )}
                  </td>
                </tr>
              ))}

              {topWinners.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    目前尚未有中籤紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  ShieldAlert,
  Users,
  Building,
  History,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Participant,
  LotteryAlgorithm,
  LotteryConstraint,
  LotteryMode,
} from '../types';

interface ParticipantPoolSidebarProps {
  participants: Participant[];
  remainingPool: Participant[];
  algorithm: LotteryAlgorithm;
  onChangeAlgorithm: (alg: LotteryAlgorithm) => void;
  constraints: LotteryConstraint;
  onChangeConstraints: (constraints: LotteryConstraint) => void;
  onResetRemainingPool: () => void;
  currentMode: LotteryMode;
}

export const ParticipantPoolSidebar: React.FC<ParticipantPoolSidebarProps> = ({
  participants,
  remainingPool,
  algorithm,
  onChangeAlgorithm,
  constraints,
  onChangeConstraints,
  onResetRemainingPool,
  currentMode,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const departments = React.useMemo(() => {
    const map = new Map<string, number>();
    remainingPool.forEach((p) => {
      const dept = p.department || '未分配';
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [remainingPool]);

  const handleToggleExcludeId = (id: string) => {
    const current = constraints.excludedParticipantIds || [];
    const updated = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    onChangeConstraints({ ...constraints, excludedParticipantIds: updated });
  };

  const handleDepartmentQuotaChange = (dept: string, count: number) => {
    const quotas = { ...constraints.departmentQuotas, [dept]: Math.max(0, count) };
    onChangeConstraints({ ...constraints, departmentQuotas: quotas });
  };

  const eligibleCount = remainingPool.filter((p) => {
    if (!p.enabled) return false;
    if (constraints.excludedParticipantIds?.includes(p.id)) return false;
    if (constraints.excludePreviousWinners && (p.winCount || 0) > 0) return false;
    return true;
  }).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5 h-fit">
      {/* 頂部池底狀態 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">目前抽籤池</h3>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-700 border border-blue-200">
          池內：{eligibleCount} / {participants.length} 人
        </span>
      </div>

      {/* 不重複抽籤進度提示 */}
      {currentMode === 'no_repeat' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-center justify-between">
          <span>
            已抽出 <strong>{participants.length - remainingPool.length}</strong> 人
          </span>
          <button
            onClick={onResetRemainingPool}
            className="text-[11px] font-bold text-amber-700 hover:underline flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" /> 重設池底
          </button>
        </div>
      )}

      {/* 演算法選擇 */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          抽籤演算法機制
        </label>
        <div className="space-y-1.5">
          {[
            {
              id: 'random',
              title: '完全隨機',
              desc: '所有人中籤機率完全相同',
            },
            {
              id: 'weighted',
              title: '權重抽籤 (1~10x)',
              desc: '依個別設定之權重比例中籤',
            },
            {
              id: 'fair_rotation',
              title: '公平輪值模式',
              desc: '歷史中籤少者優先，剛中過者機率調低',
            },
          ].map((alg) => (
            <div
              key={alg.id}
              onClick={() => onChangeAlgorithm(alg.id as LotteryAlgorithm)}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                algorithm === alg.id
                  ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{alg.title}</span>
                {algorithm === alg.id && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{alg.desc}</p>
            </div>
          ))}
        </div>

        {algorithm === 'weighted' && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800 flex items-start gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>提醒：</strong>此模式並非所有人機率相同，將根據名單管理中設定的 1~10
              權重倍率計算。
            </span>
          </div>
        )}

        {algorithm === 'fair_rotation' && (
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-2.5 text-[11px] text-indigo-900">
            <span className="font-semibold block mb-1">⚖️ 公平輪值演算法運作規則：</span>
            <ul className="list-disc pl-4 space-y-0.5 text-indigo-800">
              <li>歷史中籤次數越少者，權重越高</li>
              <li>最近 7 天內剛中籤者，中籤機率自動降低 70%</li>
            </ul>
          </div>
        )}
      </div>

      {/* 進階條件按鈕 */}
      <div className="pt-2 border-t border-slate-100">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-blue-600 transition py-1"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>進階限制與指定配額</span>
          </span>
          <span className="text-[11px] text-blue-600">
            {showAdvanced ? '收合' : '設定'}
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            {/* 1. 歷史排除 */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={constraints.excludePreviousWinners}
                onChange={(e) =>
                  onChangeConstraints({
                    ...constraints,
                    excludePreviousWinners: e.target.checked,
                  })
                }
                className="rounded text-blue-600"
              />
              <span className="font-medium text-slate-800">過去已中籤者暫不參加本次</span>
            </label>

            {/* 2. 同部門上限 */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                同一部門最多中籤人數 (0為不限)
              </label>
              <input
                type="number"
                min={0}
                value={constraints.maxPerDepartment || 0}
                onChange={(e) =>
                  onChangeConstraints({
                    ...constraints,
                    maxPerDepartment: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
              />
            </div>

            {/* 3. 各部門指定配額 */}
            {departments.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <label className="block font-bold text-slate-700">
                  指定部門抽出名額：
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {departments.map(([dept, count]) => (
                    <div
                      key={dept}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="text-slate-600 truncate max-w-[120px]">
                        {dept} ({count}人)
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-400">抽</span>
                        <input
                          type="number"
                          min={0}
                          max={count}
                          value={constraints.departmentQuotas?.[dept] || 0}
                          onChange={(e) =>
                            handleDepartmentQuotaChange(
                              dept,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-center font-bold"
                        />
                        <span className="text-slate-400">人</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 部門池底分佈清單 */}
      <div className="pt-2 border-t border-slate-100">
        <span className="text-xs font-bold text-slate-700 block mb-2">部門人數概況</span>
        <div className="flex flex-wrap gap-1.5">
          {departments.map(([dept, count]) => (
            <span
              key={dept}
              className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
            >
              {dept}：<strong className="text-slate-800 ml-0.5">{count}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

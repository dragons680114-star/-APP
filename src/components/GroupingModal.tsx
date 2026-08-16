import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  Shuffle,
  Download,
  Copy,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { Participant, GroupResult } from '../types';
import { divideIntoGroups } from '../utils/lotteryEngine';

interface GroupingModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  activityName: string;
}

export const GroupingModal: React.FC<GroupingModalProps> = ({
  isOpen,
  onClose,
  participants,
  activityName,
}) => {
  const [groupType, setGroupType] = useState<'by_count' | 'by_size'>('by_count');
  const [targetValue, setTargetValue] = useState<number>(4);
  const [groupResult, setGroupResult] = useState<GroupResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const eligibleParticipants = participants.filter((p) => p.enabled);

  const handleGenerateGroups = () => {
    if (eligibleParticipants.length === 0) return;

    const groups = divideIntoGroups(participants, groupType, targetValue);
    const result: GroupResult = {
      id: `grp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      activityName,
      groupType,
      groupTargetValue: targetValue,
      groups,
    };
    setGroupResult(result);
  };

  const handleExportExcel = () => {
    if (!groupResult) return;

    const rows = groupResult.groups.flatMap((grp) =>
      grp.members.map((m, idx) => ({
        組別: grp.groupName,
        組內序號: idx + 1,
        姓名: m.name,
        員工編號: m.code || '-',
        部門: m.department || '未分配',
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '分組名單');
    XLSX.writeFile(workbook, `好運抽籤_隨機分組名單_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleCopyText = async () => {
    if (!groupResult) return;

    const lines: string[] = [`🎲【${activityName}・隨機分組結果】`];
    groupResult.groups.forEach((grp) => {
      lines.push(`\n📌 ${grp.groupName} (${grp.members.length} 人)：`);
      grp.members.forEach((m, i) => {
        lines.push(`  ${i + 1}. ${m.name} (${m.department || '未分配'})`);
      });
    });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 text-slate-800 my-6">
        {/* 標頭 */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-xl bg-white/20 p-2 text-white">
              <Shuffle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">隨機分組工具</h3>
              <p className="text-xs text-blue-100">
                目前可參加人數：{eligibleParticipants.length} 人，自動隨機洗牌平均分配
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 設定區 */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">分組計算方式</label>
              <div className="flex rounded-lg bg-slate-200 p-1">
                <button
                  type="button"
                  onClick={() => setGroupType('by_count')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                    groupType === 'by_count'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  固定組數
                </button>
                <button
                  type="button"
                  onClick={() => setGroupType('by_size')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                    groupType === 'by_size'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  固定每組人數
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {groupType === 'by_count' ? '欲分成幾組 (組數)' : '每組預計人數 (人)'}
              </label>
              <input
                type="number"
                min={1}
                max={eligibleParticipants.length || 1}
                value={targetValue}
                onChange={(e) => setTargetValue(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <button
                onClick={handleGenerateGroups}
                disabled={eligibleParticipants.length === 0}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>立即隨機分組</span>
              </button>
            </div>
          </div>

          {/* 分組結果卡片 */}
          {groupResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>分組結果（共分成 {groupResult.groups.length} 組）</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyText}
                    className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>複製結果</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>匯出 Excel</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupResult.groups.map((grp) => (
                  <div
                    key={grp.groupNumber}
                    className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-blue-200/80 pb-2 mb-3">
                      <h4 className="font-bold text-blue-900 text-sm">{grp.groupName}</h4>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                        {grp.members.length} 人
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {grp.members.map((m, idx) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-xs shadow-2xs"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="text-slate-400 font-mono text-[11px] w-4">
                              {idx + 1}.
                            </span>
                            <span className="font-bold text-slate-800">{m.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 shrink-0">
                            {m.department || '未分配'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Shuffle className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">請設定分組條件後點擊「立即隨機分組」</p>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-6 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

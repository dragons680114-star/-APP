import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Download,
  Trash2,
  Trophy,
  Calendar,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { LotteryResult } from '../types';
import { exportAllHistoryToExcel, exportWinnersToExcel } from '../utils/export';

interface HistoryPanelProps {
  history: LotteryResult[];
  onClearHistory: () => void;
  onViewResult: (result: LotteryResult) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onClearHistory,
  onViewResult,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMode, setSelectedMode] = useState('ALL');

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchSearch =
        item.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.prizeName && item.prizeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.winners.some(
          (w) =>
            w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (w.department && w.department.toLowerCase().includes(searchTerm.toLowerCase()))
        );

      const matchMode = selectedMode === 'ALL' || item.mode === selectedMode;
      return matchSearch && matchMode;
    });
  }, [history, searchTerm, selectedMode]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 頂部標題 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>歷史抽籤紀錄</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                共 {history.length} 次抽獎
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              完整記錄每次抽籤時間、活動、獎項與中籤名單，供查驗與匯出
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportAllHistoryToExcel(history)}
            disabled={history.length === 0}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>匯出全紀錄 Excel</span>
          </button>

          <button
            onClick={() => {
              if (confirm('確定要清空所有抽籤歷史紀錄嗎？此動作無法復原。')) {
                onClearHistory();
              }
            }}
            disabled={history.length === 0}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>清空歷史</span>
          </button>
        </div>
      </div>

      {/* 搜尋與模式篩選 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋活動名稱、獎項、中籤者姓名或部門..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedMode}
          onChange={(e) => setSelectedMode(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 w-full sm:w-auto"
        >
          <option value="ALL">全部抽籤模式</option>
          <option value="single">單人抽籤</option>
          <option value="multiple">多人抽籤</option>
          <option value="no_repeat">不重複抽籤</option>
          <option value="prize">獎項抽籤</option>
        </select>
      </div>

      {/* 歷史清單列表 */}
      <div className="space-y-4">
        {filteredHistory.map((item) => {
          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Trophy className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>{item.activityName}</span>
                      {item.prizeName && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                          {item.prizeName}
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(item.timestamp).toLocaleString('zh-TW')}</span>
                      <span className="mx-1">•</span>
                      <span>抽出 {item.winners.length} 人（池底 {item.totalParticipants} 人）</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportWinnersToExcel(item)}
                    className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>下載 Excel</span>
                  </button>

                  <button
                    onClick={() => onViewResult(item)}
                    className="inline-flex items-center space-x-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>查看喜報</span>
                  </button>
                </div>
              </div>

              {/* 中籤名單徽章膠囊 */}
              <div className="flex flex-wrap gap-2 pt-1">
                {item.winners.map((w, idx) => (
                  <div
                    key={w.id}
                    className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs shadow-2xs"
                  >
                    <span className="font-mono text-slate-400 text-[10px]">#{idx + 1}</span>
                    <span className="font-bold text-slate-900">{w.name}</span>
                    <span className="text-slate-500 text-[11px]">
                      ({w.department || '未分配'})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredHistory.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
            <History className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">尚無抽籤紀錄</p>
            <p className="text-xs mt-1">開始進行抽籤後，所有得獎結果會自動記錄在此處</p>
          </div>
        )}
      </div>
    </div>
  );
};

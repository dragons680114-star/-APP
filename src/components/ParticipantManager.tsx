import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  CheckSquare,
  Square,
  Sparkles,
  Edit2,
  Save,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Participant } from '../types';
import { exportParticipantsToExcel } from '../utils/export';
import { DEFAULT_PARTICIPANTS } from '../utils/storage';

interface ParticipantManagerProps {
  participants: Participant[];
  onUpdateParticipants: (newList: Participant[]) => void;
  onOpenImportModal: () => void;
}

export const ParticipantManager: React.FC<ParticipantManagerProps> = ({
  participants,
  onUpdateParticipants,
  onOpenImportModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // 快速新增單筆 / 批次貼上
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchDept, setBatchDept] = useState('');

  // 單筆快速新增
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newWeight, setNewWeight] = useState(1);

  // 編輯中項目
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Participant>>({});

  // 勾選多選
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 取得所有部門清單
  const departments = useMemo(() => {
    const set = new Set<string>();
    participants.forEach((p) => {
      if (p.department) set.add(p.department);
    });
    return Array.from(set);
  }, [participants]);

  // 重複姓名檢查
  const duplicateNames = useMemo(() => {
    const nameCounts = new Map<string, number>();
    participants.forEach((p) => {
      const trimmed = p.name.trim();
      nameCounts.set(trimmed, (nameCounts.get(trimmed) || 0) + 1);
    });
    const duplicates = new Set<string>();
    nameCounts.forEach((count, name) => {
      if (count > 1) duplicates.add(name);
    });
    return duplicates;
  }, [participants]);

  // 篩選後清單
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.department && p.department.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDept = selectedDept === 'ALL' || p.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [participants, searchTerm, selectedDept]);

  // 批次貼上新增處理
  const handleBatchAddSubmit = () => {
    if (!batchText.trim()) return;

    // 分隔符號支援換行、逗號、分號、Tab
    const lines = batchText
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const baseCount = participants.length;
    const newItems: Participant[] = lines.map((name, index) => ({
      id: `p-${Date.now()}-${baseCount + index}`,
      name,
      code: `ID${String(baseCount + index + 1).padStart(3, '0')}`,
      department: batchDept.trim() || '未分配',
      weight: 1,
      enabled: true,
      winCount: 0,
      lastWonAt: null,
    }));

    onUpdateParticipants([...participants, ...newItems]);
    setBatchText('');
    setBatchDept('');
    setShowBatchAdd(false);
  };

  // 單筆新增
  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: Participant = {
      id: `p-${Date.now()}-${participants.length}`,
      name: newName.trim(),
      code: newCode.trim() || `ID${String(participants.length + 1).padStart(3, '0')}`,
      department: newDept.trim() || '未分配',
      weight: Math.max(1, Math.min(10, newWeight)),
      enabled: true,
      winCount: 0,
      lastWonAt: null,
    };

    onUpdateParticipants([...participants, newItem]);
    setNewName('');
    setNewCode('');
    setNewDept('');
    setNewWeight(1);
  };

  // 快速去重 (保留第一筆)
  const handleRemoveDuplicates = () => {
    const seen = new Set<string>();
    const cleaned: Participant[] = [];
    participants.forEach((p) => {
      const key = p.name.trim();
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push(p);
      }
    });
    onUpdateParticipants(cleaned);
  };

  // 載入預設示範名單
  const handleLoadSample = () => {
    if (confirm('確定要載入預設 20 位示範名單嗎？這將覆蓋現有名單。')) {
      onUpdateParticipants(DEFAULT_PARTICIPANTS);
    }
  };

  // 清空全部名單
  const handleClearAll = () => {
    if (confirm('⚠️ 警告：確定要清空所有名單嗎？此操作無法還原。')) {
      onUpdateParticipants([]);
      setSelectedIds(new Set());
    }
  };

  // 單筆刪除
  const handleDelete = (id: string) => {
    onUpdateParticipants(participants.filter((p) => p.id !== id));
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    }
  };

  // 啟用/停用切換
  const handleToggleEnable = (id: string) => {
    onUpdateParticipants(
      participants.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  // 權重變更
  const handleWeightChange = (id: string, weight: number) => {
    onUpdateParticipants(
      participants.map((p) => (p.id === id ? { ...p, weight: Math.max(1, Math.min(10, weight)) } : p))
    );
  };

  // 儲存編輯
  const handleSaveEdit = (id: string) => {
    onUpdateParticipants(
      participants.map((p) => (p.id === id ? { ...p, ...editForm } : p))
    );
    setEditingId(null);
    setEditForm({});
  };

  // 批次操作
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredParticipants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredParticipants.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`確定要刪除選取的 ${selectedIds.size} 筆名單嗎？`)) {
      onUpdateParticipants(participants.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    }
  };

  const handleBatchToggleEnabled = (enable: boolean) => {
    onUpdateParticipants(
      participants.map((p) => (selectedIds.has(p.id) ? { ...p, enabled: enable } : p))
    );
  };

  const handleBatchResetWinCount = () => {
    if (selectedIds.size === 0) return;
    onUpdateParticipants(
      participants.map((p) =>
        selectedIds.has(p.id) ? { ...p, winCount: 0, lastWonAt: null } : p
      )
    );
  };

  const activeCount = participants.filter((p) => p.enabled).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 頂部標題與統計摘要 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>名單管理</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                可抽籤：{activeCount} / 總人數：{participants.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              支援手動輸入、批次貼上、Excel/CSV 匯入、權重與防重複檢查
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBatchAdd(!showBatchAdd)}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>批次貼上姓名</span>
          </button>

          <button
            onClick={onOpenImportModal}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
          >
            <Upload className="h-4 w-4" />
            <span>匯入 Excel / CSV</span>
          </button>

          <button
            onClick={() => exportParticipantsToExcel(participants)}
            disabled={participants.length === 0}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>匯出名單</span>
          </button>

          <button
            onClick={handleLoadSample}
            className="inline-flex items-center space-x-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
            title="載入預設示範名單"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>載入範例</span>
          </button>
        </div>
      </div>

      {/* 重複姓名警示列 */}
      {duplicateNames.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              發現 <strong>{duplicateNames.size}</strong> 組重複姓名（例如：
              {Array.from(duplicateNames).slice(0, 3).join('、')}
              {duplicateNames.size > 3 ? '等' : ''}）
            </span>
          </div>
          <button
            onClick={handleRemoveDuplicates}
            className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700 transition"
          >
            一鍵去除重複
          </button>
        </div>
      )}

      {/* 批次貼上展開面板 */}
      {showBatchAdd && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <span>一次貼上多筆姓名</span>
            </h4>
            <button
              onClick={() => setShowBatchAdd(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600">
            請直接貼上姓名清單，支援以「換行」、「逗號 ,」、「分號 ;」或「Tab」分隔：
          </p>
          <textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder="王小明&#10;李大華&#10;張美玲&#10;陳志豪, 林書宇; 蔡佳蓉"
            rows={4}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700">預設部門（選填）：</span>
              <input
                type="text"
                value={batchDept}
                onChange={(e) => setBatchDept(e.target.value)}
                placeholder="例如：業務部"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleBatchAddSubmit}
              disabled={!batchText.trim()}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-50"
            >
              加入名單池
            </button>
          </div>
        </div>
      )}

      {/* 單筆手動新增條 */}
      <form
        onSubmit={handleSingleAdd}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm items-center"
      >
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例如：王小明"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">員工編號/學號</label>
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="EMP021 (選填)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">部門/組別</label>
          <input
            type="text"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            placeholder="研發部 (選填)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            權重 (1~10)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={newWeight}
            onChange={(e) => setNewWeight(parseInt(e.target.value) || 1)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow"
          >
            ＋ 新增參加者
          </button>
        </div>
      </form>

      {/* 搜尋與篩選列 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋姓名、編號或部門..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
            >
              <option value="ALL">全部部門 ({participants.length})</option>
              {departments.map((dept) => {
                const count = participants.filter((p) => p.department === dept).length;
                return (
                  <option key={dept} value={dept}>
                    {dept} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* 批次操作工具列 */}
        {selectedIds.size > 0 && (
          <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="font-bold text-blue-900">已選取 {selectedIds.size} 筆</span>
            <button
              onClick={() => handleBatchToggleEnabled(true)}
              className="text-blue-700 hover:underline font-semibold"
            >
              設為可抽
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => handleBatchToggleEnabled(false)}
              className="text-slate-600 hover:underline font-semibold"
            >
              設為停用
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleBatchResetWinCount}
              className="text-amber-700 hover:underline font-semibold flex items-center gap-0.5"
            >
              <RefreshCw className="h-3 w-3" /> 重設中籤
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleBatchDelete}
              className="text-red-600 hover:underline font-bold"
            >
              刪除
            </button>
          </div>
        )}

        <button
          onClick={handleClearAll}
          disabled={participants.length === 0}
          className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1 ml-auto disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>清空全部名單</span>
        </button>
      </div>

      {/* 名單資料表格 */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-800">
                    {selectedIds.size === filteredParticipants.length &&
                    filteredParticipants.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3">參加者姓名</th>
                <th className="px-4 py-3">員工編號</th>
                <th className="px-4 py-3">部門</th>
                <th className="px-4 py-3 text-center">抽籤權重 (1-10)</th>
                <th className="px-4 py-3 text-center">可參加抽籤</th>
                <th className="px-4 py-3 text-center">歷史中籤次數</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.map((p) => {
                const isEditing = editingId === p.id;
                const isSelected = selectedIds.has(p.id);
                const isDuplicate = duplicateNames.has(p.name.trim());

                if (isEditing) {
                  return (
                    <tr key={p.id} className="bg-amber-50/60">
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.name ?? p.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="rounded-lg border border-amber-300 px-2 py-1 text-xs w-28 font-bold"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.code ?? p.code}
                          onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                          className="rounded-lg border border-amber-300 px-2 py-1 text-xs w-24 font-mono"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.department ?? p.department}
                          onChange={(e) =>
                            setEditForm({ ...editForm, department: e.target.value })
                          }
                          className="rounded-lg border border-amber-300 px-2 py-1 text-xs w-28"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={editForm.weight ?? p.weight}
                          onChange={(e) =>
                            setEditForm({ ...editForm, weight: parseInt(e.target.value) || 1 })
                          }
                          className="rounded-lg border border-amber-300 px-2 py-1 text-xs w-16 text-center"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={editForm.enabled ?? p.enabled}
                          onChange={(e) =>
                            setEditForm({ ...editForm, enabled: e.target.checked })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          value={editForm.winCount ?? p.winCount}
                          onChange={(e) =>
                            setEditForm({ ...editForm, winCount: parseInt(e.target.value) || 0 })
                          }
                          className="rounded-lg border border-amber-300 px-2 py-1 text-xs w-14 text-center"
                        />
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => handleSaveEdit(p.id)}
                          className="p-1 text-emerald-600 hover:text-emerald-700"
                          title="儲存"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditForm({});
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600"
                          title="取消"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      !p.enabled ? 'bg-slate-50/80 opacity-60' : 'hover:bg-slate-50'
                    } ${isSelected ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelectOne(p.id)} className="text-slate-400">
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div className="flex items-center space-x-1.5">
                        <span>{p.name}</span>
                        {isDuplicate && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-normal">
                            重複姓名
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-500">{p.code || '-'}</td>

                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {p.department || '未分配'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <select
                        value={p.weight || 1}
                        onChange={(e) => handleWeightChange(p.id, parseInt(e.target.value))}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-center font-bold text-amber-700"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                          <option key={w} value={w}>
                            權重 {w}x
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleEnable(p.id)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                          p.enabled
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {p.enabled ? '✓ 可參加' : '✕ 已停用'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {p.winCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          🏆 {p.winCount} 次
                        </span>
                      ) : (
                        <span className="text-slate-400">0 次</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setEditingId(p.id);
                          setEditForm(p);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                        title="編輯"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
                        title="刪除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredParticipants.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">目前名單為空或無符合搜尋條件的參加者</p>
                    <p className="text-xs mt-1">您可以從上方新增姓名或匯入 Excel 檔案</p>
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

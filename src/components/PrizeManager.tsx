import React, { useState } from 'react';
import {
  Trophy,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Gift,
} from 'lucide-react';
import { Prize } from '../types';
import { DEFAULT_PRIZES } from '../utils/storage';

interface PrizeManagerProps {
  prizes: Prize[];
  onUpdatePrizes: (newPrizes: Prize[]) => void;
  onSelectPrizeForDraw: (prize: Prize) => void;
}

export const PrizeManager: React.FC<PrizeManagerProps> = ({
  prizes,
  onUpdatePrizes,
  onSelectPrizeForDraw,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Prize>>({});

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCount, setNewCount] = useState<number>(1);

  const handleAddPrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const nextOrder = prizes.length > 0 ? Math.max(...prizes.map((p) => p.order)) + 1 : 1;
    const newPrize: Prize = {
      id: `prz-${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim(),
      count: Math.max(1, newCount),
      drawnCount: 0,
      order: nextOrder,
    };

    onUpdatePrizes([...prizes, newPrize]);
    setNewName('');
    setNewDesc('');
    setNewCount(1);
  };

  const handleDeletePrize = (id: string) => {
    onUpdatePrizes(prizes.filter((p) => p.id !== id));
  };

  const handleSaveEdit = (id: string) => {
    onUpdatePrizes(
      prizes.map((p) => (p.id === id ? { ...p, ...editForm } : p))
    );
    setEditingId(null);
    setEditForm({});
  };

  const handleResetDrawn = (id: string) => {
    onUpdatePrizes(
      prizes.map((p) => (p.id === id ? { ...p, drawnCount: 0 } : p))
    );
  };

  const handleResetAllPrizes = () => {
    if (confirm('確定要重設所有獎項的中籤進度嗎？')) {
      onUpdatePrizes(prizes.map((p) => ({ ...p, drawnCount: 0 })));
    }
  };

  const handleLoadTemplate = () => {
    if (confirm('確定要載入預設尾牙獎項範本嗎？')) {
      onUpdatePrizes(DEFAULT_PRIZES);
    }
  };

  const totalPrizeQuota = prizes.reduce((sum, p) => sum + p.count, 0);
  const totalPrizeDrawn = prizes.reduce((sum, p) => sum + p.drawnCount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 頂部標題與狀態 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>獎項設定與進度</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                已抽 {totalPrizeDrawn} / 總額 {totalPrizeQuota} 名
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              設定頭獎、特獎等多階獎項，可依序流暢抽獎
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleLoadTemplate}
            className="inline-flex items-center space-x-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>載入範本獎項</span>
          </button>
          <button
            onClick={handleResetAllPrizes}
            className="inline-flex items-center space-x-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RotateCcw className="h-4 w-4 text-slate-500" />
            <span>重設抽獎進度</span>
          </button>
        </div>
      </div>

      {/* 新增獎項表單 */}
      <form
        onSubmit={handleAddPrize}
        className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm items-end"
      >
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            獎項名稱 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例如：頭獎、特獎"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            獎品內容 / 說明 (選填)
          </label>
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="例如：iPhone 16 Pro 256GB、現金禮券 NT$10,000"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-24">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              名額 (人)
            </label>
            <input
              type="number"
              min={1}
              value={newCount}
              onChange={(e) => setNewCount(parseInt(e.target.value) || 1)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 text-center font-bold"
            />
          </div>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-600 transition shadow"
          >
            ＋ 新增獎項
          </button>
        </div>
      </form>

      {/* 獎項列表卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prizes.map((prize, idx) => {
          const isEditing = editingId === prize.id;
          const isCompleted = prize.drawnCount >= prize.count;
          const remaining = Math.max(0, prize.count - prize.drawnCount);

          if (isEditing) {
            return (
              <div
                key={prize.id}
                className="bg-amber-50/70 border-2 border-amber-400 p-5 rounded-2xl shadow-sm space-y-3"
              >
                <input
                  type="text"
                  value={editForm.name ?? prize.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-bold"
                  placeholder="獎項名稱"
                />
                <input
                  type="text"
                  value={editForm.description ?? prize.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-lg border border-amber-300 px-3 py-1.5 text-xs"
                  placeholder="獎品內容"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-600">總名額：</span>
                  <input
                    type="number"
                    min={1}
                    value={editForm.count ?? prize.count}
                    onChange={(e) =>
                      setEditForm({ ...editForm, count: parseInt(e.target.value) || 1 })
                    }
                    className="w-20 rounded-lg border border-amber-300 px-2 py-1 text-xs text-center font-bold"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => handleSaveEdit(prize.id)}
                    className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-xs font-bold flex items-center gap-1"
                  >
                    <Save className="h-3.5 w-3.5" /> 儲存
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditForm({});
                    }}
                    className="rounded-lg bg-slate-200 text-slate-700 px-3 py-1 text-xs font-bold"
                  >
                    取消
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={prize.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-sm ${
                isCompleted
                  ? 'bg-slate-50 border-slate-200 opacity-80'
                  : 'bg-white border-amber-200 hover:border-amber-400 hover:shadow-md'
              }`}
            >
              {/* 序號角標 */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-900 text-xs font-black">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{prize.name}</h4>
                    {prize.description && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Gift className="h-3.5 w-3.5 text-amber-500" />
                        <span>{prize.description}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setEditingId(prize.id);
                      setEditForm(prize);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                    title="編輯"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePrize(prize.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                    title="刪除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* 進度條 */}
              <div className="my-4 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className={isCompleted ? 'text-emerald-700' : 'text-amber-800'}>
                    {isCompleted ? '✓ 已抽滿' : `剩餘名額：${remaining} 人`}
                  </span>
                  <span className="text-slate-500">
                    {prize.drawnCount} / {prize.count} 人
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (prize.drawnCount / prize.count) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* 底部操作按鈕 */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {prize.drawnCount > 0 && (
                  <button
                    onClick={() => handleResetDrawn(prize.id)}
                    className="text-[11px] text-slate-400 hover:text-amber-700 flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> 重設進度
                  </button>
                )}

                <button
                  onClick={() => onSelectPrizeForDraw(prize)}
                  disabled={isCompleted}
                  className={`ml-auto inline-flex items-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
                    isCompleted
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700'
                  }`}
                >
                  <span>{isCompleted ? '抽獎已完成' : '抽取此獎項'}</span>
                  {!isCompleted && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

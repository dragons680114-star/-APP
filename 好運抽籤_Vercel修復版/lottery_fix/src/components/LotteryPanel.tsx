import React, { useState } from 'react';
import {
  Play,
  Users,
  Trophy,
  Shuffle,
  RotateCcw,
  Sparkles,
  Maximize2,
  Layers,
  CircleDot,
  HelpCircle,
  AlertCircle,
  Gift,
  Settings2,
} from 'lucide-react';
import {
  Participant,
  Prize,
  LotteryMode,
  AnimationType,
  LotteryAlgorithm,
  LotteryConstraint,
  AppSettings,
  LotteryResult,
} from '../types';
import { executeDraw } from '../utils/lotteryEngine';
import { CountdownOverlay } from './CountdownOverlay';
import { RollingAnimation } from './animations/RollingAnimation';
import { WheelAnimation } from './animations/WheelAnimation';
import { CardFlipAnimation } from './animations/CardFlipAnimation';
import { GachaponAnimation } from './animations/GachaponAnimation';
import { WinnerModal } from './WinnerModal';
import { GroupingModal } from './GroupingModal';

interface LotteryPanelProps {
  participants: Participant[];
  remainingPool: Participant[];
  prizes: Prize[];
  settings: AppSettings;
  algorithm: LotteryAlgorithm;
  constraints: LotteryConstraint;
  onUpdateRemainingPool: (newPool: Participant[]) => void;
  onRecordResult: (result: LotteryResult, winners: Participant[]) => void;
  onUpdatePrizes: (newPrizes: Prize[]) => void;
  onEnterFullscreen: () => void;
  selectedPrize?: Prize;
  onSelectPrize: (prize?: Prize) => void;
  onReAddToPool: (winners: Participant[]) => void;
  onResetRemainingPool?: () => void;
}

export const LotteryPanel: React.FC<LotteryPanelProps> = ({
  participants,
  remainingPool,
  prizes,
  settings,
  algorithm,
  constraints,
  onUpdateRemainingPool,
  onRecordResult,
  onUpdatePrizes,
  onEnterFullscreen,
  selectedPrize,
  onSelectPrize,
  onReAddToPool,
  onResetRemainingPool,
}) => {
  const [currentMode, setCurrentMode] = useState<LotteryMode>('single');
  const [animationType, setAnimationType] = useState<AnimationType>('rolling');
  const [drawCount, setDrawCount] = useState<number>(1);

  // 抽籤狀態
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [stagedWinners, setStagedWinners] = useState<Participant[]>([]);
  const [stagedResult, setStagedResult] = useState<LotteryResult | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showGroupingModal, setShowGroupingModal] = useState(false);

  // 判斷當前有效候選池
  const activeCandidates = currentMode === 'no_repeat' ? remainingPool : participants;
  const eligibleCandidates = activeCandidates.filter((p) => {
    if (!p.enabled) return false;
    if (constraints.excludedParticipantIds?.includes(p.id)) return false;
    if (constraints.excludePreviousWinners && (p.winCount || 0) > 0) return false;
    return true;
  });

  // 模式切換時自動調節抽籤人數
  const handleModeChange = (mode: LotteryMode) => {
    setCurrentMode(mode);
    if (mode === 'single') {
      setDrawCount(1);
      onSelectPrize(undefined);
    } else if (mode === 'multiple') {
      setDrawCount(5);
      onSelectPrize(undefined);
    } else if (mode === 'no_repeat') {
      setDrawCount(1);
      onSelectPrize(undefined);
    } else if (mode === 'grouping') {
      setShowGroupingModal(true);
    } else if (mode === 'prize') {
      if (!selectedPrize && prizes.length > 0) {
        // 預設選取第一個未抽完的獎項
        const nextPrize = prizes.find((p) => p.drawnCount < p.count) || prizes[0];
        onSelectPrize(nextPrize);
        const rem = Math.max(1, nextPrize.count - nextPrize.drawnCount);
        setDrawCount(rem);
      }
    }
  };

  // 開始抽籤主流程 (演算法先於動畫執行)
  const handleStartDraw = () => {
    if (eligibleCandidates.length === 0) {
      alert('目前候選池中沒有可參加抽籤的人員！請檢查名單或重設條件。');
      return;
    }

    const actualCount = Math.min(drawCount, eligibleCandidates.length);
    if (actualCount <= 0) return;

    // 1. 執行演算法獲取中籤者
    const drawPayload = executeDraw({
      pool: activeCandidates,
      count: actualCount,
      algorithm,
      constraints,
    });

    if (drawPayload.selected.length === 0) {
      alert('無符合條件之參加者可抽出！');
      return;
    }

    // 準備中籤紀錄
    const resultObj: LotteryResult = {
      id: `res-${Date.now()}`,
      timestamp: new Date().toISOString(),
      activityName: settings.activityName || '好運抽籤',
      mode: currentMode,
      algorithm,
      prizeName: selectedPrize?.name,
      prizeDescription: selectedPrize?.description,
      totalParticipants: eligibleCandidates.length,
      winners: drawPayload.selected,
      departmentBreakdown: {},
    };

    // 計算部門分佈
    drawPayload.selected.forEach((w) => {
      const dept = w.department || '未分配';
      resultObj.departmentBreakdown[dept] = (resultObj.departmentBreakdown[dept] || 0) + 1;
    });

    setStagedWinners(drawPayload.selected);
    setStagedResult(resultObj);

    // 更新剩餘抽籤池 (若是無放回/不重複模式)
    if (currentMode === 'no_repeat') {
      onUpdateRemainingPool(drawPayload.remainingPool);
    }

    // 若是獎項抽獎，更新該獎項已抽人數
    if (selectedPrize) {
      const updatedPrizes = prizes.map((p) =>
        p.id === selectedPrize.id
          ? { ...p, drawnCount: Math.min(p.count, p.drawnCount + drawPayload.selected.length) }
          : p
      );
      onUpdatePrizes(updatedPrizes);
    }

    // 2. 開始 3-2-1 倒數
    setIsCountingDown(true);
  };

  // 倒數結束，開始播放指定動畫
  const handleCountdownComplete = () => {
    setIsCountingDown(false);
    setIsAnimating(true);
  };

  // 動畫結束，彈出恭喜視窗並記錄結果
  const handleAnimationComplete = () => {
    setIsAnimating(false);
    if (stagedResult && stagedWinners.length > 0) {
      onRecordResult(stagedResult, stagedWinners);
      setShowWinnerModal(true);
    }
  };

  // 抽取下一個獎項快捷
  const handleNextPrizeDraw = () => {
    if (!selectedPrize) return;
    const currentIdx = prizes.findIndex((p) => p.id === selectedPrize.id);
    if (currentIdx !== -1 && currentIdx + 1 < prizes.length) {
      const nextP = prizes[currentIdx + 1];
      onSelectPrize(nextP);
      setDrawCount(Math.max(1, nextP.count - nextP.drawnCount));
      setShowWinnerModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 頂部橫幅：活動名稱、模式切換與全螢幕按鈕 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>{settings.companyName || '公平・快速・好用'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span>🎲 {settings.activityName || '好運抽籤'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            候選人數：<strong className="text-blue-600 font-bold">{eligibleCandidates.length}</strong> 人
            / 總名冊：{participants.length} 人
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onEnterFullscreen}
            className="inline-flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 px-5 py-3 text-xs font-bold text-white shadow-md hover:from-slate-800 hover:to-indigo-900 transition"
          >
            <Maximize2 className="h-4 w-4 text-amber-400" />
            <span>活動全螢幕投影模式</span>
          </button>
        </div>
      </div>

      {/* 抽籤模式切換器 (5 種模式) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { id: 'single', name: '單人抽籤', desc: '每次抽出 1 人', icon: '👤' },
          { id: 'multiple', name: '多人抽籤', desc: '自訂抽出 N 人', icon: '👥' },
          { id: 'no_repeat', name: '不重複抽籤', desc: '中籤自動移出池', icon: '🎯' },
          { id: 'grouping', name: '隨機分組', desc: '組數/人數平均分', icon: '🔀' },
          { id: 'prize', name: '獎項抽籤', desc: '依獎項名額依序抽', icon: '🏆' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => handleModeChange(m.id as LotteryMode)}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition text-center ${
              currentMode === m.id
                ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
            }`}
          >
            <span className="text-2xl mb-1">{m.icon}</span>
            <span className="text-xs font-bold">{m.name}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* 獎項選擇列 (若處於獎項抽籤模式) */}
      {currentMode === 'prize' && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-600" />
              <span>請選擇欲抽取的獎項：</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {prizes.map((p) => {
              const isSelected = selectedPrize?.id === p.id;
              const isCompleted = p.drawnCount >= p.count;
              const rem = Math.max(0, p.count - p.drawnCount);

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPrize(p);
                    setDrawCount(Math.max(1, rem));
                  }}
                  className={`p-3 rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-amber-500 bg-amber-100/80 shadow-xs'
                      : isCompleted
                      ? 'border-slate-200 bg-slate-100 opacity-60'
                      : 'border-amber-200 bg-white hover:bg-amber-50'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {isCompleted ? '✓ 已抽滿' : `剩餘名額：${rem} 人`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 主要抽籤舞台 */}
      <div className="relative rounded-3xl border-2 border-slate-200 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-8 shadow-xl text-white overflow-hidden min-h-[420px] flex flex-col items-center justify-between">
        {/* 背景微光裝飾 */}
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        {/* 動畫模式切換 Tabs */}
        <div className="z-10 flex flex-wrap items-center justify-center gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 backdrop-blur-md mb-4">
          <span className="text-[11px] font-bold text-slate-400 px-3">動畫模式：</span>
          {[
            { id: 'rolling', name: '🎰 名字滾動' },
            { id: 'wheel', name: '🎡 幸運轉盤' },
            { id: 'card_flip', name: '🎴 卡片翻牌' },
            { id: 'gachapon', name: '🎁 扭蛋模式' },
          ].map((anim) => (
            <button
              key={anim.id}
              disabled={isAnimating || isCountingDown}
              onClick={() => setAnimationType(anim.id as AnimationType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                animationType === anim.id
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {anim.name}
            </button>
          ))}
        </div>

        {/* 舞台中心動畫容器 */}
        <div className="z-10 w-full flex-1 flex items-center justify-center py-4">
          {isAnimating && stagedWinners.length > 0 ? (
            <div className="w-full flex justify-center">
              {animationType === 'rolling' && (
                <RollingAnimation
                  candidates={eligibleCandidates}
                  winners={stagedWinners}
                  durationSeconds={settings.animationDuration}
                  onFinished={handleAnimationComplete}
                />
              )}
              {animationType === 'wheel' && (
                <WheelAnimation
                  candidates={eligibleCandidates}
                  winners={stagedWinners}
                  durationSeconds={settings.animationDuration}
                  onFinished={handleAnimationComplete}
                />
              )}
              {animationType === 'card_flip' && (
                <CardFlipAnimation
                  candidates={eligibleCandidates}
                  winners={stagedWinners}
                  durationSeconds={settings.animationDuration}
                  onFinished={handleAnimationComplete}
                />
              )}
              {animationType === 'gachapon' && (
                <GachaponAnimation
                  candidates={eligibleCandidates}
                  winners={stagedWinners}
                  durationSeconds={settings.animationDuration}
                  onFinished={handleAnimationComplete}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-5xl shadow-2xl shadow-amber-400/20 border-4 border-yellow-200">
                {animationType === 'wheel'
                  ? '🎡'
                  : animationType === 'card_flip'
                  ? '🎴'
                  : animationType === 'gachapon'
                  ? '🎁'
                  : '🎰'}
              </div>

              <div>
                <h3 className="text-2xl md:text-3xl font-black text-white">
                  {selectedPrize ? `正在準備抽出【${selectedPrize.name}】` : '好運抽籤準備就緒'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  目前抽籤池內共 <strong>{eligibleCandidates.length}</strong> 位符合資格的參加者
                </p>
                {eligibleCandidates.length === 0 && onResetRemainingPool && (
                  <button
                    onClick={onResetRemainingPool}
                    className="mt-3 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>恢復所有候選名單 ({participants.length} 人)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部抽出人數設定與大型抽籤啟動按鈕 */}
        <div className="z-10 w-full max-w-xl flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          {/* 人數設定 */}
          <div className="flex items-center space-x-2 bg-slate-800/90 px-4 py-2.5 rounded-2xl border border-slate-700">
            <span className="text-xs font-bold text-slate-300">抽出人數：</span>
            <input
              type="number"
              min={1}
              max={eligibleCandidates.length || 1}
              value={drawCount}
              disabled={isAnimating || isCountingDown}
              onChange={(e) => setDrawCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 rounded-lg bg-slate-900 border border-slate-600 px-2 py-1 text-xs text-center font-black text-amber-300 focus:ring-2 focus:ring-amber-400"
            />
            <div className="flex space-x-1">
              {[1, 3, 5, 10].map((num) => (
                <button
                  key={num}
                  disabled={isAnimating || isCountingDown || num > eligibleCandidates.length}
                  onClick={() => setDrawCount(num)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    drawCount === num
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40'
                  }`}
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>

          {/* 大型開始抽籤按鈕 */}
          <button
            onClick={handleStartDraw}
            disabled={isAnimating || isCountingDown || eligibleCandidates.length === 0}
            className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-8 py-3.5 text-base font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-500 hover:to-yellow-400 active:scale-95 transition transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-5 w-5 fill-slate-950" />
            <span>開始抽籤 (抽出 {drawCount} 人)</span>
          </button>
        </div>
      </div>

      {/* 3-2-1 倒數遮罩 */}
      {isCountingDown && <CountdownOverlay onComplete={handleCountdownComplete} />}

      {/* 中籤恭喜彈窗 */}
      <WinnerModal
        result={showWinnerModal ? stagedResult : null}
        onClose={() => setShowWinnerModal(false)}
        onReAddToPool={currentMode === 'no_repeat' ? onReAddToPool : undefined}
        onDrawNextPrize={handleNextPrizeDraw}
        hasNextPrize={
          currentMode === 'prize' &&
          Boolean(
            selectedPrize &&
              prizes.findIndex((p) => p.id === selectedPrize.id) < prizes.length - 1
          )
        }
      />

      {/* 隨機分組彈窗 */}
      <GroupingModal
        isOpen={showGroupingModal}
        onClose={() => setShowGroupingModal(false)}
        participants={participants}
        activityName={settings.activityName || '好運抽籤'}
      />
    </div>
  );
};

import React, { useState } from 'react';
import {
  Minimize2,
  Volume2,
  VolumeX,
  Trophy,
  Play,
  Sparkles,
  Award,
  RefreshCw,
  Gift,
} from 'lucide-react';
import {
  Participant,
  Prize,
  LotteryMode,
  AnimationType,
  AppSettings,
  LotteryResult,
  LotteryAlgorithm,
  LotteryConstraint,
} from '../types';
import { executeDraw } from '../utils/lotteryEngine';
import { triggerWinnerConfetti } from '../utils/confetti';
import { soundManager } from '../utils/audio';
import { CountdownOverlay } from './CountdownOverlay';
import { RollingAnimation } from './animations/RollingAnimation';
import { WheelAnimation } from './animations/WheelAnimation';
import { CardFlipAnimation } from './animations/CardFlipAnimation';
import { GachaponAnimation } from './animations/GachaponAnimation';

interface FullscreenActivityViewProps {
  onExitFullscreen: () => void;
  settings: AppSettings;
  participants: Participant[];
  remainingPool: Participant[];
  prizes: Prize[];
  algorithm: LotteryAlgorithm;
  constraints: LotteryConstraint;
  initialPrize?: Prize;
  onRecordResult: (result: LotteryResult, winners: Participant[]) => void;
  onUpdateRemainingPool: (newPool: Participant[]) => void;
  onUpdatePrizes: (newPrizes: Prize[]) => void;
  onToggleSound: () => void;
}

export const FullscreenActivityView: React.FC<FullscreenActivityViewProps> = ({
  onExitFullscreen,
  settings,
  participants,
  remainingPool,
  prizes,
  algorithm,
  constraints,
  initialPrize,
  onRecordResult,
  onUpdateRemainingPool,
  onUpdatePrizes,
  onToggleSound,
}) => {
  const [currentMode, setCurrentMode] = useState<LotteryMode>(initialPrize ? 'prize' : 'single');
  const [selectedPrize, setSelectedPrize] = useState<Prize | undefined>(initialPrize);
  const [animationType, setAnimationType] = useState<AnimationType>('rolling');
  const [drawCount, setDrawCount] = useState<number>(1);

  // 抽獎流程狀態
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [stagedWinners, setStagedWinners] = useState<Participant[]>([]);
  const [currentResult, setCurrentResult] = useState<LotteryResult | null>(null);

  const activeCandidates = currentMode === 'no_repeat' ? remainingPool : participants;
  const eligibleCandidates = activeCandidates.filter((p) => {
    if (!p.enabled) return false;
    if (constraints.excludedParticipantIds?.includes(p.id)) return false;
    if (constraints.excludePreviousWinners && (p.winCount || 0) > 0) return false;
    return true;
  });

  const handleStartDraw = () => {
    if (eligibleCandidates.length === 0) {
      alert('目前抽籤池中沒有可抽取的參加者！');
      return;
    }

    const actualCount = Math.min(drawCount, eligibleCandidates.length);
    if (actualCount <= 0) return;

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

    const resultObj: LotteryResult = {
      id: `fs-res-${Date.now()}`,
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

    drawPayload.selected.forEach((w) => {
      const dept = w.department || '未分配';
      resultObj.departmentBreakdown[dept] = (resultObj.departmentBreakdown[dept] || 0) + 1;
    });

    setStagedWinners(drawPayload.selected);
    setCurrentResult(resultObj);

    if (currentMode === 'no_repeat') {
      onUpdateRemainingPool(drawPayload.remainingPool);
    }

    if (selectedPrize) {
      const updatedPrizes = prizes.map((p) =>
        p.id === selectedPrize.id
          ? { ...p, drawnCount: Math.min(p.count, p.drawnCount + drawPayload.selected.length) }
          : p
      );
      onUpdatePrizes(updatedPrizes);
    }

    setIsCountingDown(true);
  };

  const handleCountdownComplete = () => {
    setIsCountingDown(false);
    setIsAnimating(true);
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    if (currentResult && stagedWinners.length > 0) {
      onRecordResult(currentResult, stagedWinners);
      soundManager.playWinFanfare();
      triggerWinnerConfetti();
    }
  };

  const handleNextPrize = () => {
    if (!selectedPrize) return;
    const currentIdx = prizes.findIndex((p) => p.id === selectedPrize.id);
    if (currentIdx !== -1 && currentIdx + 1 < prizes.length) {
      const nextP = prizes[currentIdx + 1];
      setSelectedPrize(nextP);
      const rem = Math.max(1, nextP.count - nextP.drawnCount);
      setDrawCount(rem);
      setCurrentResult(null);
      setStagedWinners([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden p-6 md:p-10 select-none">
      {/* 頂部導覽與活動資訊 */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-2xl shadow-lg border border-yellow-200">
            🎲
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-amber-300">
              {settings.activityName || '好運抽籤年終盛典'}
            </h1>
            <p className="text-xs text-slate-400">
              {settings.companyName || '活動全螢幕投影模式'}・候選池：
              <strong className="text-amber-400 font-bold">{eligibleCandidates.length}</strong> 人
            </p>
          </div>
        </div>

        {/* 右上角快捷工具 */}
        <div className="flex items-center space-x-3">
          {/* 動畫模式快速切換 */}
          <div className="hidden lg:flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            {[
              { id: 'rolling', label: '🎰 滾動' },
              { id: 'wheel', label: '🎡 轉盤' },
              { id: 'card_flip', label: '🎴 翻牌' },
              { id: 'gachapon', label: '🎁 扭蛋' },
            ].map((a) => (
              <button
                key={a.id}
                disabled={isAnimating || isCountingDown}
                onClick={() => setAnimationType(a.id as AnimationType)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  animationType === a.id ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleSound}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10"
            title={settings.soundEnabled ? '音效已開啟' : '靜音中'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <VolumeX className="h-5 w-5 text-slate-400" />
            )}
          </button>

          <button
            onClick={onExitFullscreen}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/10 active:scale-95"
          >
            <Minimize2 className="h-4 w-4" />
            <span>退出全螢幕</span>
          </button>
        </div>
      </div>

      {/* 中間主要展示與動畫區 */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 relative">
        {/* 當前獎項標籤 (若有) */}
        {selectedPrize && (
          <div className="mb-4 inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 px-6 py-2 rounded-full font-black text-lg shadow-xl border-2 border-yellow-200">
            <Trophy className="h-5 w-5" />
            <span>【{selectedPrize.name}】</span>
            {selectedPrize.description && (
              <span className="text-xs text-slate-900/80 font-normal">
                - {selectedPrize.description}
              </span>
            )}
          </div>
        )}

        {/* 抽籤中：顯示動畫 */}
        {isAnimating && stagedWinners.length > 0 ? (
          <div className="w-full flex items-center justify-center">
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
        ) : currentResult && !isAnimating ? (
          /* 抽籤完成：大型得獎喜報卡片 */
          <div className="flex flex-col items-center justify-center max-w-5xl w-full text-center space-y-6 animate-fadeIn">
            <div className="inline-flex items-center space-x-2 bg-amber-400/20 text-amber-300 border border-amber-400/40 px-6 py-2 rounded-full text-base font-black tracking-widest uppercase shadow-lg">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span>🎉 恭喜中籤幸運得主 🎉</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-h-[52vh] overflow-y-auto p-4">
              {currentResult.winners.map((w, idx) => (
                <div
                  key={w.id}
                  className="bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 border-2 border-amber-400/90 rounded-3xl p-6 shadow-2xl flex flex-col items-center transform hover:scale-105 transition"
                >
                  <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg mb-3 border-2 border-white">
                    {idx + 1}
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-wide mb-1">
                    {w.name}
                  </h3>
                  <p className="text-sm font-semibold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/30">
                    {w.department || '一般參與者'}
                  </p>
                  {w.code && (
                    <span className="text-xs text-slate-400 font-mono mt-2">{w.code}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 待機準備狀態 */
          <div className="flex flex-col items-center justify-center space-y-5 text-center">
            <div className="h-28 w-28 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-6xl shadow-2xl shadow-amber-400/30 animate-bounce border-4 border-yellow-100">
              🎲
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              準備就緒・好運降臨
            </h2>
            <p className="text-slate-300 text-base max-w-md">
              點選抽出人數或獎項，點擊下方「開始抽籤」即可展開盛典！
            </p>
          </div>
        )}
      </div>

      {/* 底部控制列 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
        {/* 人數設定 */}
        <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
          <span className="text-xs font-bold text-slate-300">抽出人數：</span>
          <div className="flex space-x-1">
            {[1, 3, 5, 10].map((num) => (
              <button
                key={num}
                disabled={isAnimating || isCountingDown || num > eligibleCandidates.length}
                onClick={() => setDrawCount(num)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                  drawCount === num
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20 disabled:opacity-40'
                }`}
              >
                +{num}
              </button>
            ))}
          </div>
        </div>

        {/* 啟動按鈕 */}
        <div className="flex items-center space-x-4">
          {currentResult && selectedPrize && (
            <button
              onClick={handleNextPrize}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3.5 rounded-2xl font-bold text-sm border border-white/20 transition"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>抽下一個獎項</span>
            </button>
          )}

          {!isAnimating ? (
            <button
              onClick={handleStartDraw}
              disabled={eligibleCandidates.length === 0 || isCountingDown}
              className="flex items-center space-x-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 px-12 py-4 rounded-2xl font-black text-2xl shadow-2xl shadow-amber-500/40 hover:scale-105 active:scale-95 transition transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-7 w-7 fill-slate-950" />
              <span>{currentResult ? '再抽一輪' : `🎲 開始抽籤 (抽出 ${drawCount} 人)`}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-amber-300 font-black text-xl animate-pulse">
              <Sparkles className="h-6 w-6" />
              <span>開獎中，請屏息以待...</span>
            </div>
          )}
        </div>
      </div>

      {/* 3-2-1 倒數遮罩 */}
      {isCountingDown && <CountdownOverlay onComplete={handleCountdownComplete} />}
    </div>
  );
};

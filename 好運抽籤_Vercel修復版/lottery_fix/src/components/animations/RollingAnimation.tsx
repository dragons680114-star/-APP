import React, { useEffect, useState, useRef } from 'react';
import { Participant } from '../../types';
import { soundManager } from '../../utils/audio';

interface RollingAnimationProps {
  candidates: Participant[];
  winners: Participant[];
  durationSeconds?: number;
  onFinished: () => void;
}

export const RollingAnimation: React.FC<RollingAnimationProps> = ({
  candidates,
  winners,
  durationSeconds = 3.5,
  onFinished,
}) => {
  const [displayedNames, setDisplayedNames] = useState<string[]>([]);
  const [isDecelerating, setIsDecelerating] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  // 如果是一次抽多人，展示多滾輪或主滾輪
  const winnerCount = winners.length;
  const isMultiple = winnerCount > 1;

  useEffect(() => {
    if (candidates.length === 0 || winners.length === 0) {
      onFinishedRef.current();
      return;
    }

    const startTime = Date.now();
    const totalDurationMs = Math.max(1500, durationSeconds * 1000);
    let lastTickTime = 0;
    let currentInterval = 40; // 起始切換速度 (ms)

    const updateRolling = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDurationMs);

      // 當進度超過 60% 時開始減速
      if (progress > 0.6) {
        setIsDecelerating(true);
        // 指數級減速
        const easeOut = Math.pow(progress, 3);
        currentInterval = 40 + easeOut * 280;
      }

      if (now - lastTickTime >= currentInterval) {
        lastTickTime = now;

        if (progress < 0.95) {
          // 隨機選取名字播放
          if (isMultiple) {
            const randomSample = Array.from({ length: Math.min(winnerCount, 4) }, () => {
              const r = candidates[Math.floor(Math.random() * candidates.length)];
              return `${r.name} (${r.department || '未分配'})`;
            });
            setDisplayedNames(randomSample);
          } else {
            const r = candidates[Math.floor(Math.random() * candidates.length)];
            setDisplayedNames([`${r.name} (${r.department || '未分配'})`]);
          }
          soundManager.playTick(1 + progress * 0.5);
        } else {
          // 最終停在指定中籤者
          const finalNames = winners.slice(0, 4).map((w) => `${w.name} (${w.department || '未分配'})`);
          setDisplayedNames(finalNames);
        }
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateRolling);
      } else {
        // 完成
        setTimeout(() => {
          onFinishedRef.current();
        }, 400);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateRolling);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [candidates, winners, durationSeconds, isMultiple, winnerCount]);

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full max-w-2xl mx-auto">
      <div className="relative w-full rounded-2xl border-4 border-amber-400/60 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 p-8 shadow-2xl shadow-amber-500/20 overflow-hidden">
        {/* 光影飾條 */}
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 animate-pulse" />

        <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-sm font-semibold tracking-wider text-amber-300">
              {isDecelerating ? '⚡ 正在鎖定幸運得主...' : '🎲 正在高速隨機抽選中...'}
            </span>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            候選池：{candidates.length} 人
          </span>
        </div>

        {/* 名字滾動展示區 */}
        <div className="flex flex-col items-center justify-center min-h-[160px] py-4 space-y-3">
          {displayedNames.map((nameStr, idx) => (
            <div
              key={idx}
              className={`w-full text-center py-3 px-6 rounded-xl font-black transition-all transform ${
                isDecelerating
                  ? 'bg-amber-500/20 text-amber-300 text-3xl md:text-4xl border border-amber-400/40 scale-105 shadow-lg'
                  : 'bg-slate-800/80 text-white text-2xl md:text-3xl border border-slate-700'
              }`}
            >
              {nameStr}
            </div>
          ))}
          {displayedNames.length === 0 && (
            <div className="text-2xl text-slate-400 font-bold animate-pulse">準備開獎...</div>
          )}
        </div>

        {/* 底部進度條 */}
        <div className="mt-4 w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-yellow-300 transition-all"
            style={{
              animation: `growWidth ${durationSeconds}s linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

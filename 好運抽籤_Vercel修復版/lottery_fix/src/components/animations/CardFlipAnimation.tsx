import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Participant } from '../../types';
import { soundManager } from '../../utils/audio';

interface CardFlipAnimationProps {
  candidates: Participant[];
  winners: Participant[];
  durationSeconds?: number;
  onFinished: () => void;
}

export const CardFlipAnimation: React.FC<CardFlipAnimationProps> = ({
  winners,
  durationSeconds = 3.5,
  onFinished,
}) => {
  const [phase, setPhase] = useState<'shuffling' | 'revealing' | 'done'>('shuffling');
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    // Phase 1: Shuffling
    const shuffleTimer = setTimeout(() => {
      setPhase('revealing');
      soundManager.playCardFlip();
    }, 1400);

    // Phase 2: Stagger reveal cards
    const stepDuration = Math.max(300, Math.min(800, 1200 / (winners.length || 1)));
    const intervals: NodeJS.Timeout[] = [];

    winners.forEach((_, idx) => {
      const t = setTimeout(() => {
        setRevealedCount(idx + 1);
        soundManager.playCardFlip();
      }, 1400 + idx * stepDuration);
      intervals.push(t);
    });

    // Final finish timer
    const totalMs = Math.max(durationSeconds * 1000, 1400 + winners.length * stepDuration + 600);
    const finishTimer = setTimeout(() => {
      setPhase('done');
      onFinishedRef.current();
    }, totalMs);

    return () => {
      clearTimeout(shuffleTimer);
      intervals.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
  }, [winners, durationSeconds]);

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-amber-300">
          {phase === 'shuffling' ? '🎴 命運洗牌中...' : '✨ 揭曉幸運中籤卡片！'}
        </h3>
        <p className="text-xs text-slate-400 mt-1">洗牌完畢後逐一翻牌揭曉</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-center items-center w-full min-h-[260px]">
        {winners.map((winner, idx) => {
          const isFlipped = revealedCount > idx;

          return (
            <div
              key={winner.id}
              className="relative h-56 w-44 mx-auto perspective-1000 cursor-pointer"
            >
              <motion.div
                className="w-full h-full relative rounded-2xl shadow-xl transition-all duration-700"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
                animate={
                  phase === 'shuffling'
                    ? {
                        rotateZ: [(idx % 2 === 0 ? -10 : 10), 0, (idx % 2 === 0 ? 10 : -10), 0],
                        scale: [0.95, 1.05, 0.95],
                      }
                    : {}
                }
                transition={{
                  repeat: phase === 'shuffling' ? Infinity : 0,
                  duration: 0.6,
                }}
              >
                {/* 卡片背面 (尚未翻開) */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 border-2 border-amber-400 flex flex-col items-center justify-center p-4 shadow-lg"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="h-16 w-16 rounded-full border-2 border-amber-400/80 bg-amber-500/20 flex items-center justify-center text-3xl shadow-inner mb-3">
                    🎲
                  </div>
                  <span className="text-xs font-black tracking-widest text-amber-300">好運抽籤</span>
                  <span className="text-[10px] text-purple-200/60 mt-1">LUCKY CARD</span>
                </div>

                {/* 卡片正面 (翻開後的中籤者) */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-amber-50 via-white to-amber-100 border-3 border-amber-500 flex flex-col items-center justify-between p-4 shadow-2xl"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="flex justify-between w-full items-center text-amber-600 text-xs font-bold">
                    <span>🎉 幸運星</span>
                    <span>#{idx + 1}</span>
                  </div>

                  <div className="flex flex-col items-center my-auto">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 border-2 border-amber-500 flex items-center justify-center text-2xl font-black text-slate-800 shadow-md mb-2">
                      {winner.name.charAt(0)}
                    </div>
                    <h4 className="text-xl font-black text-slate-900 tracking-wide">{winner.name}</h4>
                    <span className="text-xs font-medium text-slate-600 mt-1 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
                      {winner.department || '未分配'}
                    </span>
                    {winner.code && (
                      <span className="text-[10px] text-slate-400 mt-0.5">{winner.code}</span>
                    )}
                  </div>

                  <div className="w-full text-center py-1 bg-amber-500 rounded-lg text-white font-bold text-xs tracking-wider">
                    CONGRATS!
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

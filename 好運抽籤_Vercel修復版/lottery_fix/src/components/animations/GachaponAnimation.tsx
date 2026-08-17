import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Participant } from '../../types';
import { soundManager } from '../../utils/audio';

interface GachaponAnimationProps {
  candidates: Participant[];
  winners: Participant[];
  durationSeconds?: number;
  onFinished: () => void;
}

const BALL_COLORS = [
  'from-red-500 to-pink-500',
  'from-blue-500 to-cyan-400',
  'from-amber-400 to-yellow-300',
  'from-emerald-400 to-teal-500',
  'from-purple-500 to-indigo-500',
];

export const GachaponAnimation: React.FC<GachaponAnimationProps> = ({
  winners,
  durationSeconds = 4.0,
  onFinished,
}) => {
  const [stage, setStage] = useState<'shaking' | 'dropping' | 'opened' | 'done'>('shaking');
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    // 1. Shaking machine & turning handle
    soundManager.playGachaponRattle();

    const dropTimer = setTimeout(() => {
      setStage('dropping');
      soundManager.playGachaponRattle();
    }, 1400);

    const openTimer = setTimeout(() => {
      setStage('opened');
      soundManager.playCardFlip();
    }, 2400);

    const finishTimer = setTimeout(() => {
      setStage('done');
      onFinishedRef.current();
    }, Math.max(durationSeconds * 1000, 3600));

    return () => {
      clearTimeout(dropTimer);
      clearTimeout(openTimer);
      clearTimeout(finishTimer);
    };
  }, [durationSeconds]);

  const primaryWinner = winners[0];

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full max-w-lg mx-auto">
      {/* 扭蛋機頂部玻璃球 */}
      <div className="relative w-64 h-64 rounded-full border-4 border-amber-400 bg-slate-900/80 backdrop-blur-md shadow-2xl flex items-center justify-center overflow-hidden">
        {/* 玻璃反光 */}
        <div className="absolute top-4 left-6 w-20 h-10 rounded-full bg-white/20 transform -rotate-45 pointer-events-none" />

        {/* 扭蛋機內翻滾的彩球 */}
        <div className="relative w-48 h-48 flex flex-wrap items-center justify-center gap-2 p-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.div
              key={i}
              className={`w-9 h-9 rounded-full bg-gradient-to-tr ${BALL_COLORS[i % BALL_COLORS.length]} border-2 border-white/60 shadow-md`}
              animate={
                stage === 'shaking'
                  ? {
                      x: [Math.sin(i) * 12, Math.cos(i) * -12, Math.sin(i) * 8],
                      y: [Math.cos(i) * 12, Math.sin(i) * -12, Math.cos(i) * 8],
                      rotate: [0, 180, 360],
                    }
                  : {}
              }
              transition={{
                repeat: stage === 'shaking' ? Infinity : 0,
                duration: 0.35 + (i % 4) * 0.1,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>

      {/* 扭蛋機身與把手 */}
      <div className="relative -mt-4 w-52 bg-gradient-to-b from-red-600 to-red-800 rounded-2xl border-4 border-amber-400 p-4 flex flex-col items-center shadow-xl z-10">
        {/* 旋轉把手 */}
        <motion.div
          className="w-14 h-14 rounded-full bg-amber-400 border-4 border-amber-200 flex items-center justify-center shadow-lg"
          animate={stage === 'shaking' ? { rotate: [0, 360, 720] } : { rotate: 720 }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        >
          <div className="w-10 h-3 bg-red-900 rounded-full" />
        </motion.div>

        {/* 出口 */}
        <div className="mt-3 w-28 h-12 bg-slate-950 rounded-lg border-2 border-amber-300/60 flex items-center justify-center relative overflow-hidden">
          <span className="text-[10px] text-amber-200/60 tracking-wider">扭蛋出口</span>
        </div>
      </div>

      {/* 掉落與彈出展開的扭蛋 */}
      <div className="min-h-[140px] flex items-center justify-center mt-4">
        <AnimatePresence>
          {stage === 'dropping' && (
            <motion.div
              initial={{ y: -40, scale: 0.5, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1, rotate: [0, 180, 360] }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 border-4 border-amber-500 shadow-2xl flex items-center justify-center text-2xl font-bold"
            >
              🎁
            </motion.div>
          )}

          {(stage === 'opened' || stage === 'done') && primaryWinner && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="flex flex-col items-center rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 p-1 shadow-2xl"
            >
              <div className="bg-slate-900 rounded-xl px-8 py-4 text-center border border-amber-300">
                <span className="text-xs font-bold text-amber-400 tracking-widest block mb-1">
                  ✨ 扭蛋開出幸運兒 ✨
                </span>
                <h3 className="text-3xl font-black text-white">{primaryWinner.name}</h3>
                <p className="text-sm text-amber-200 mt-1">
                  {primaryWinner.department || '未分配'} {primaryWinner.code ? `(${primaryWinner.code})` : ''}
                </p>
                {winners.length > 1 && (
                  <p className="text-xs text-slate-400 mt-2">
                    及其他 {winners.length - 1} 位中籤者...
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

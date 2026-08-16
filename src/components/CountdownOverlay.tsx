import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../utils/audio';
import { FastForward } from 'lucide-react';

interface CountdownOverlayProps {
  onComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(3);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    soundManager.playCountdownTick(3);

    const timer1 = setTimeout(() => {
      setStep(2);
      soundManager.playCountdownTick(2);
    }, 700);

    const timer2 = setTimeout(() => {
      setStep(1);
      soundManager.playCountdownTick(1);
    }, 1400);

    const timer3 = setTimeout(() => {
      setStep(0); // 0 = "開始！"
      soundManager.playStartSound();
    }, 2100);

    const timer4 = setTimeout(() => {
      onCompleteRef.current();
    }, 2600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="flex flex-col items-center justify-center"
        >
          {step > 0 ? (
            <div className="flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-7xl sm:text-8xl font-black text-slate-950 shadow-2xl shadow-amber-500/40 border-4 border-yellow-100">
              {step}
            </div>
          ) : (
            <div className="rounded-3xl bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 px-10 py-5 sm:px-12 sm:py-6 text-5xl sm:text-7xl font-black tracking-wider text-white shadow-2xl shadow-red-500/50 border-4 border-yellow-200 animate-pulse">
              🚀 開始！
            </div>
          )}
          <p className="mt-6 text-base sm:text-lg font-medium text-amber-200/90 tracking-widest">
            正在抽取好運幸運兒...
          </p>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={() => onCompleteRef.current()}
        className="mt-8 inline-flex items-center space-x-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/20 hover:text-white transition border border-white/15"
      >
        <FastForward className="h-3.5 w-3.5" />
        <span>跳過倒數直接揭曉</span>
      </button>
    </div>
  );
};

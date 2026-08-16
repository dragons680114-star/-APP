import React, { useEffect, useRef } from 'react';
import { Participant } from '../../types';
import { soundManager } from '../../utils/audio';

interface WheelAnimationProps {
  candidates: Participant[];
  winners: Participant[];
  durationSeconds?: number;
  onFinished: () => void;
}

const SLICE_COLORS = [
  '#f87171', // soft red
  '#fb923c', // orange
  '#fbbf24', // amber
  '#a3e635', // lime
  '#34d399', // emerald
  '#38bdf8', // sky
  '#818cf8', // indigo
  '#c084fc', // purple
  '#f472b6', // pink
  '#60a5fa', // blue
];

export const WheelAnimation: React.FC<WheelAnimationProps> = ({
  candidates,
  winners,
  durationSeconds = 4.0,
  onFinished,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  // 若名單太多，轉盤可精簡取前 36 人加中籤者以維持可讀性
  const primaryWinner = winners[0];
  const displayItems = React.useMemo(() => {
    if (candidates.length <= 36) {
      return candidates;
    }
    // 確保中籤者在轉盤中
    const others = candidates.filter((c) => c.id !== primaryWinner?.id).slice(0, 31);
    return [primaryWinner, ...others].filter(Boolean);
  }, [candidates, primaryWinner]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayItems.length === 0 || !primaryWinner) {
      onFinishedRef.current();
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 支援 Retina 螢幕清晰度
    const dpr = window.devicePixelRatio || 1;
    const size = 360;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const numSlices = displayItems.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    // 找出目標中籤者在 displayItems 的 index
    let targetIndex = displayItems.findIndex((item) => item.id === primaryWinner.id);
    if (targetIndex === -1) targetIndex = 0;

    // 指針在正右方 (0 rad / 360 deg)
    // 為了讓指針指到 targetIndex，轉盤停止時的角度為:
    // targetCenterAngle = targetIndex * sliceAngle + sliceAngle / 2
    // 轉盤旋轉角度 rotation + targetCenterAngle 應對齊 0 (即 2 * PI * N - targetCenterAngle)
    const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
    const fullSpins = 5; // 旋轉圈數
    const finalRotation = fullSpins * 2 * Math.PI + (2 * Math.PI - targetSliceCenter);

    let startRotation = 0;
    const startTime = Date.now();
    const durationMs = durationSeconds * 1000;
    let animationId: number;
    let lastSliceCrossed = -1;

    // Ease-out cubic: 1 - Math.pow(1 - progress, 3)
    const drawWheel = (currentAngle: number) => {
      ctx.clearRect(0, 0, size, size);
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 12;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(currentAngle);

      // 繪製扇形
      for (let i = 0; i < numSlices; i++) {
        const item = displayItems[i];
        const startA = i * sliceAngle;
        const endA = startA + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startA, endA);
        ctx.closePath();

        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 繪製文字
        ctx.save();
        ctx.rotate(startA + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#1e293b';
        ctx.font = numSlices > 20 ? 'bold 10px sans-serif' : 'bold 13px sans-serif';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 3;

        // 文字截斷防溢出
        const maxLen = numSlices > 20 ? 4 : 7;
        const nameText = item.name.length > maxLen ? item.name.slice(0, maxLen) + '..' : item.name;
        ctx.fillText(nameText, radius - 16, 4);
        ctx.restore();
      }

      ctx.restore();

      // 繪製轉盤外框裝飾
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.stroke();

      // 中心圓軸
      ctx.beginPath();
      ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 中心文字
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('好運', centerX, centerY - 6);
      ctx.fillText('抽籤', centerX, centerY + 8);

      // 右側指針 (尖端指向圓心)
      const pointerSize = 18;
      ctx.beginPath();
      ctx.moveTo(centerX + radius + 4, centerY);
      ctx.lineTo(centerX + radius - pointerSize, centerY - 12);
      ctx.lineTo(centerX + radius - pointerSize, centerY + 12);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Ease out quartic
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const currentAngle = startRotation + finalRotation * easeOut;

      // 檢查是否跨過扇形播放滴答聲
      const currentSlice = Math.floor((currentAngle / sliceAngle) % numSlices);
      if (currentSlice !== lastSliceCrossed) {
        lastSliceCrossed = currentSlice;
        soundManager.playTick(0.9 + (1 - progress) * 0.4);
      }

      drawWheel(currentAngle);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          onFinishedRef.current();
        }, 500);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [displayItems, primaryWinner, durationSeconds]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center rounded-3xl bg-slate-900/90 p-6 shadow-2xl border-4 border-amber-400/40">
        <canvas
          ref={canvasRef}
          style={{ width: 360, height: 360 }}
          className="max-w-full rounded-full shadow-inner"
        />
      </div>
      <p className="mt-4 text-sm font-semibold tracking-wider text-amber-300 animate-pulse">
        🎡 幸運轉盤高速旋轉中...
      </p>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Copy,
  Download,
  QrCode,
  RotateCcw,
  Check,
  Sparkles,
  Share2,
  X,
} from 'lucide-react';
import { LotteryResult, Participant } from '../types';
import { soundManager } from '../utils/audio';
import { triggerWinnerConfetti } from '../utils/confetti';
import { exportWinnersToExcel, exportElementAsPNG, formatWinnersAsText } from '../utils/export';

interface WinnerModalProps {
  result: LotteryResult | null;
  onClose: () => void;
  onReAddToPool?: (winners: Participant[]) => void;
  onDrawNextPrize?: () => void;
  hasNextPrize?: boolean;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  result,
  onClose,
  onReAddToPool,
  onDrawNextPrize,
  hasNextPrize = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const certificateRef = useRef<HTMLDivElement | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);

  useEffect(() => {
    if (result) {
      soundManager.playWinFanfare();
      triggerWinnerConfetti();
    }
  }, [result]);

  if (!result) return null;

  const handleCopyText = async () => {
    const text = formatWinnersAsText(result);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleExportPNG = async () => {
    if (!certificateRef.current) return;
    setIsExportingImage(true);
    try {
      const filename = `中籤喜報_${result.prizeName || '隨機抽籤'}_${new Date().toISOString().slice(0, 10)}.png`;
      await exportElementAsPNG(certificateRef.current, filename);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportExcel = () => {
    exportWinnersToExcel(result);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-amber-200 text-slate-800 my-8"
        >
          {/* 頂部喜慶標頭 */}
          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 px-6 py-5 text-center text-slate-900 relative">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-slate-900/10 p-1.5 hover:bg-slate-900/20 text-slate-800 transition"
              title="關閉"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="inline-flex items-center space-x-2 rounded-full bg-white/40 px-3 py-1 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>中籤名單揭曉</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight flex items-center justify-center gap-2">
              <span>🎉 恭喜中籤！</span>
            </h2>
            {result.prizeName && (
              <div className="mt-2 inline-flex items-center space-x-2 rounded-xl bg-slate-900 px-4 py-1.5 text-amber-300 font-bold text-base shadow-sm">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>{result.prizeName}</span>
                {result.prizeDescription && (
                  <span className="text-xs text-slate-300 font-normal">
                    ({result.prizeDescription})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 可擷取為圖片的中籤卡片區塊 */}
          <div className="p-6">
            <div
              ref={certificateRef}
              className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 p-6 shadow-sm relative overflow-hidden"
            >
              {/* 背景水印 */}
              <div className="absolute right-4 bottom-2 text-8xl opacity-5 select-none pointer-events-none font-black text-amber-900">
                LUCKY
              </div>

              <div className="flex justify-between items-center border-b border-amber-200/80 pb-3 mb-4 text-xs font-semibold text-slate-600">
                <span>活動：{result.activityName}</span>
                <span>時間：{new Date(result.timestamp).toLocaleString('zh-TW')}</span>
              </div>

              {/* 中籤名單列表 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {result.winners.map((winner, idx) => (
                  <div
                    key={winner.id}
                    className="flex items-center space-x-3 rounded-xl bg-white p-3 border border-amber-200/90 shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 text-slate-900 font-black text-lg shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-base font-black text-slate-900 truncate">
                          {winner.name}
                        </p>
                        {winner.code && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {winner.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-amber-800 font-medium">
                        {winner.department || '一般參與者'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 卡片底端註記 */}
              <div className="mt-4 pt-3 border-t border-amber-200/60 flex justify-between items-center text-[11px] text-slate-600">
                <span>共抽出 {result.winners.length} 人（候選池 {result.totalParticipants} 人）</span>
                <span className="font-semibold text-amber-800">🎲 好運抽籤 公平公正</span>
              </div>
            </div>

            {/* QR Code 展開區 */}
            {showQRCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center"
              >
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                  <QRCodeSVG
                    value={formatWinnersAsText(result)}
                    size={160}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-2 font-medium">
                  📱 手機掃描 QR Code 即可直接查看/存取中籤名單純文字
                </p>
              </motion.div>
            )}

            {/* 快捷工具操作列 */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={handleCopyText}
                className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700">已複製！</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-500" />
                    <span>複製結果</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExportPNG}
                disabled={isExportingImage}
                className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                <Download className="h-4 w-4 text-slate-500" />
                <span>{isExportingImage ? '產生圖片中...' : '下載喜報PNG'}</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <Share2 className="h-4 w-4 text-slate-500" />
                <span>匯出 Excel</span>
              </button>

              <button
                onClick={() => setShowQRCode(!showQRCode)}
                className={`flex items-center justify-center space-x-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                  showQRCode
                    ? 'border-amber-400 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <QrCode className="h-4 w-4 text-slate-500" />
                <span>{showQRCode ? '收合條碼' : 'QR Code'}</span>
              </button>
            </div>
          </div>

          {/* 底部按鈕列 */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            {onReAddToPool && (
              <button
                onClick={() => {
                  onReAddToPool(result.winners);
                  onClose();
                }}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>將中籤者重新加回抽籤池</span>
              </button>
            )}

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              {hasNextPrize && onDrawNextPrize && (
                <button
                  onClick={() => {
                    onClose();
                    onDrawNextPrize();
                  }}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700 transition"
                >
                  🏆 抽取下一獎項
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                完成
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

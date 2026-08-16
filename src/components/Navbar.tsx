import React from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  ShieldCheck,
  Sparkles,
  Lock,
  KeyRound,
} from 'lucide-react';
import { AppSettings } from '../types';
import { soundManager } from '../utils/audio';

interface NavbarProps {
  settings: AppSettings;
  isAdmin: boolean;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onEnterFullscreen: () => void;
  onOpenAdminAuth: () => void;
  eligibleCount?: number;
  totalCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  isAdmin,
  onUpdateSettings,
  onEnterFullscreen,
  onOpenAdminAuth,
  eligibleCount,
  totalCount,
}) => {
  const toggleSound = () => {
    const nextState = !settings.soundEnabled;
    soundManager.setMuted(!nextState);
    onUpdateSettings({ ...settings, soundEnabled: nextState });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* 活動標題與標籤 */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center space-x-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 text-lg">
              🎲
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                  {settings.companyName || '企業公平管理平台'}
                </span>
                {settings.isActivityLocked && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0.2 rounded font-bold">
                    <Lock className="h-2.5 w-2.5" /> 規則已鎖定
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate max-w-xs md:max-w-md">
                {settings.activityName || '好運抽籤與公平輪值'}
              </h2>
            </div>
          </div>
        </div>

        {/* 右側資訊與功能按鈕 */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {eligibleCount !== undefined && totalCount !== undefined && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                可抽人數 / 總人數
              </p>
              <p className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
                {eligibleCount} <span className="text-slate-400 font-normal">/</span> {totalCount}
              </p>
            </div>
          )}

          <div className="hidden sm:block h-7 w-[1px] bg-slate-200 dark:bg-slate-800" />

          {/* 管理者模式切換徽章 */}
          <button
            onClick={onOpenAdminAuth}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              isAdmin
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:border-amber-400'
            }`}
            title={isAdmin ? '已取得管理者權限' : '點擊切換管理者模式'}
          >
            {isAdmin ? (
              <>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">管理者模式</span>
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4 text-slate-400" />
                <span className="hidden sm:inline">解鎖管理員</span>
              </>
            )}
          </button>

          {/* 音效開關 */}
          <button
            onClick={toggleSound}
            className={`inline-flex items-center space-x-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              settings.soundEnabled
                ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900'
            }`}
            title={settings.soundEnabled ? '音效已開啟' : '靜音中'}
          >
            {settings.soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-amber-500" />
                <span className="hidden md:inline">音效開</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-slate-400" />
                <span className="hidden md:inline">靜音</span>
              </>
            )}
          </button>

          {/* 活動全螢幕投影 */}
          <button
            onClick={onEnterFullscreen}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 px-4 py-2 text-xs font-black hover:bg-slate-800 dark:hover:bg-amber-400 active:scale-95 transition shadow-sm"
          >
            <Maximize2 className="h-3.5 w-3.5 text-amber-400 dark:text-slate-950" />
            <span>全螢幕投影</span>
          </button>
        </div>
      </div>
    </header>
  );
};

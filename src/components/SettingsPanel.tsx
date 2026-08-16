import React from 'react';
import {
  Settings,
  Palette,
  Volume2,
  VolumeX,
  Sparkles,
  Shield,
  RotateCcw,
  Building2,
  Save,
} from 'lucide-react';
import { AppSettings, ThemeColor, BackgroundTheme } from '../types';
import { soundManager } from '../utils/audio';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetAllData: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onResetAllData,
}) => {
  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);

    if (key === 'soundEnabled') {
      soundManager.setMuted(!value);
    }
    if (key === 'volume') {
      soundManager.setVolume(value as number);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 頂部標題 */}
      <div className="flex items-center space-x-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-white shadow-md">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">系統與品牌自訂</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            自訂活動名稱、公司品牌配色、背景氛圍與音效設定
          </p>
        </div>
      </div>

      {/* 品牌自訂 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="h-4 w-4 text-blue-600" />
          <span>品牌與活動資訊</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">活動名稱</label>
            <input
              type="text"
              value={settings.activityName}
              onChange={(e) => handleChange('activityName', e.target.value)}
              placeholder="例如：2026 數位科技年終尾牙盛典"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">公司/主辦單位名稱</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="例如：數位科技股份有限公司"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              公司 Logo 圖檔網址 (選填)
            </label>
            <input
              type="text"
              value={settings.logoUrl}
              onChange={(e) => handleChange('logoUrl', e.target.value)}
              placeholder="例如：https://example.com/logo.png"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 主題與視覺風格 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Palette className="h-4 w-4 text-amber-500" />
          <span>主題配色與背景</span>
        </h3>

        {/* 主題色選取 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">主色調</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { id: 'blue_gold', name: '經典藍金', desc: '專業商務', color: 'bg-blue-600 border-amber-400' },
              { id: 'red_gold', name: '喜慶紅金', desc: '尾牙春酒', color: 'bg-red-600 border-yellow-400' },
              { id: 'black_gold', name: '尊爵黑金', desc: '極致奢華', color: 'bg-slate-950 border-amber-500' },
              { id: 'emerald', name: '科技翡翠', desc: '清新現代', color: 'bg-emerald-600 border-teal-300' },
              { id: 'purple_amber', name: '活力紫金', desc: '動感狂歡', color: 'bg-purple-600 border-amber-400' },
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleChange('themeColor', theme.id as ThemeColor)}
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition text-center ${
                  settings.themeColor === theme.id
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`h-7 w-7 rounded-full ${theme.color} border-2 shadow mb-1.5`} />
                <span className="text-xs font-bold text-slate-800">{theme.name}</span>
                <span className="text-[10px] text-slate-400">{theme.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 背景風格 */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-2">背景主題</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'clean_white', name: '簡潔純白', desc: '白底搭配藍金' },
              { id: 'geometric_tech', name: '幾何科技', desc: '淡藍網格微光' },
              { id: 'festive_red', name: '喜慶尾牙', desc: '喜氣紅金氛圍' },
              { id: 'dark_night', name: '深邃夜空', desc: '大螢幕沉浸投影' },
            ].map((bg) => (
              <button
                key={bg.id}
                onClick={() => handleChange('backgroundTheme', bg.id as BackgroundTheme)}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  settings.backgroundTheme === bg.id
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-bold text-slate-800">{bg.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{bg.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 音效與動畫設定 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span>動畫與音效控制</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              {settings.soundEnabled ? (
                <Volume2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <VolumeX className="h-5 w-5 text-slate-400" />
              )}
              <div>
                <p className="text-xs font-bold text-slate-800">抽籤音效</p>
                <p className="text-[10px] text-slate-400">倒數、旋轉與中獎慶祝音</p>
              </div>
            </div>
            <button
              onClick={() => handleChange('soundEnabled', !settings.soundEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.soundEnabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">自動彩帶特效</p>
              <p className="text-[10px] text-slate-400">中籤時發射全螢幕慶祝彩帶</p>
            </div>
            <button
              onClick={() => handleChange('autoConfetti', !settings.autoConfetti)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoConfetti ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoConfetti ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="sm:col-span-2 flex flex-col space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>抽籤動畫持續時間</span>
              <span className="text-blue-600">{settings.animationDuration} 秒</span>
            </div>
            <input
              type="range"
              min="2"
              max="8"
              step="0.5"
              value={settings.animationDuration}
              onChange={(e) => handleChange('animationDuration', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>快速 (2s)</span>
              <span>標準 (3.5s)</span>
              <span>緊張懸疑 (8s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 資料安全與重設 */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400 border border-emerald-500/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>🔒 名單僅儲存在此裝置</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              為了保護您的企業內部機密與員工個人隱私，所有名單與抽獎紀錄完全儲存於您本地瀏覽器
              LocalStorage 中，絕不上傳至任何外部伺服器。
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (confirm('⚠️ 警告：這將清除所有名單、歷史紀錄與獎項設定，並還原至預設值。確定要繼續嗎？')) {
              onResetAllData();
            }
          }}
          className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/20 transition flex items-center gap-1.5 shrink-0"
        >
          <RotateCcw className="h-4 w-4" />
          <span>重設所有系統資料</span>
        </button>
      </div>
    </div>
  );
};

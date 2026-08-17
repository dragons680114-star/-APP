import React from 'react';
import {
  Dice5,
  Users,
  Trophy,
  BarChart3,
  History,
  Settings,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'lottery' | 'participants' | 'prizes' | 'statistics' | 'history' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  participantCount: number;
  historyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  participantCount,
  historyCount,
}) => {
  const navItems = [
    { id: 'lottery' as NavTab, label: '開始抽籤', icon: Dice5, badge: null },
    { id: 'participants' as NavTab, label: '名單管理', icon: Users, badge: participantCount },
    { id: 'prizes' as NavTab, label: '獎項設定', icon: Trophy, badge: null },
    { id: 'statistics' as NavTab, label: '統計分析', icon: BarChart3, badge: null },
    { id: 'history' as NavTab, label: '歷史紀錄', icon: History, badge: historyCount > 0 ? historyCount : null },
    { id: 'settings' as NavTab, label: '系統設定', icon: Settings, badge: null },
  ];

  return (
    <>
      {/* 桌機版左側選單 */}
      <aside className="hidden md:flex flex-col justify-between w-64 shrink-0 bg-slate-900 text-slate-300 rounded-3xl border border-slate-800 p-5 shadow-xl h-fit sticky top-20">
        <div>
          {/* 標頭 */}
          <div className="flex items-center gap-3 pb-5 border-b border-slate-800">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 text-2xl shadow-md border border-yellow-200">
              🎲
            </span>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">好運抽籤</h2>
              <p className="text-[11px] text-slate-400 font-medium">專業活動抽獎系統</p>
            </div>
          </div>

          {/* 導覽列表 */}
          <nav className="mt-5 space-y-1.5">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              功能導航
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 font-bold translate-x-0.5'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 底部狀態區 */}
        <div className="mt-8 pt-5 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-medium text-[11px] mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
            <span>🔒 本地加密存儲中</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono tracking-wider">
            <span>VERSION 2.0.4 PRO</span>
            <span className="text-amber-400/80">繁體中文</span>
          </div>
        </div>
      </aside>

      {/* 手機版底部導覽列 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex justify-around items-center shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                isActive ? 'text-blue-400 font-bold' : 'text-slate-400 font-medium hover:text-slate-200'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

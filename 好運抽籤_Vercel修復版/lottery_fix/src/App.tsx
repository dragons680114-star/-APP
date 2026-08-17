import React, { useEffect, useState } from 'react';
import type {
  AppSettings,
  LotteryAlgorithm,
  LotteryConstraint,
  LotteryResult,
  Participant,
  Prize,
} from './types';
import { storage } from './utils/storage';
import { soundManager } from './utils/audio';
import { Navbar } from './components/Navbar';
import { Sidebar, type NavTab } from './components/Sidebar';
import { LotteryPanel } from './components/LotteryPanel';
import { ParticipantPoolSidebar } from './components/ParticipantPoolSidebar';
import { ParticipantManager } from './components/ParticipantManager';
import { PrizeManager } from './components/PrizeManager';
import { StatisticsPanel } from './components/StatisticsPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ImportExcelModal } from './components/ImportExcelModal';
import { WinnerModal } from './components/WinnerModal';
import { FullscreenActivityView } from './components/FullscreenActivityView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('lottery');
  const [isAdmin, setIsAdmin] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>(() => storage.getParticipants());
  const [remainingPool, setRemainingPool] = useState<Participant[]>(() =>
    storage.getRemainingPool() || storage.getParticipants()
  );
  const [prizes, setPrizes] = useState<Prize[]>(() => storage.getPrizes());
  const [history, setHistory] = useState<LotteryResult[]>(() => storage.getHistory());
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [constraints, setConstraints] = useState<LotteryConstraint>(() => storage.getConstraints());
  const [algorithm, setAlgorithm] = useState<LotteryAlgorithm>('fair_rotation');

  const [selectedPrize, setSelectedPrize] = useState<Prize | undefined>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewingHistoryResult, setViewingHistoryResult] = useState<LotteryResult | null>(null);

  useEffect(() => {
    soundManager.setMuted(!settings.soundEnabled);
    soundManager.setVolume(settings.volume);
  }, [settings.soundEnabled, settings.volume]);

  const requestAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      return;
    }
    const entered = window.prompt('請輸入管理員 PIN');
    if (entered === null) return;
    if (entered === settings.adminPin) {
      setIsAdmin(true);
      window.alert('管理員模式已啟用');
    } else {
      window.alert('PIN 不正確');
    }
  };

  const updateParticipants = (newList: Participant[]) => {
    setParticipants(newList);
    storage.setParticipants(newList);
    const ids = new Set(newList.map((p) => p.id));
    const nextPool = remainingPool.filter((p) => ids.has(p.id));
    setRemainingPool(nextPool);
    storage.setRemainingPool(nextPool);
  };

  const updateRemainingPool = (newPool: Participant[]) => {
    setRemainingPool(newPool);
    storage.setRemainingPool(newPool);
  };

  const resetRemainingPool = () => {
    setRemainingPool(participants);
    storage.setRemainingPool(participants);
  };

  const reAddToPool = (winners: Participant[]) => {
    const winnerIds = new Set(winners.map((w) => w.id));
    const toAdd = participants.filter(
      (p) => winnerIds.has(p.id) && !remainingPool.some((x) => x.id === p.id)
    );
    updateRemainingPool([...remainingPool, ...toAdd]);
  };

  const recordResult = (result: LotteryResult, winners: Participant[]) => {
    storage.addHistory(result);
    setHistory(storage.getHistory());

    const winnerIds = new Set(winners.map((w) => w.id));
    const nowIso = new Date().toISOString();
    const cooldownDays = result.cooldownDaysApplied ?? constraints.cooldownDays ?? 14;
    const nextParticipants = participants.map((p) => {
      if (!winnerIds.has(p.id)) return p;
      const cooldownUntil = cooldownDays > 0
        ? new Date(Date.now() + cooldownDays * 86400000).toISOString()
        : null;
      return {
        ...p,
        winCount: (p.winCount || 0) + 1,
        lastWonAt: nowIso,
        cooldownUntil,
      };
    });
    setParticipants(nextParticipants);
    storage.setParticipants(nextParticipants);
  };

  const updatePrizes = (newPrizes: Prize[]) => {
    setPrizes(newPrizes);
    storage.setPrizes(newPrizes);
  };

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    storage.setSettings(newSettings);
  };

  const updateConstraints = (newConstraints: LotteryConstraint) => {
    setConstraints(newConstraints);
    storage.setConstraints(newConstraints);
  };

  const importComplete = (newItems: Participant[], mode: 'replace' | 'append') => {
    const finalItems = mode === 'replace' ? newItems : [...participants, ...newItems];
    setParticipants(finalItems);
    storage.setParticipants(finalItems);
    setRemainingPool(finalItems);
    storage.setRemainingPool(finalItems);
  };

  const clearHistory = () => {
    storage.clearHistory();
    setHistory([]);
  };

  const resetAllData = () => {
    storage.resetAllData();
    const p = storage.getParticipants();
    setParticipants(p);
    setRemainingPool(p);
    setPrizes(storage.getPrizes());
    setHistory([]);
    setSettings(storage.getSettings());
    setConstraints(storage.getConstraints());
  };

  const backgroundClass = (() => {
    switch (settings.backgroundTheme) {
      case 'geometric_tech':
        return 'bg-gradient-to-br from-slate-100 via-blue-50/60 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950';
      case 'festive_red':
        return 'bg-gradient-to-br from-red-50/50 via-amber-50/40 to-orange-50/50 dark:from-red-950/40 dark:via-slate-900 dark:to-slate-950';
      case 'dark_night':
        return 'bg-slate-950 text-slate-100';
      default:
        return 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100';
    }
  })();

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${backgroundClass}`}>
      <Navbar
        settings={settings}
        isAdmin={isAdmin}
        onUpdateSettings={updateSettings}
        onEnterFullscreen={() => setIsFullscreen(true)}
        onOpenAdminAuth={requestAdmin}
        eligibleCount={remainingPool.length}
        totalCount={participants.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-20 md:pb-8">
        <div className="flex flex-col md:flex-row gap-6">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            participantCount={participants.length}
            historyCount={history.length}
          />

          <div className="flex-1 min-w-0">
            {currentTab === 'lottery' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <LotteryPanel
                    participants={participants}
                    remainingPool={remainingPool}
                    prizes={prizes}
                    settings={settings}
                    algorithm={algorithm}
                    constraints={constraints}
                    onUpdateRemainingPool={updateRemainingPool}
                    onRecordResult={recordResult}
                    onUpdatePrizes={updatePrizes}
                    onEnterFullscreen={() => setIsFullscreen(true)}
                    selectedPrize={selectedPrize}
                    onSelectPrize={setSelectedPrize}
                    onReAddToPool={reAddToPool}
                    onResetRemainingPool={resetRemainingPool}
                  />
                </div>
                <div className="lg:col-span-4">
                  <ParticipantPoolSidebar
                    participants={participants}
                    remainingPool={remainingPool}
                    algorithm={algorithm}
                    onChangeAlgorithm={setAlgorithm}
                    constraints={constraints}
                    onChangeConstraints={updateConstraints}
                    onResetRemainingPool={resetRemainingPool}
                    currentMode="single"
                  />
                </div>
              </div>
            )}

            {currentTab === 'participants' && (
              <ParticipantManager
                participants={participants}
                onUpdateParticipants={updateParticipants}
                onOpenImportModal={() => setIsImportModalOpen(true)}
              />
            )}

            {currentTab === 'prizes' && (
              <PrizeManager
                prizes={prizes}
                onUpdatePrizes={updatePrizes}
                onSelectPrizeForDraw={(prize) => {
                  setSelectedPrize(prize);
                  setCurrentTab('lottery');
                }}
              />
            )}

            {currentTab === 'statistics' && (
              <StatisticsPanel participants={participants} history={history} />
            )}

            {currentTab === 'history' && (
              <HistoryPanel
                history={history}
                onClearHistory={clearHistory}
                onViewResult={setViewingHistoryResult}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsPanel
                settings={settings}
                onUpdateSettings={updateSettings}
                onResetAllData={resetAllData}
              />
            )}
          </div>
        </div>
      </main>

      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={importComplete}
        existingParticipants={participants}
      />

      {viewingHistoryResult && (
        <WinnerModal
          result={viewingHistoryResult}
          onClose={() => setViewingHistoryResult(null)}
        />
      )}

      {isFullscreen && (
        <FullscreenActivityView
          onExitFullscreen={() => setIsFullscreen(false)}
          settings={settings}
          participants={participants}
          remainingPool={remainingPool}
          prizes={prizes}
          algorithm={algorithm}
          constraints={constraints}
          initialPrize={selectedPrize}
          onRecordResult={recordResult}
          onUpdateRemainingPool={updateRemainingPool}
          onUpdatePrizes={updatePrizes}
          onToggleSound={() => updateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
        />
      )}
    </div>
  );
}

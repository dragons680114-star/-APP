import React, { useState, useEffect, useMemo } from 'react';
import {
  Participant,
  Prize,
  LotteryResult,
  AppSettings,
  LotteryConstraint,
  LotteryAlgorithm,
  DutyTask,
  ActivityTemplate,
} from './types';
import { storage } from './utils/storage';
import { soundManager } from './utils/audio';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { EnterpriseHome } from './components/EnterpriseHome';
import { LotteryPanel } from './components/LotteryPanel';
import { ParticipantPoolSidebar } from './components/ParticipantPoolSidebar';
import { DutyManagementPanel } from './components/DutyManagementPanel';
import { TemplateManager } from './components/TemplateManager';
import { FairnessDashboard } from './components/FairnessDashboard';
import { ParticipantManager } from './components/ParticipantManager';
import { PrizeManager } from './components/PrizeManager';
import { StatisticsPanel } from './components/StatisticsPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ImportExcelModal } from './components/ImportExcelModal';
import { WinnerModal } from './components/WinnerModal';
import { FullscreenActivityView } from './components/FullscreenActivityView';
import { AdminPinModal } from './components/AdminPinModal';
import { GroupingModal } from './components/GroupingModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // 管理者權限模式狀態
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isGroupingModalOpen, setIsGroupingModalOpen] = useState(false);

  // 核心資料狀態
  const [participants, setParticipants] = useState<Participant[]>(() => storage.getParticipants());
  const [remainingPool, setRemainingPool] = useState<Participant[]>(() => {
    const saved = storage.getRemainingPool();
    return saved || storage.getParticipants();
  });
  const [prizes, setPrizes] = useState<Prize[]>(() => storage.getPrizes());
  const [dutyTasks, setDutyTasks] = useState<DutyTask[]>(() => storage.getDutyTasks());
  const [templates, setTemplates] = useState<ActivityTemplate[]>(() => storage.getTemplates());
  const [history, setHistory] = useState<LotteryResult[]>(() => storage.getHistory());
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [constraints, setConstraints] = useState<LotteryConstraint>(() => storage.getConstraints());
  const [algorithm, setAlgorithm] = useState<LotteryAlgorithm>('fair_rotation');

  // 目前執行的特定輪值任務
  const [activeDutyTask, setActiveDutyTask] = useState<DutyTask | null>(null);

  // 抽獎輔助狀態
  const [selectedPrize, setSelectedPrize] = useState<Prize | undefined>(undefined);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewingHistoryResult, setViewingHistoryResult] = useState<LotteryResult | null>(null);

  // 初始化音效設定
  useEffect(() => {
    soundManager.setMuted(!settings.soundEnabled);
    soundManager.setVolume(settings.volume);
  }, [settings.soundEnabled, settings.volume]);

  // 即時計算公平性分析指標與警示
  const fairnessAnalysis = useMemo(() => {
    return storage.getFairnessAnalysis();
  }, [participants, history]);

  // 更新參加者清單
  const handleUpdateParticipants = (newList: Participant[]) => {
    setParticipants(newList);
    storage.setParticipants(newList);

    // 同步更新剩餘池中已不存在的人
    const newIdSet = new Set(newList.map((p) => p.id));
    const nextPool = remainingPool.filter((p) => newIdSet.has(p.id));
    setRemainingPool(nextPool);
    storage.setRemainingPool(nextPool);
  };

  // 更新剩餘池底
  const handleUpdateRemainingPool = (newPool: Participant[]) => {
    setRemainingPool(newPool);
    storage.setRemainingPool(newPool);
  };

  // 重設剩餘池底（恢復所有人可抽）
  const handleResetRemainingPool = () => {
    setRemainingPool(participants);
    storage.setRemainingPool(participants);
  };

  // 中籤者重新加入池底
  const handleReAddToPool = (winners: Participant[]) => {
    const winnerIds = new Set(winners.map((w) => w.id));
    const toAdd = participants.filter((p) => winnerIds.has(p.id));
    const nextPool = [...remainingPool, ...toAdd.filter((p) => !remainingPool.some((x) => x.id === p.id))];
    setRemainingPool(nextPool);
    storage.setRemainingPool(nextPool);
  };

  // 記錄抽籤結果與中籤次數累計
  const handleRecordResult = (result: LotteryResult, winners: Participant[]) => {
    // 1. 寫入歷史紀錄
    setHistory((prev) => {
      const next = [result, ...prev];
      storage.addHistory(result);
      return next;
    });

    // 2. 更新參與者的歷史中籤次數與最近日期、冷卻時間
    const winnerIdMap = new Map(winners.map((w) => [w.id, true]));
    const nowIso = new Date().toISOString();
    const cooldownDays = result.cooldownDaysApplied ?? constraints.cooldownDays ?? 14;

    const updatedParticipants = participants.map((p) => {
      if (winnerIdMap.has(p.id)) {
        let cooldownUntilIso: string | null = null;
        if (cooldownDays > 0) {
          const cooldownEnd = new Date(Date.now() + cooldownDays * 24 * 60 * 60 * 1000);
          cooldownUntilIso = cooldownEnd.toISOString();
        }
        return {
          ...p,
          winCount: (p.winCount || 0) + 1,
          lastWonAt: nowIso,
          cooldownUntil: cooldownUntilIso,
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    storage.setParticipants(updatedParticipants);

    // 3. 若為輪值任務抽籤，更新任務歷史紀錄與下次預定日期
    if (activeDutyTask) {
      const updatedTasks = dutyTasks.map((t) => {
        if (t.id === activeDutyTask.id) {
          const newAssignedHistory = [
            {
              date: new Date().toISOString().slice(0, 10),
              resultId: result.verificationCode || result.id,
              winnerIds: winners.map((w) => w.id),
              winnerNames: winners.map((w) => w.name),
            },
            ...t.assignedHistory,
          ];
          return {
            ...t,
            lastExecutedAt: nowIso,
            assignedHistory: newAssignedHistory,
          };
        }
        return t;
      });
      setDutyTasks(updatedTasks);
      storage.setDutyTasks(updatedTasks);
    }
  };

  // 獎項更新
  const handleUpdatePrizes = (newPrizes: Prize[]) => {
    setPrizes(newPrizes);
    storage.setPrizes(newPrizes);
  };

  // 輪值任務儲存與刪除
  const handleSaveDutyTask = (task: DutyTask) => {
    const existingIndex = dutyTasks.findIndex((t) => t.id === task.id);
    let nextTasks: DutyTask[];
    if (existingIndex >= 0) {
      nextTasks = dutyTasks.map((t) => (t.id === task.id ? task : t));
    } else {
      nextTasks = [task, ...dutyTasks];
    }
    setDutyTasks(nextTasks);
    storage.setDutyTasks(nextTasks);
  };

  const handleDeleteDutyTask = (taskId: string) => {
    const nextTasks = dutyTasks.filter((t) => t.id !== taskId);
    setDutyTasks(nextTasks);
    storage.setDutyTasks(nextTasks);
  };

  // 啟動特定輪值任務抽籤
  const handleStartDutyDraw = (task: DutyTask) => {
    setActiveDutyTask(task);
    setAlgorithm('fair_rotation');
    setConstraints((prev) => ({
      ...prev,
      cooldownDays: task.cooldownDays,
      departmentBalance: 'mild',
    }));
    setCurrentTab('lottery');
  };

  // 模板管理
  const handleSaveTemplate = (tpl: ActivityTemplate) => {
    const existingIndex = templates.findIndex((t) => t.id === tpl.id);
    let nextTemplates: ActivityTemplate[];
    if (existingIndex >= 0) {
      nextTemplates = templates.map((t) => (t.id === tpl.id ? tpl : t));
    } else {
      nextTemplates = [tpl, ...templates];
    }
    setTemplates(nextTemplates);
    storage.setTemplates(nextTemplates);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const nextTemplates = templates.filter((t) => t.id !== templateId);
    setTemplates(nextTemplates);
    storage.setTemplates(nextTemplates);
  };

  // 套用模板
  const handleApplyTemplate = (tpl: ActivityTemplate) => {
    if (tpl.mode === 'grouping') {
      setIsGroupingModalOpen(true);
      return;
    }
    setAlgorithm(tpl.algorithm);
    setConstraints((prev) => ({
      ...prev,
      cooldownDays: tpl.cooldownDays,
      departmentBalance: tpl.departmentBalance,
      ...(tpl.constraints || {}),
    }));
    if (tpl.prizes && tpl.prizes.length > 0) {
      setPrizes(tpl.prizes);
      setSelectedPrize(tpl.prizes[0]);
    }
    setActiveDutyTask(null);
    setCurrentTab('lottery');
  };

  // 歷史紀錄修正（審計防偽）
  const handleUpdateHistoryItem = (correctedResult: LotteryResult) => {
    const list = storage.getHistory();
    const updated = list.map((item) => (item.id === correctedResult.id ? correctedResult : item));
    setHistory(updated);
    localStorage.setItem('lucky_lottery_history_v3', JSON.stringify(updated));
  };

  // 歷史清空
  const handleClearHistory = () => {
    setHistory([]);
    storage.clearHistory();
  };

  // 設定更新
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    storage.setSettings(newSettings);
  };

  // 約束條件更新
  const handleUpdateConstraints = (newConstraints: LotteryConstraint) => {
    setConstraints(newConstraints);
    storage.setConstraints(newConstraints);
  };

  // Excel 匯入完成回調
  const handleImportComplete = (newItems: Participant[], mode: 'replace' | 'append') => {
    const finalItems = mode === 'replace' ? newItems : [...participants, ...newItems];
    handleUpdateParticipants(finalItems);
    handleResetRemainingPool();
  };

  // 重設全部資料
  const handleResetAllData = () => {
    storage.resetAllData();
    setParticipants(storage.getParticipants());
    setRemainingPool(storage.getParticipants());
    setPrizes(storage.getPrizes());
    setDutyTasks(storage.getDutyTasks());
    setTemplates(storage.getTemplates());
    setHistory([]);
    setSettings(storage.getSettings());
    setConstraints(storage.getConstraints());
  };

  // 背景主題樣式
  const getBackgroundStyle = () => {
    switch (settings.backgroundTheme) {
      case 'geometric_tech':
        return 'bg-gradient-to-br from-slate-100 via-blue-50/60 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950';
      case 'festive_red':
        return 'bg-gradient-to-br from-red-50/50 via-amber-50/40 to-orange-50/50 dark:from-red-950/40 dark:via-slate-900 dark:to-slate-950';
      case 'dark_night':
        return 'bg-slate-950 text-slate-100';
      case 'clean_white':
      default:
        return 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100';
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${getBackgroundStyle()}`}>
      {/* 頂部導航列 */}
      <Navbar
        settings={settings}
        isAdmin={isAdmin}
        onUpdateSettings={handleUpdateSettings}
        onEnterFullscreen={() => setIsFullscreen(true)}
        onOpenAdminAuth={() => setIsAdminModalOpen(true)}
        eligibleCount={remainingPool.length}
        totalCount={participants.length}
      />

      {/* 主內容區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-20 md:pb-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* 左側選單 */}
          <Sidebar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            participantCount={participants.length}
            dutyTaskCount={dutyTasks.length}
            historyCount={history.length}
            isAdmin={isAdmin}
          />

          {/* 中間與右側主要工作區 */}
          <div className="flex-1 min-w-0">
            {currentTab === 'dashboard' && (
              <EnterpriseHome
                settings={settings}
                participants={participants}
                prizes={prizes}
                dutyTasks={dutyTasks}
                templates={templates}
                history={history}
                fairnessAlerts={fairnessAnalysis.alerts}
                cooldownCount={fairnessAnalysis.cooldownCount}
                isAdmin={isAdmin}
                onNavigate={(tab) => setCurrentTab(tab as NavTab)}
                onSelectDutyTask={handleStartDutyDraw}
                onSelectTemplate={handleApplyTemplate}
                onOpenAdminAuth={() => setIsAdminModalOpen(true)}
              />
            )}

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
                    isAdmin={isAdmin}
                    activeDutyTask={activeDutyTask}
                    onClearDutyTask={() => setActiveDutyTask(null)}
                    onUpdateAlgorithm={setAlgorithm}
                    onUpdateConstraints={handleUpdateConstraints}
                    onUpdateRemainingPool={handleUpdateRemainingPool}
                    onRecordResult={handleRecordResult}
                    onUpdatePrizes={handleUpdatePrizes}
                    onEnterFullscreen={() => setIsFullscreen(true)}
                    selectedPrize={selectedPrize}
                    onSelectPrize={setSelectedPrize}
                    onReAddToPool={handleReAddToPool}
                    onResetRemainingPool={handleResetRemainingPool}
                    onOpenAdminAuth={() => setIsAdminModalOpen(true)}
                  />
                </div>
                <div className="lg:col-span-4">
                  <ParticipantPoolSidebar
                    participants={participants}
                    remainingPool={remainingPool}
                    algorithm={algorithm}
                    onChangeAlgorithm={setAlgorithm}
                    constraints={constraints}
                    onChangeConstraints={handleUpdateConstraints}
                    onResetRemainingPool={handleResetRemainingPool}
                    currentMode="single"
                  />
                </div>
              </div>
            )}

            {currentTab === 'duty' && (
              <DutyManagementPanel
                tasks={dutyTasks}
                participants={participants}
                settings={settings}
                isAdmin={isAdmin}
                onSaveTask={handleSaveDutyTask}
                onDeleteTask={handleDeleteDutyTask}
                onStartDutyDraw={handleStartDutyDraw}
                onOpenAdminAuth={() => setIsAdminModalOpen(true)}
              />
            )}

            {currentTab === 'templates' && (
              <TemplateManager
                templates={templates}
                isAdmin={isAdmin}
                onApplyTemplate={handleApplyTemplate}
                onSaveTemplate={handleSaveTemplate}
                onDeleteTemplate={handleDeleteTemplate}
                onOpenAdminAuth={() => setIsAdminModalOpen(true)}
              />
            )}

            {currentTab === 'fairness' && (
              <FairnessDashboard
                participants={participants}
                history={history}
                analysis={fairnessAnalysis}
              />
            )}

            {currentTab === 'participants' && (
              <ParticipantManager
                participants={participants}
                onUpdateParticipants={handleUpdateParticipants}
                onOpenImportModal={() => setIsImportModalOpen(true)}
              />
            )}

            {currentTab === 'prizes' && (
              <PrizeManager
                prizes={prizes}
                onUpdatePrizes={handleUpdatePrizes}
                onSelectPrizeForDraw={(prize) => {
                  setSelectedPrize(prize);
                  setActiveDutyTask(null);
                  setCurrentTab('lottery');
                }}
              />
            )}

            {currentTab === 'history' && (
              <HistoryPanel
                history={history}
                isAdmin={isAdmin}
                onClearHistory={handleClearHistory}
                onViewResult={(res) => setViewingHistoryResult(res)}
                onUpdateHistoryItem={handleUpdateHistoryItem}
                onOpenAdminAuth={() => setIsAdminModalOpen(true)}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsPanel
                settings={settings}
                isAdmin={isAdmin}
                onUpdateSettings={handleUpdateSettings}
                onResetAllData={handleResetAllData}
                onOpenAdminAuth={() => setIsAdminModalOpen(true)}
                onAdminLogout={() => setIsAdmin(false)}
              />
            )}
          </div>
        </div>
      </main>

      {/* 管理者 PIN 驗證彈窗 */}
      <AdminPinModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => {
          setIsAdmin(true);
          setIsAdminModalOpen(false);
        }}
        correctPin={settings.adminPin}
      />

      {/* 隨機分組彈窗 */}
      <GroupingModal
        isOpen={isGroupingModalOpen}
        onClose={() => setIsGroupingModalOpen(false)}
        participants={participants}
        activityName={settings.activityName}
      />

      {/* Excel / CSV 匯入彈窗 */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
        existingParticipants={participants}
      />

      {/* 歷史紀錄喜報檢視彈窗 */}
      {viewingHistoryResult && (
        <WinnerModal
          result={viewingHistoryResult}
          onClose={() => setViewingHistoryResult(null)}
        />
      )}

      {/* 活動全螢幕投影模式 */}
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
          onRecordResult={handleRecordResult}
          onUpdateRemainingPool={handleUpdateRemainingPool}
          onUpdatePrizes={handleUpdatePrizes}
          onToggleSound={() => {
            const next = !settings.soundEnabled;
            soundManager.setMuted(!next);
            handleUpdateSettings({ ...settings, soundEnabled: next });
          }}
        />
      )}
    </div>
  );
}

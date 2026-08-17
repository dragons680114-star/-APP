import {
  Participant,
  Prize,
  LotteryResult,
  AppSettings,
  LotteryConstraint,
  DutyTask,
  ActivityTemplate,
  FairnessAnalysisSummary,
  FairnessAlert,
} from '../types';
import { generateEnterprise50Participants } from './lottery/testRunner';
import { calculateFairnessScore, enrichWithFairnessScore } from './lottery/fairnessScore';

const STORAGE_KEYS = {
  PARTICIPANTS: 'lucky_lottery_participants_v3',
  REMAINING_POOL: 'lucky_lottery_remaining_pool_v3',
  PRIZES: 'lucky_lottery_prizes_v3',
  HISTORY: 'lucky_lottery_history_v3',
  SETTINGS: 'lucky_lottery_settings_v3',
  CONSTRAINTS: 'lucky_lottery_constraints_v3',
  DUTY_TASKS: 'lucky_lottery_duty_tasks_v3',
  TEMPLATES: 'lucky_lottery_templates_v3',
  LAST_GROUPING: 'lucky_lottery_last_grouping_v3',
};

export const DEFAULT_PARTICIPANTS: Participant[] = generateEnterprise50Participants();

export const DEFAULT_PRIZES: Prize[] = [
  { id: 'prz-1', name: '特獎・星宇航空雙人機票', description: '日本東京來回商務艙雙人機票 2 張', count: 1, drawnCount: 0, order: 1 },
  { id: 'prz-2', name: '頭獎・Apple iPhone 16 Pro', description: '256GB 原色鈦金屬', count: 2, drawnCount: 0, order: 2 },
  { id: 'prz-3', name: '二獎・Dyson 吸塵吹風機組', description: 'Supersonic Nural 旗艦版', count: 3, drawnCount: 0, order: 3 },
  { id: 'prz-4', name: '三獎・新光三越現金禮券', description: '面額 NT$10,000 元', count: 5, drawnCount: 0, order: 4 },
  { id: 'prz-5', name: '幸運獎・星巴克千元商品卡', description: '實體儲值卡 NT$1,000', count: 10, drawnCount: 0, order: 5 },
];

export const DEFAULT_DUTY_TASKS: DutyTask[] = [
  {
    id: 'duty-1',
    name: '每日值日生',
    type: 'daily_duty',
    frequency: 'daily',
    applicableDepartments: [],
    applicableParticipantIds: [],
    requiredCount: 2,
    cooldownDays: 14,
    allowRepeats: false,
    createdAt: '2026-08-01T08:00:00.000Z',
    lastExecutedAt: '2026-08-15T09:00:00.000Z',
    nextExecutionDate: '2026-08-16',
    assignedHistory: [
      {
        date: '2026-08-15',
        resultId: 'LOT-20260815-DUTY01',
        winnerIds: ['emp-1', 'emp-12'],
        winnerNames: ['陳冠宇', '鄭翔宇'],
      },
    ],
  },
  {
    id: 'duty-2',
    name: '每週清潔小組',
    type: 'weekly_clean',
    frequency: 'weekly',
    applicableDepartments: [],
    applicableParticipantIds: [],
    requiredCount: 3,
    cooldownDays: 21,
    allowRepeats: false,
    createdAt: '2026-08-01T08:00:00.000Z',
    lastExecutedAt: null,
    nextExecutionDate: '2026-08-18',
    assignedHistory: [],
  },
  {
    id: 'duty-3',
    name: '食安與環境巡檢',
    type: 'food_safety',
    frequency: 'weekly',
    applicableDepartments: ['製造部', '品保部'],
    applicableParticipantIds: [],
    requiredCount: 2,
    cooldownDays: 30,
    allowRepeats: false,
    createdAt: '2026-08-05T08:00:00.000Z',
    lastExecutedAt: null,
    nextExecutionDate: '2026-08-20',
    assignedHistory: [],
  },
  {
    id: 'duty-4',
    name: '內部稽核代表',
    type: 'audit',
    frequency: 'monthly',
    applicableDepartments: [],
    applicableParticipantIds: [],
    requiredCount: 3,
    cooldownDays: 60,
    allowRepeats: false,
    createdAt: '2026-08-01T08:00:00.000Z',
    lastExecutedAt: null,
    nextExecutionDate: '2026-08-30',
    assignedHistory: [],
  },
  {
    id: 'duty-5',
    name: '會議紀錄人員',
    type: 'meeting_notes',
    frequency: 'weekly',
    applicableDepartments: [],
    applicableParticipantIds: [],
    requiredCount: 1,
    cooldownDays: 14,
    allowRepeats: false,
    createdAt: '2026-08-01T08:00:00.000Z',
    lastExecutedAt: null,
    nextExecutionDate: '2026-08-17',
    assignedHistory: [],
  },
];

export const DEFAULT_TEMPLATES: ActivityTemplate[] = [
  {
    id: 'tpl-year-end',
    name: '尾牙春酒抽獎',
    description: '包含頭獎、二獎、三獎、一般獎等多階獎項，支援大型活動全螢幕投影',
    category: 'year_end',
    icon: '🎉',
    mode: 'prize',
    algorithm: 'random',
    drawCount: 1,
    cooldownDays: 0,
    departmentBalance: 'none',
    prizes: DEFAULT_PRIZES,
    isBuiltin: true,
  },
  {
    id: 'tpl-daily-duty',
    name: '每日值日',
    description: '每天抽取 1~3 人負責辦公區域值日，啟用 14 天冷卻期與公平輪值',
    category: 'duty',
    icon: '🧹',
    mode: 'duty',
    algorithm: 'fair_rotation',
    drawCount: 2,
    cooldownDays: 14,
    departmentBalance: 'mild',
    isBuiltin: true,
  },
  {
    id: 'tpl-training',
    name: '教育訓練提問',
    description: '課堂/訓練隨機抽人回答問題，近期回答過者動態降權以鼓勵全員參與',
    category: 'training',
    icon: '🎓',
    mode: 'single',
    algorithm: 'fair_rotation',
    drawCount: 1,
    cooldownDays: 7,
    departmentBalance: 'none',
    isBuiltin: true,
  },
  {
    id: 'tpl-audit',
    name: '稽核巡查人員',
    description: '每次抽取 2~3 人，避免同部門集中，啟用高度部門平衡',
    category: 'audit',
    icon: '🔍',
    mode: 'multiple',
    algorithm: 'fair_rotation',
    drawCount: 3,
    cooldownDays: 30,
    departmentBalance: 'strict',
    constraints: { maxPerDepartment: 1 },
    isBuiltin: true,
  },
  {
    id: 'tpl-grouping',
    name: '隨機專案分組',
    description: '平均分組並啟用「避免上次同組」，大幅降低組員重複度',
    category: 'teamwork',
    icon: '👥',
    mode: 'grouping',
    algorithm: 'random',
    drawCount: 4,
    cooldownDays: 0,
    departmentBalance: 'mild',
    avoidLastGroupRepeat: true,
    isBuiltin: true,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  activityName: '好運抽籤・企業公平輪值管理系統',
  companyName: '數位科技股份有限公司',
  logoUrl: '',
  themeColor: 'blue_gold',
  backgroundTheme: 'clean_white',
  soundEnabled: true,
  volume: 0.8,
  animationDuration: 3.0,
  autoConfetti: true,
  adminPin: '8888',
  isActivityLocked: false,
  defaultCooldownDays: 14,
  defaultDepartmentBalance: 'mild',
};

export const DEFAULT_CONSTRAINTS: LotteryConstraint = {
  maxPerDepartment: 0,
  excludedParticipantIds: [],
  departmentQuotas: {},
  excludePreviousWinners: false,
  cooldownDays: 14,
  departmentBalance: 'mild',
  avoidLastGroupRepeat: true,
};

export const storage = {
  getParticipants(): Participant[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
      if (!data) {
        this.setParticipants(DEFAULT_PARTICIPANTS);
        return enrichWithFairnessScore(DEFAULT_PARTICIPANTS);
      }
      const list: Participant[] = JSON.parse(data);
      return enrichWithFairnessScore(list);
    } catch {
      return enrichWithFairnessScore(DEFAULT_PARTICIPANTS);
    }
  },

  setParticipants(list: Participant[]) {
    try {
      const enriched = enrichWithFairnessScore(list);
      localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(enriched));
    } catch {
      // Ignore
    }
  },

  getRemainingPool(): Participant[] | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REMAINING_POOL);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setRemainingPool(pool: Participant[] | null) {
    try {
      if (pool === null) {
        localStorage.removeItem(STORAGE_KEYS.REMAINING_POOL);
      } else {
        localStorage.setItem(STORAGE_KEYS.REMAINING_POOL, JSON.stringify(pool));
      }
    } catch {
      // Ignore
    }
  },

  getPrizes(): Prize[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRIZES);
      if (!data) {
        this.setPrizes(DEFAULT_PRIZES);
        return DEFAULT_PRIZES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_PRIZES;
    }
  },

  setPrizes(prizes: Prize[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizes));
    } catch {
      // Ignore
    }
  },

  getDutyTasks(): DutyTask[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DUTY_TASKS);
      if (!data) {
        this.setDutyTasks(DEFAULT_DUTY_TASKS);
        return DEFAULT_DUTY_TASKS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_DUTY_TASKS;
    }
  },

  setDutyTasks(tasks: DutyTask[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.DUTY_TASKS, JSON.stringify(tasks));
    } catch {
      // Ignore
    }
  },

  getTemplates(): ActivityTemplate[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (!data) {
        this.setTemplates(DEFAULT_TEMPLATES);
        return DEFAULT_TEMPLATES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_TEMPLATES;
    }
  },

  setTemplates(templates: ActivityTemplate[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    } catch {
      // Ignore
    }
  },

  getHistory(): LotteryResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addHistory(result: LotteryResult) {
    try {
      const list = this.getHistory();
      const updated = [result, ...list];
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  },

  // 審計修正紀錄：不刪除原紀錄，標記 isCorrected 並建立修正版本
  correctHistory(originalId: string, correctedResult: LotteryResult, reason: string, operator: string) {
    try {
      const list = this.getHistory();
      const updated = list.map((item) => {
        if (item.id === originalId) {
          return {
            ...item,
            isCorrected: true,
            correctionReason: reason,
            correctedAt: new Date().toISOString(),
            correctedBy: operator,
          };
        }
        return item;
      });

      // 在頂部插入修正版本
      updated.unshift({
        ...correctedResult,
        id: `CORRECTED-${correctedResult.id}`,
        originalResultId: originalId,
        correctionReason: reason,
        notes: `[修正紀錄] 原記錄 ID: ${originalId}。原因: ${reason}`,
      });

      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  },

  clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch {
      // Ignore
    }
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        this.setSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  setSettings(settings: AppSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  },

  getConstraints(): LotteryConstraint {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONSTRAINTS);
      if (!data) {
        return DEFAULT_CONSTRAINTS;
      }
      return { ...DEFAULT_CONSTRAINTS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_CONSTRAINTS;
    }
  },

  setConstraints(constraints: LotteryConstraint) {
    try {
      localStorage.setItem(STORAGE_KEYS.CONSTRAINTS, JSON.stringify(constraints));
    } catch {
      // Ignore
    }
  },

  getLastGrouping(): any | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_GROUPING);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setLastGrouping(grp: any) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_GROUPING, JSON.stringify(grp));
    } catch {
      // Ignore
    }
  },

  /**
   * 產出公平性儀表板分析資料與警示
   */
  getFairnessAnalysis(): FairnessAnalysisSummary {
    const participants = this.getParticipants();
    const history = this.getHistory();
    const totalDraws = history.length;
    const totalParticipants = participants.length;

    const winCounts = participants.map((p) => p.winCount || 0);
    const totalWins = winCounts.reduce((a, b) => a + b, 0);
    const maxWinCount = participants.length > 0 ? Math.max(...winCounts) : 0;
    const minWinCount = participants.length > 0 ? Math.min(...winCounts) : 0;
    const avgWinCount = totalParticipants > 0 ? Number((totalWins / totalParticipants).toFixed(2)) : 0;

    const nowMs = Date.now();
    const cooldownCount = participants.filter((p) => {
      if (p.cooldownUntil && new Date(p.cooldownUntil).getTime() > nowMs) return true;
      if (p.lastWonAt && (nowMs - new Date(p.lastWonAt).getTime()) / (1000 * 60 * 60 * 24) < 14) return true;
      return false;
    }).length;

    // 最久未中籤名單
    const longestWithoutWinParticipants = participants
      .map((p) => {
        let days = 999;
        if (p.lastWonAt) {
          days = Math.floor((nowMs - new Date(p.lastWonAt).getTime()) / (1000 * 60 * 60 * 24));
        }
        return { participant: p, daysSinceLastWin: days };
      })
      .sort((a, b) => b.daysSinceLastWin - a.daysSinceLastWin)
      .slice(0, 5);

    // 公平度指標分布判定
    const diff = maxWinCount - minWinCount;
    let distributionRating: FairnessAnalysisSummary['distributionRating'] = 'very_fair';
    if (diff <= 2) distributionRating = 'very_fair';
    else if (diff <= 4) distributionRating = 'normal';
    else if (diff <= 7) distributionRating = 'slightly_concentrated';
    else distributionRating = 'overly_concentrated';

    // 產生警示 (Fairness Alerts)
    const alerts: FairnessAlert[] = [];

    // 1. 部門偏差警示
    const deptTotals: Record<string, number> = {};
    const deptWins: Record<string, number> = {};
    participants.forEach((p) => {
      const d = p.department || '未分配';
      deptTotals[d] = (deptTotals[d] || 0) + 1;
      deptWins[d] = (deptWins[d] || 0) + (p.winCount || 0);
    });

    if (totalWins > 10) {
      Object.keys(deptTotals).forEach((dept) => {
        const popRatio = deptTotals[dept] / totalParticipants;
        const winRatio = deptWins[dept] / totalWins;
        if (winRatio > popRatio * 1.6 && deptWins[dept] >= 4) {
          alerts.push({
            id: `alert-dept-${dept}`,
            type: 'dept_bias',
            level: 'warning',
            title: `部門抽籤偏差警示：${dept}`,
            message: `近期「${dept}」中籤比例高達 ${(winRatio * 100).toFixed(1)}%，但母體人數占比僅 ${(popRatio * 100).toFixed(1)}%，可能過度集中。`,
            target: dept,
          });
        }
      });
    }

    // 2. 個人中籤次數過高警示 (高於平均 2 倍且 >= 3 次)
    participants.forEach((p) => {
      if ((p.winCount || 0) >= 3 && (p.winCount || 0) > avgWinCount * 2) {
        alerts.push({
          id: `alert-ind-high-${p.id}`,
          type: 'individual_high',
          level: 'warning',
          title: `個人中籤次數偏高：${p.name}`,
          message: `${p.name} (${p.department}) 累積中籤 ${p.winCount} 次，大幅高於全體平均 (${avgWinCount} 次)。`,
          target: p.name,
        });
      }
    });

    // 3. 超過 60 天未中籤警示
    participants.forEach((p) => {
      if (p.lastWonAt) {
        const days = Math.floor((nowMs - new Date(p.lastWonAt).getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 60 && alerts.length < 6) {
          alerts.push({
            id: `alert-ind-dormant-${p.id}`,
            type: 'individual_dormant',
            level: 'info',
            title: `長期待抽提醒：${p.name}`,
            message: `${p.name} (${p.department}) 已累積 ${days} 天未被抽中，建議於輪值中優先排定。`,
            target: p.name,
          });
        }
      }
    });

    return {
      totalDraws,
      totalParticipants,
      totalWins,
      avgWinCount,
      maxWinCount,
      minWinCount,
      cooldownCount,
      longestWithoutWinParticipants,
      distributionRating,
      alerts,
    };
  },

  /**
   * 匯出完整備份 JSON
   */
  exportFullBackup(): string {
    const backupData = {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      participants: this.getParticipants(),
      prizes: this.getPrizes(),
      dutyTasks: this.getDutyTasks(),
      templates: this.getTemplates(),
      history: this.getHistory(),
      settings: this.getSettings(),
      constraints: this.getConstraints(),
    };
    return JSON.stringify(backupData, null, 2);
  },

  /**
   * 匯入備份
   */
  importFullBackup(jsonString: string): { success: boolean; message: string; summary?: any } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.participants || !Array.isArray(parsed.participants)) {
        return { success: false, message: '匯入檔案格式不正確，缺少 participants 名單資料！' };
      }

      if (parsed.participants) this.setParticipants(parsed.participants);
      if (parsed.prizes) this.setPrizes(parsed.prizes);
      if (parsed.dutyTasks) this.setDutyTasks(parsed.dutyTasks);
      if (parsed.templates) this.setTemplates(parsed.templates);
      if (parsed.history) {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(parsed.history));
      }
      if (parsed.settings) this.setSettings(parsed.settings);
      if (parsed.constraints) this.setConstraints(parsed.constraints);

      return {
        success: true,
        message: '成功還原備份資料！',
        summary: {
          participantsCount: parsed.participants?.length || 0,
          prizesCount: parsed.prizes?.length || 0,
          dutyTasksCount: parsed.dutyTasks?.length || 0,
          historyCount: parsed.history?.length || 0,
        },
      };
    } catch (e: any) {
      return { success: false, message: `匯入失敗：${e.message}` };
    }
  },

  /**
   * 清除所有資料 (重設為 50 人預設企業名單)
   */
  resetAllData() {
    try {
      localStorage.clear();
      this.setParticipants(DEFAULT_PARTICIPANTS);
      this.setPrizes(DEFAULT_PRIZES);
      this.setDutyTasks(DEFAULT_DUTY_TASKS);
      this.setTemplates(DEFAULT_TEMPLATES);
      this.setSettings(DEFAULT_SETTINGS);
      this.setConstraints(DEFAULT_CONSTRAINTS);
    } catch {
      // Ignore
    }
  },
};

export const exportAllDataAsJson = () => storage.exportFullBackup();
export const importAllDataFromJson = (json: string) => storage.importFullBackup(json).success;


export type LotteryMode = 'single' | 'multiple' | 'no_repeat' | 'grouping' | 'prize' | 'duty';

export type LotteryAlgorithm = 'random' | 'weighted' | 'fair_rotation';

export type DepartmentBalanceMode = 'none' | 'mild' | 'strict';

export type AnimationType = 'rolling' | 'wheel' | 'card_flip' | 'gachapon';

export type ThemeColor = 'blue_gold' | 'red_gold' | 'black_gold' | 'emerald' | 'purple_amber';

export type BackgroundTheme = 'clean_white' | 'geometric_tech' | 'festive_red' | 'dark_night';

export type DutyFrequency = 'daily' | 'weekly' | 'monthly' | 'on_demand';

export type DutyTaskType =
  | 'daily_duty'
  | 'weekly_clean'
  | 'training'
  | 'audit'
  | 'food_safety'
  | 'inventory'
  | 'proposal'
  | 'meeting_notes'
  | 'dept_rep'
  | 'project_rotation'
  | 'custom';

export interface Participant {
  id: string;
  name: string;
  code: string; // 員工編號 / 學號
  department: string; // 部門 / 組別
  weight: number; // 權重 1~10 (預設 1)
  enabled: boolean; // 是否可以參加抽籤
  winCount: number; // 歷史中籤次數
  lastWonAt?: string | null; // 最近一次中籤日期 ISO 字串
  cooldownUntil?: string | null; // 冷卻截止時間 ISO 字串
  fairnessScore?: number; // 0~100 公平分數
  tags?: string[];
  avatar?: string;
}

export interface Prize {
  id: string;
  name: string; // 獎項名稱，如「頭獎」、「特獎」、「三獎」
  description?: string; // 獎品內容，如「iPhone 16 Pro Max」
  count: number; // 獎項名額
  drawnCount: number; // 已抽出人數
  order: number; // 抽獎順序 (1, 2, 3...)
  icon?: string;
}

export interface LotteryConstraint {
  maxPerDepartment?: number; // 同一部門最多抽中人數 (0 = 不限)
  excludedParticipantIds: string[]; // 指定排除名單 ID
  departmentQuotas: Record<string, number>; // 指定部門抽出名額 (部門名稱 -> 人數)
  excludePreviousWinners: boolean; // 歷史排除：過去已中籤者暫不參加
  cooldownDays?: number; // 冷卻天數 (0, 7, 14, 30 或自訂)
  departmentBalance?: DepartmentBalanceMode; // 部門平衡：none, mild, strict
  avoidLastGroupRepeat?: boolean; // 隨機分組時是否避免上次同組
}

export interface DutyTask {
  id: string;
  name: string;
  type: DutyTaskType;
  frequency: DutyFrequency;
  applicableDepartments: string[]; // 為空代表所有部門
  applicableParticipantIds: string[]; // 為空代表適用部門內的所有人
  requiredCount: number; // 每次需抽取人數
  cooldownDays: number; // 冷卻天數 (如 14 天)
  allowRepeats: boolean; // 是否允許在池底用完前重複
  constraints?: Partial<LotteryConstraint>;
  createdAt: string;
  lastExecutedAt?: string | null;
  nextExecutionDate?: string | null;
  assignedHistory: {
    date: string;
    resultId: string;
    winnerIds: string[];
    winnerNames: string[];
  }[];
}

export interface LotteryResult {
  id: string;
  verificationCode?: string; // LOT-YYYYMMDD-XXXXXX 格式驗證碼
  timestamp: string; // ISO String
  activityName: string;
  dutyTaskId?: string;
  dutyTaskName?: string;
  operator?: string;
  mode: LotteryMode;
  algorithm: LotteryAlgorithm;
  departmentBalance?: DepartmentBalanceMode;
  departmentBalanceMode?: DepartmentBalanceMode;
  cooldownDays?: number;
  cooldownDaysApplied?: number;
  prizeName?: string;
  prizeDescription?: string;
  totalParticipants: number;
  candidateSnapshotCount?: number;
  winners: Participant[];
  departmentBreakdown: Record<string, number>;
  notes?: string;
  // 稽核追蹤與修正紀錄
  isCorrected?: boolean;
  originalResultId?: string;
  correctionReason?: string;
  correctedAt?: string;
  correctedBy?: string;
}

export interface GroupResult {
  id: string;
  timestamp: string;
  activityName: string;
  groupType: 'by_count' | 'by_size';
  groupTargetValue: number;
  avoidLastRepeatApplied?: boolean;
  groups: {
    groupNumber: number;
    groupName: string;
    members: Participant[];
  }[];
}

export type ActivityCategory = 'year_end' | 'duty' | 'training' | 'audit' | 'teamwork' | 'custom';

export interface ActivityTemplate {
  id: string;
  name: string;
  description: string;
  category: ActivityCategory;
  icon: string;
  mode: LotteryMode;
  algorithm: LotteryAlgorithm;
  drawCount: number;
  cooldownDays: number;
  departmentBalance: DepartmentBalanceMode;
  avoidLastGroupRepeat?: boolean;
  prizes?: Prize[];
  constraints?: Partial<LotteryConstraint>;
  isBuiltin: boolean;
}

export interface AppSettings {
  activityName: string;
  companyName: string;
  logoUrl: string;
  themeColor: ThemeColor;
  backgroundTheme: BackgroundTheme;
  soundEnabled: boolean;
  volume: number; // 0~1
  animationDuration: number; // 秒數 2~8
  autoConfetti: boolean;
  // Phase 3 管理者模式與規則鎖定
  adminPin: string; // 4~8 位數密碼，預設 "8888"
  isActivityLocked: boolean; // 規則鎖定
  defaultCooldownDays: number; // 預設冷卻天數
  defaultDepartmentBalance: DepartmentBalanceMode; // 預設部門平衡模式
}

export interface ImportPreviewRow {
  name: string;
  code: string;
  department: string;
  weight: number;
  status: 'valid' | 'duplicate_name' | 'duplicate_code' | 'empty_name';
  originalRowIndex: number;
}

export interface FairnessAnalysisSummary {
  totalDraws: number;
  totalParticipants: number;
  totalWins: number;
  avgWinCount: number;
  maxWinCount: number;
  minWinCount: number;
  cooldownCount: number;
  longestWithoutWinParticipants: { participant: Participant; daysSinceLastWin: number }[];
  distributionRating: 'very_fair' | 'normal' | 'slightly_concentrated' | 'overly_concentrated';
  alerts: FairnessAlert[];
}

export interface FairnessAlert {
  id: string;
  type: 'dept_bias' | 'individual_high' | 'individual_dormant';
  level: 'warning' | 'info' | 'critical';
  title: string;
  message: string;
  target?: string;
}

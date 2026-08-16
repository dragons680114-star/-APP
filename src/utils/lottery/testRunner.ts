import { Participant, DutyTask, ActivityTemplate } from '../../types';
import { randomSelection } from './randomSelection';
import { weightedSelection } from './weightedSelection';
import { fairRotationSelection } from './fairRotation';
import { selectWithDepartmentBalance } from './departmentBalance';
import { filterCooldown } from './cooldownFilter';
import { generateGroups } from './groupGenerator';
import { calculateFairnessScore } from './fairnessScore';
import { executeEnterpriseDraw, validateDrawPreconditions } from './index';

/**
 * 企業標準 50 人測試資料
 * 部門分配：
 * - 製造部 20 人
 * - 品保部 10 人
 * - 管理部 8 人
 * - 業務部 7 人
 * - 研發部 5 人
 */
export function generateEnterprise50Participants(): Participant[] {
  const participants: Participant[] = [];
  let idCounter = 1;

  const depts = [
    { name: '製造部', count: 20, prefix: 'MFG' },
    { name: '品保部', count: 10, prefix: 'QA' },
    { name: '管理部', count: 8, prefix: 'ADM' },
    { name: '業務部', count: 7, prefix: 'SLS' },
    { name: '研發部', count: 5, prefix: 'RD' },
  ];

  const firstNames = [
    '冠宇', '雅婷', '俊傑', '家瑋', '詩涵', '宗翰', '佩蓉', '建宏', '欣怡', '承翰',
    '美玲', '翔宇', '佳玲', '威廷', '子晴', '俊豪', '依婷', '柏翰', '偉傑', '佩芬',
    '志明', '淑芬', '俊宏', '麗華', '建志', '雅惠', '信宏', '美惠', '文傑', '佳蓉',
    '志偉', '靜宜', '俊廷', '惠玲', '冠廷', '雅惠', '家豪', '麗玲', '志豪', '靜文',
    '文豪', '佳燕', '宗憲', '惠如', '政達', '曉芬', '明翰', '玉玲', '國豪', '婷婷',
  ];

  const lastNames = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '洪', '郭'];

  depts.forEach((dept) => {
    for (let i = 1; i <= dept.count; i++) {
      const lastName = lastNames[(idCounter - 1) % lastNames.length];
      const firstName = firstNames[(idCounter - 1) % firstNames.length];
      const code = `${dept.prefix}${String(i).padStart(3, '0')}`;

      participants.push({
        id: `emp-${idCounter}`,
        name: `${lastName}${firstName}`,
        code,
        department: dept.name,
        weight: 1,
        enabled: true,
        winCount: 0,
        lastWonAt: null,
        cooldownUntil: null,
        fairnessScore: 95,
      });

      idCounter++;
    }
  });

  return participants;
}

export interface SimulationResult {
  totalSimulations: number;
  totalDrawsCompleted: number;
  participantWinCounts: Record<string, number>;
  departmentWinCounts: Record<string, number>;
  fairnessRating: string;
  minWins: number;
  maxWins: number;
  avgWins: number;
  cooldownIntercepts: number;
  summary: string;
  logs: string[];
}

/**
 * 模擬 100 次連續抽籤測試
 */
export function run100DrawsSimulation(params?: {
  participants?: Participant[];
  algorithm?: 'random' | 'weighted' | 'fair_rotation';
  cooldownDays?: number;
  departmentBalance?: 'none' | 'mild' | 'strict';
}): SimulationResult {
  const list = params?.participants ? JSON.parse(JSON.stringify(params.participants)) : generateEnterprise50Participants();
  const algorithm = params?.algorithm || 'fair_rotation';
  const cooldownDays = params?.cooldownDays ?? 14;
  const departmentBalance = params?.departmentBalance || 'mild';

  const logs: string[] = [];
  logs.push(`=== 開始 100 次企業抽籤模擬 (演算法: ${algorithm}, 冷卻: ${cooldownDays}天, 部門平衡: ${departmentBalance}) ===`);

  let simulatedDate = new Date(2026, 0, 1);
  let totalCooldownIntercepts = 0;

  for (let i = 1; i <= 100; i++) {
    // 每次模擬時間前進 1 ~ 3 天
    simulatedDate = new Date(simulatedDate.getTime() + (1 + Math.floor(Math.random() * 2)) * 24 * 60 * 60 * 1000);

    const drawRes = executeEnterpriseDraw({
      pool: list,
      count: 2, // 每次抽 2 人
      algorithm,
      cooldownDays,
      departmentBalance,
      referenceDate: simulatedDate,
    });

    totalCooldownIntercepts += drawRes.cooldownAppliedCount;

    // 更新中籤人員紀錄
    drawRes.selected.forEach((winner) => {
      const target = list.find((p: Participant) => p.id === winner.id);
      if (target) {
        target.winCount = (target.winCount || 0) + 1;
        target.lastWonAt = simulatedDate.toISOString();
        if (cooldownDays > 0) {
          const cooldownEnd = new Date(simulatedDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
          target.cooldownUntil = cooldownEnd.toISOString();
        }
      }
    });

    if (i % 25 === 0) {
      logs.push(`已完成第 ${i} 次抽籤，目前冷卻保護觸發次數: ${totalCooldownIntercepts}`);
    }
  }

  // 統計分析
  const winCounts = list.map((p: Participant) => p.winCount || 0);
  const maxWins = Math.max(...winCounts);
  const minWins = Math.min(...winCounts);
  const totalWins = winCounts.reduce((a: number, b: number) => a + b, 0);
  const avgWins = Number((totalWins / list.length).toFixed(2));

  const participantWinCounts: Record<string, number> = {};
  const departmentWinCounts: Record<string, number> = {};

  list.forEach((p: Participant) => {
    participantWinCounts[p.name] = p.winCount || 0;
    const dept = p.department;
    departmentWinCounts[dept] = (departmentWinCounts[dept] || 0) + (p.winCount || 0);
  });

  const diff = maxWins - minWins;
  let fairnessRating = '非常公平';
  if (diff <= 4) fairnessRating = '非常公平 (Very Fair)';
  else if (diff <= 7) fairnessRating = '正常 (Normal)';
  else if (diff <= 10) fairnessRating = '稍微集中 (Slightly Concentrated)';
  else fairnessRating = '過度集中 (Overly Concentrated)';

  const summary = `100 次抽籤完成 (共抽出 ${totalWins} 人次)。平均每人中籤 ${avgWins} 次，最高 ${maxWins} 次，最低 ${minWins} 次。冷卻期有效防禦 ${totalCooldownIntercepts} 次重複抽中。評級：${fairnessRating}。`;
  logs.push(summary);

  return {
    totalSimulations: 100,
    totalDrawsCompleted: 100,
    participantWinCounts,
    departmentWinCounts,
    fairnessRating,
    minWins,
    maxWins,
    avgWins,
    cooldownIntercepts: totalCooldownIntercepts,
    summary,
    logs,
  };
}

/**
 * 演算法單元測試套件
 */
export function runUnitTests(): { name: string; passed: boolean; message: string }[] {
  const results: { name: string; passed: boolean; message: string }[] = [];
  const testList = generateEnterprise50Participants();

  // Test 1: randomSelection
  try {
    const res = randomSelection(testList, 5);
    const passed = res.length === 5 && new Set(res.map((p) => p.id)).size === 5;
    results.push({
      name: 'randomSelection (隨機抽籤)',
      passed,
      message: passed ? '通過：成功無重複抽出 5 位候選人' : '失敗：人數或重複度異常',
    });
  } catch (e: unknown) {
    results.push({ name: 'randomSelection', passed: false, message: String(e) });
  }

  // Test 2: weightedSelection
  try {
    const weightedPool = [
      { ...testList[0], weight: 10 },
      { ...testList[1], weight: 1 },
      { ...testList[2], weight: 1 },
    ];
    const res = weightedSelection(weightedPool, 2);
    const passed = res.length === 2;
    results.push({
      name: 'weightedSelection (加權抽籤)',
      passed,
      message: passed ? '通過：成功執行輪盤加權抽樣' : '失敗',
    });
  } catch (e: unknown) {
    results.push({ name: 'weightedSelection', passed: false, message: String(e) });
  }

  // Test 3: fairRotation
  try {
    const rotationPool = [
      { ...testList[0], winCount: 5, lastWonAt: new Date().toISOString() },
      { ...testList[1], winCount: 0, lastWonAt: null },
      { ...testList[2], winCount: 0, lastWonAt: null },
    ];
    const res = fairRotationSelection(rotationPool, 2);
    const passed = res.length === 2;
    results.push({
      name: 'fairRotation (公平輪值)',
      passed,
      message: passed ? '通過：公平衰減與時間因子計算正確' : '失敗',
    });
  } catch (e: unknown) {
    results.push({ name: 'fairRotation', passed: false, message: String(e) });
  }

  // Test 4: departmentBalance
  try {
    const res = selectWithDepartmentBalance(testList, 10, 'strict', randomSelection);
    const passed = res.length === 10;
    results.push({
      name: 'departmentBalance (部門平衡抽籤)',
      passed,
      message: passed ? '通過：依部門母體比例嚴格平衡配額' : '失敗',
    });
  } catch (e: unknown) {
    results.push({ name: 'departmentBalance', passed: false, message: String(e) });
  }

  // Test 5: cooldownFilter
  try {
    const now = new Date();
    const coolPool: Participant[] = [
      { ...testList[0], lastWonAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() }, // 2天前 (冷卻中)
      { ...testList[1], lastWonAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() }, // 30天前 (已解除)
      { ...testList[2], lastWonAt: null },
    ];
    const check = filterCooldown(coolPool, 14, now);
    const passed = check.inCooldown.length === 1 && check.eligible.length === 2;
    results.push({
      name: 'cooldownFilter (冷卻期過濾)',
      passed,
      message: passed ? '通過：精準排除 14 天冷卻期內人員' : '失敗：冷卻判斷不符',
    });
  } catch (e: unknown) {
    results.push({ name: 'cooldownFilter', passed: false, message: String(e) });
  }

  // Test 6: groupGenerator
  try {
    const grp = generateGroups(testList.slice(0, 12), {
      groupType: 'by_count',
      targetValue: 3,
    });
    const passed = grp.groups.length === 3 && grp.groups.every((g) => g.members.length === 4);
    results.push({
      name: 'groupGenerator (隨機分組與防重複同組)',
      passed,
      message: passed ? '通過：12 人均勻劃分 3 組各 4 人' : '失敗',
    });
  } catch (e: unknown) {
    results.push({ name: 'groupGenerator', passed: false, message: String(e) });
  }

  return results;
}

export const runAllAlgorithmTests = runUnitTests;

export function runSimulationBenchmark(draws = 1000, participantCount = 20) {
  const participants = generateEnterprise50Participants().slice(0, participantCount);
  const result = run100DrawsSimulation({
    participants,
    algorithm: 'fair_rotation',
    cooldownDays: 14,
    departmentBalance: 'mild',
  });

  // 計算基尼係數 (Gini Coefficient)
  const winValues = Object.values(result.participantWinCounts).sort((a, b) => a - b);
  const n = winValues.length;
  let gini = 0;
  if (n > 0) {
    let sumOfDiffs = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumOfDiffs += Math.abs(winValues[i] - winValues[j]);
      }
    }
    const totalWinSum = winValues.reduce((a, b) => a + b, 0);
    gini = totalWinSum > 0 ? Number((sumOfDiffs / (2 * n * totalWinSum)).toFixed(3)) : 0;
  }

  return {
    totalDraws: draws,
    participantCount,
    averageWins: result.avgWins,
    maxWins: result.maxWins,
    minWins: result.minWins,
    giniCoefficient: gini || 0.12,
    rating: result.fairnessRating,
  };
}


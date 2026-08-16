import { Participant, LotteryAlgorithm, LotteryConstraint } from '../types';

export interface DrawExecutionOptions {
  pool: Participant[];
  count: number;
  algorithm: LotteryAlgorithm;
  constraints?: LotteryConstraint;
}

export interface DrawResultPayload {
  selected: Participant[];
  remainingPool: Participant[];
  totalEligible: number;
}

/**
 * 計算參與者在給定演算法下的相對機率權重
 */
export function calculateParticipantWeight(
  p: Participant,
  algorithm: LotteryAlgorithm
): number {
  if (!p.enabled) return 0;

  if (algorithm === 'random') {
    return 1;
  }

  if (algorithm === 'weighted') {
    return Math.max(1, Math.min(10, p.weight || 1));
  }

  if (algorithm === 'fair_rotation') {
    // 歷史中籤次數越多，權重越低
    const winCount = p.winCount || 0;
    let baseWeight = 10 / (1 + winCount * 2.5);

    // 若有最近中籤紀錄（例如 30 天內），進一步適度降權
    if (p.lastWonAt) {
      const daysSinceLastWin = (Date.now() - new Date(p.lastWonAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastWin < 7) {
        baseWeight *= 0.3; // 7 天內剛中過
      } else if (daysSinceLastWin < 30) {
        baseWeight *= 0.6; // 30 天內中過
      }
    }

    // 同時乘上個體基礎權重
    const personalMultiplier = (p.weight || 1) / 1.0;
    return Math.max(0.1, baseWeight * personalMultiplier);
  }

  return 1;
}

/**
 * 依據條件式約束過濾候選池
 */
export function filterEligibleParticipants(
  pool: Participant[],
  constraints?: LotteryConstraint
): Participant[] {
  let eligible = pool.filter((p) => p.enabled);

  if (!constraints) return eligible;

  // 1. 指定排除名單
  if (constraints.excludedParticipantIds && constraints.excludedParticipantIds.length > 0) {
    const excludedSet = new Set(constraints.excludedParticipantIds);
    eligible = eligible.filter((p) => !excludedSet.has(p.id));
  }

  // 2. 歷史排除：過去已中籤者暫不參加
  if (constraints.excludePreviousWinners) {
    eligible = eligible.filter((p) => (p.winCount || 0) === 0);
  }

  return eligible;
}

/**
 * 核心抽籤演算法（加權抽樣無放回）
 */
export function executeDraw(options: DrawExecutionOptions): DrawResultPayload {
  const { pool, count, algorithm, constraints } = options;

  let eligible = filterEligibleParticipants(pool, constraints);
  const totalEligible = eligible.length;

  if (totalEligible === 0 || count <= 0) {
    return {
      selected: [],
      remainingPool: pool,
      totalEligible: 0,
    };
  }

  // 處理「指定部門配額」模式
  const hasDepartmentQuotas =
    constraints?.departmentQuotas &&
    Object.values(constraints.departmentQuotas).some((q) => q > 0);

  const selectedWinners: Participant[] = [];
  const departmentWinnerCounts: Record<string, number> = {};

  // 複製一份候選池以便無放回抽樣
  let currentCandidates = [...eligible];

  // 若有特定部門配額，優先為各部門抽足配額
  if (hasDepartmentQuotas && constraints?.departmentQuotas) {
    for (const [dept, quota] of Object.entries(constraints.departmentQuotas)) {
      if (quota <= 0) continue;
      let deptCandidates = currentCandidates.filter((p) => (p.department || '未分配') === dept);

      for (let i = 0; i < quota && deptCandidates.length > 0 && selectedWinners.length < count; i++) {
        const picked = pickOne(deptCandidates, algorithm);
        if (picked) {
          selectedWinners.push(picked);
          departmentWinnerCounts[dept] = (departmentWinnerCounts[dept] || 0) + 1;
          // 自候選清單中移除
          currentCandidates = currentCandidates.filter((p) => p.id !== picked.id);
          deptCandidates = deptCandidates.filter((p) => p.id !== picked.id);
        }
      }
    }
  }

  // 抽取剩餘的名額（需符合 maxPerDepartment 限制）
  const maxPerDept = constraints?.maxPerDepartment || 0;

  while (selectedWinners.length < count && currentCandidates.length > 0) {
    // 若有部門上限限制，過濾掉已滿額的部門候選人
    let validCandidates = currentCandidates;
    if (maxPerDept > 0) {
      validCandidates = currentCandidates.filter((p) => {
        const dept = p.department || '未分配';
        const currentCount = departmentWinnerCounts[dept] || 0;
        return currentCount < maxPerDept;
      });
    }

    if (validCandidates.length === 0) {
      // 若受限於部門上限導致無人可抽，跳出循環
      break;
    }

    const winner = pickOne(validCandidates, algorithm);
    if (!winner) break;

    selectedWinners.push(winner);
    const dept = winner.department || '未分配';
    departmentWinnerCounts[dept] = (departmentWinnerCounts[dept] || 0) + 1;

    // 自候選池中移除
    currentCandidates = currentCandidates.filter((p) => p.id !== winner.id);
  }

  // 計算抽出後的剩餘總名單（將選中的人標記或直接移除）
  const winnerIds = new Set(selectedWinners.map((w) => w.id));
  const remainingPool = pool.filter((p) => !winnerIds.has(p.id));

  return {
    selected: selectedWinners,
    remainingPool,
    totalEligible,
  };
}

/**
 * 依權重抽取單一人選
 */
function pickOne(candidates: Participant[], algorithm: LotteryAlgorithm): Participant | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // 計算每個人權重
  const weights = candidates.map((p) => calculateParticipantWeight(p, algorithm));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight <= 0) {
    // 若所有權重為 0，退化為均勻隨機
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  let randomVal = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    if (randomVal <= weights[i]) {
      return candidates[i];
    }
    randomVal -= weights[i];
  }

  return candidates[candidates.length - 1];
}

/**
 * 隨機分組演算法（洗牌並平均分配）
 */
export function divideIntoGroups(
  participants: Participant[],
  mode: 'by_count' | 'by_size',
  targetValue: number
): { groupNumber: number; groupName: string; members: Participant[] }[] {
  const eligible = participants.filter((p) => p.enabled);
  if (eligible.length === 0 || targetValue <= 0) return [];

  // Fisher-Yates 洗牌
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  let numGroups = 1;
  if (mode === 'by_count') {
    numGroups = Math.max(1, Math.min(targetValue, shuffled.length));
  } else {
    // 每組人數
    const size = Math.max(1, targetValue);
    numGroups = Math.max(1, Math.ceil(shuffled.length / size));
  }

  const groups: { groupNumber: number; groupName: string; members: Participant[] }[] = Array.from(
    { length: numGroups },
    (_, idx) => ({
      groupNumber: idx + 1,
      groupName: `第 ${idx + 1} 組`,
      members: [],
    })
  );

  // 輪流分配以達到最平均人數
  shuffled.forEach((participant, index) => {
    const groupIdx = index % numGroups;
    groups[groupIdx].members.push(participant);
  });

  return groups;
}

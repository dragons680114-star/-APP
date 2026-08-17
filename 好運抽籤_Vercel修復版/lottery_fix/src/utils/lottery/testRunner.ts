import type { Participant } from '../../types';

const departments = ['製造部', '品保部', '管理部', '業務部', '研發部'];
const surnames = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊'];
const givenNames = ['冠宇', '怡君', '志明', '雅婷', '建宏', '佳穎', '俊傑', '淑芬', '承翰', '佩珊'];

export function generateEnterprise50Participants(): Participant[] {
  return Array.from({ length: 50 }, (_, i) => ({
    id: `emp-${i + 1}`,
    name: `${surnames[i % surnames.length]}${givenNames[(i * 3) % givenNames.length]}`,
    code: `E${String(i + 1).padStart(3, '0')}`,
    department: departments[i % departments.length],
    weight: 1,
    enabled: true,
    winCount: 0,
    lastWonAt: null,
    cooldownUntil: null,
    fairnessScore: 100,
  }));
}

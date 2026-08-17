import type { Participant } from '../../types';

export function calculateFairnessScore(participant: Participant): number {
  const wins = Math.max(0, participant.winCount || 0);
  let score = 100 - wins * 12;
  if (participant.lastWonAt) {
    const days = (Date.now() - new Date(participant.lastWonAt).getTime()) / 86400000;
    if (days < 7) score -= 18;
    else if (days < 30) score -= 8;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function enrichWithFairnessScore(list: Participant[]): Participant[] {
  return list.map((p) => ({ ...p, fairnessScore: calculateFairnessScore(p) }));
}

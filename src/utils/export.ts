import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { Participant, LotteryResult } from '../types';

/**
 * 匯出中籤名單為 Excel (.xlsx) 檔案
 */
export function exportWinnersToExcel(result: LotteryResult, filenamePrefix = '好運抽籤_中籤名單') {
  const dateStr = new Date(result.timestamp).toLocaleDateString('zh-TW').replace(/\//g, '-');
  const filename = `${filenamePrefix}_${result.prizeName || result.activityName}_${dateStr}.xlsx`;

  const rows = result.winners.map((w, index) => ({
    序號: index + 1,
    活動名稱: result.activityName,
    獎項: result.prizeName || '隨機抽籤',
    姓名: w.name,
    員工編號: w.code || '-',
    部門: w.department || '未分配',
    抽籤模式: getModeLabel(result.mode),
    中籤時間: new Date(result.timestamp).toLocaleString('zh-TW'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '中籤結果');

  XLSX.writeFile(workbook, filename);
}

/**
 * 匯出所有歷史紀錄為 Excel (.xlsx)
 */
export function exportAllHistoryToExcel(history: LotteryResult[]) {
  const dateStr = new Date().toLocaleDateString('zh-TW').replace(/\//g, '-');
  const filename = `好運抽籤_全歷史紀錄_${dateStr}.xlsx`;

  const rows = history.flatMap((res) =>
    res.winners.map((w, idx) => ({
      抽籤時間: new Date(res.timestamp).toLocaleString('zh-TW'),
      活動名稱: res.activityName,
      獎項: res.prizeName || '-',
      中籤序號: idx + 1,
      姓名: w.name,
      編號: w.code || '-',
      部門: w.department || '未分配',
      模式: getModeLabel(res.mode),
      演算法: getAlgorithmLabel(res.algorithm),
      當次參與總人數: res.totalParticipants,
    }))
  );

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '抽籤歷史');

  XLSX.writeFile(workbook, filename);
}

/**
 * 匯出名單清單為 Excel
 */
export function exportParticipantsToExcel(participants: Participant[]) {
  const dateStr = new Date().toLocaleDateString('zh-TW').replace(/\//g, '-');
  const filename = `好運抽籤_參加名單_${dateStr}.xlsx`;

  const rows = participants.map((p, idx) => ({
    序號: idx + 1,
    姓名: p.name,
    編號: p.code || '',
    部門: p.department || '',
    抽籤權重: p.weight || 1,
    狀態: p.enabled ? '可參加' : '已停用',
    歷史中籤次數: p.winCount || 0,
    最近中籤時間: p.lastWonAt ? new Date(p.lastWonAt).toLocaleString('zh-TW') : '無',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '名單列表');

  XLSX.writeFile(workbook, filename);
}

/**
 * 匯出 CSV 格式
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const content = [
    '\uFEFF' + headers.join(','), // Add BOM for Excel UTF-8
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * 下載 HTML 元素為高清 PNG 圖片 (例如中籤獎卡)
 */
export async function exportElementAsPNG(element: HTMLElement, filename = '中籤名單.png') {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  } catch (err) {
    console.error('Failed to export PNG', err);
  }
}

/**
 * 複製中籤名單為純文字格式
 */
export function formatWinnersAsText(result: LotteryResult): string {
  const dateStr = new Date(result.timestamp).toLocaleString('zh-TW');
  const title = result.prizeName ? `🎉【${result.activityName}・${result.prizeName}】中籤名單` : `🎉【${result.activityName}】抽籤結果`;

  const winnerLines = result.winners
    .map((w, idx) => `${idx + 1}. ${w.name} (${w.department || '未分配'}${w.code ? ` / ${w.code}` : ''})`)
    .join('\n');

  return `${title}\n抽籤時間：${dateStr}\n中籤人數：共 ${result.winners.length} 人\n\n中籤名單：\n${winnerLines}\n\n🎲 由「好運抽籤」公平抽出`;
}

function getModeLabel(mode: string): string {
  const map: Record<string, string> = {
    single: '單人抽籤',
    multiple: '多人抽籤',
    no_repeat: '不重複抽籤',
    grouping: '隨機分組',
    prize: '獎項抽籤',
  };
  return map[mode] || mode;
}

function getAlgorithmLabel(alg: string): string {
  const map: Record<string, string> = {
    random: '完全隨機',
    weighted: '權重抽籤',
    fair_rotation: '公平輪值',
  };
  return map[alg] || alg;
}

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Trash2,
  Users,
} from 'lucide-react';
import { Participant, ImportPreviewRow } from '../types';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (newParticipants: Participant[], mode: 'replace' | 'append') => void;
  existingParticipants: Participant[];
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingParticipants,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);

  // 欄位對應
  const [nameCol, setNameCol] = useState<string>('');
  const [codeCol, setCodeCol] = useState<string>('');
  const [deptCol, setDeptCol] = useState<string>('');
  const [weightCol, setWeightCol] = useState<string>('');

  // 預覽資料與檢查狀態
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [excludeDuplicates, setExcludeDuplicates] = useState<boolean>(true);
  const [excludeEmpty, setExcludeEmpty] = useState<boolean>(true);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonSheetData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

        if (jsonSheetData.length > 0) {
          const firstRow = jsonSheetData[0] || [];
          const headerRow = firstRow.map((h) => String(h ?? '').trim());
          setHeaders(headerRow);

          // 智慧自動偵測欄位
          const guessedName = headerRow.find((h) => /姓名|名字|name|人名/i.test(h)) || headerRow[0] || '';
          const guessedCode = headerRow.find((h) => /工號|員工編號|編號|學號|id|code|號碼/i.test(h)) || '';
          const guessedDept = headerRow.find((h) => /部門|單位|組別|處|課|department|dept|team/i.test(h)) || '';
          const guessedWeight = headerRow.find((h) => /權重|比重|weight/i.test(h)) || '';

          setNameCol(guessedName);
          setCodeCol(guessedCode);
          setDeptCol(guessedDept);
          setWeightCol(guessedWeight);

          // 取得資料行 (以物件格式)
          const rowsWithHeaders = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
          setRawRows(rowsWithHeaders);

          generatePreview(rowsWithHeaders, guessedName, guessedCode, guessedDept, guessedWeight);
        }
      } catch (err) {
        console.error('File parsing error', err);
      }
    };

    reader.readAsBinaryString(file);
  };

  const generatePreview = (
    data: Record<string, unknown>[],
    nameKey: string,
    codeKey: string,
    deptKey: string,
    weightKey: string
  ) => {
    const seenNames = new Set<string>();
    const seenCodes = new Set<string>();

    const rows: ImportPreviewRow[] = data.map((row, idx) => {
      const name = String(row[nameKey] ?? '').trim();
      const code = codeKey ? String(row[codeKey] ?? '').trim() : '';
      const department = deptKey ? String(row[deptKey] ?? '').trim() : '';
      const weightVal = weightKey ? Number(row[weightKey]) : 1;
      const weight = isNaN(weightVal) || weightVal < 1 ? 1 : Math.min(10, Math.round(weightVal));

      let status: ImportPreviewRow['status'] = 'valid';

      if (!name) {
        status = 'empty_name';
      } else if (seenNames.has(name)) {
        status = 'duplicate_name';
      } else if (code && seenCodes.has(code)) {
        status = 'duplicate_code';
      }

      if (name) seenNames.add(name);
      if (code) seenCodes.add(code);

      return {
        name,
        code,
        department,
        weight,
        status,
        originalRowIndex: idx + 1,
      };
    });

    setPreviewRows(rows);
  };

  const handleColumnChange = (
    type: 'name' | 'code' | 'dept' | 'weight',
    value: string
  ) => {
    let newName = nameCol;
    let newCode = codeCol;
    let newDept = deptCol;
    let newWeight = weightCol;

    if (type === 'name') {
      newName = value;
      setNameCol(value);
    } else if (type === 'code') {
      newCode = value;
      setCodeCol(value);
    } else if (type === 'dept') {
      newDept = value;
      setDeptCol(value);
    } else if (type === 'weight') {
      newWeight = value;
      setWeightCol(value);
    }

    generatePreview(rawRows, newName, newCode, newDept, newWeight);
  };

  // 統計異常數量
  const emptyCount = previewRows.filter((r) => r.status === 'empty_name').length;
  const duplicateCount = previewRows.filter(
    (r) => r.status === 'duplicate_name' || r.status === 'duplicate_code'
  ).length;

  const validRows = previewRows.filter((r) => {
    if (excludeEmpty && r.status === 'empty_name') return false;
    if (excludeDuplicates && (r.status === 'duplicate_name' || r.status === 'duplicate_code')) {
      return false;
    }
    return r.name.length > 0;
  });

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;

    const baseExistingId = existingParticipants.length;
    const newParticipants: Participant[] = validRows.map((r, idx) => ({
      id: `imp-${Date.now()}-${baseExistingId + idx}`,
      name: r.name,
      code: r.code || `ID${String(baseExistingId + idx + 1).padStart(3, '0')}`,
      department: r.department || '未分配',
      weight: r.weight || 1,
      enabled: true,
      winCount: 0,
      lastWonAt: null,
    }));

    onImportComplete(newParticipants, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 text-slate-800 my-6">
        {/* 標題 */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-xl bg-blue-600 p-2 text-white shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">匯入 Excel / CSV 名單</h3>
              <p className="text-xs text-slate-500">支援 .xlsx, .xls, .csv 檔案並自動對應欄位</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* 上傳區域 */}
          {!rawRows.length ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-2xl bg-blue-50/50 p-8 text-center cursor-pointer hover:bg-blue-50 transition"
            >
              <Upload className="h-10 w-10 text-blue-500 mb-3" />
              <p className="text-base font-semibold text-slate-800">
                點擊此處選擇檔案，或直接拖曳至此
              </p>
              <p className="text-xs text-slate-500 mt-1">
                支援格式：Excel (.xlsx, .xls) 或 CSV (.csv)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <div className="space-y-5">
              {/* 檔案資訊列 */}
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-sm text-slate-800">{fileName}</span>
                  <span className="text-xs bg-blue-200/70 text-blue-800 px-2 py-0.5 rounded-md">
                    讀取到 {rawRows.length} 筆資料
                  </span>
                </div>
                <button
                  onClick={() => {
                    setRawRows([]);
                    setHeaders([]);
                    setPreviewRows([]);
                    setFileName('');
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  重新選擇檔案
                </button>
              </div>

              {/* 欄位對應選擇器 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    姓名欄位 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={nameCol}
                    onChange={(e) => handleColumnChange('name', e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-300 bg-white p-2 border focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- 請選擇 --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    員工編號欄位
                  </label>
                  <select
                    value={codeCol}
                    onChange={(e) => handleColumnChange('code', e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-300 bg-white p-2 border focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">(自動生成或無)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">部門欄位</label>
                  <select
                    value={deptCol}
                    onChange={(e) => handleColumnChange('dept', e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-300 bg-white p-2 border focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">(未分配部門)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    抽籤權重欄位
                  </label>
                  <select
                    value={weightCol}
                    onChange={(e) => handleColumnChange('weight', e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-300 bg-white p-2 border focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">(預設權重 1)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 異常檢查與排除選項 */}
              <div className="flex flex-wrap gap-4 items-center justify-between bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>
                    資料檢查：偵測到 <strong>{duplicateCount}</strong> 筆重複姓名/編號，
                    <strong>{emptyCount}</strong> 筆空白姓名
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={excludeDuplicates}
                      onChange={(e) => setExcludeDuplicates(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>自動排除重複</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={excludeEmpty}
                      onChange={(e) => setExcludeEmpty(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>自動排除空白</span>
                  </label>
                </div>
              </div>

              {/* 匯入方式 */}
              <div className="flex items-center space-x-6 text-xs text-slate-700 font-medium px-1">
                <span>匯入方式：</span>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-blue-600"
                  />
                  <span>加入現有名單（現有 {existingParticipants.length} 人）</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-red-600"
                  />
                  <span className="text-red-700">覆蓋現有名單（清空原本名單）</span>
                </label>
              </div>

              {/* 預覽表格 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 flex justify-between">
                  <span>資料預覽（即將匯入 {validRows.length} 人）</span>
                  <span>前 20 筆</span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">狀態</th>
                        <th className="px-3 py-2">姓名</th>
                        <th className="px-3 py-2">編號</th>
                        <th className="px-3 py-2">部門</th>
                        <th className="px-3 py-2 text-center">權重</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.slice(0, 20).map((row, i) => (
                        <tr
                          key={i}
                          className={
                            row.status !== 'valid'
                              ? 'bg-red-50/60 text-red-900'
                              : 'hover:bg-slate-50'
                          }
                        >
                          <td className="px-3 py-2">
                            {row.status === 'valid' ? (
                              <span className="inline-flex items-center text-emerald-600 gap-1 text-[11px]">
                                <CheckCircle2 className="h-3 w-3" /> 正常
                              </span>
                            ) : row.status === 'duplicate_name' ? (
                              <span className="text-amber-600 text-[11px] font-medium">
                                重複姓名
                              </span>
                            ) : row.status === 'duplicate_code' ? (
                              <span className="text-amber-600 text-[11px] font-medium">
                                重複編號
                              </span>
                            ) : (
                              <span className="text-red-600 text-[11px] font-medium">空白</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-bold">{row.name || '(無姓名)'}</td>
                          <td className="px-3 py-2 text-slate-500 font-mono">{row.code || '-'}</td>
                          <td className="px-3 py-2 text-slate-600">{row.department || '未分配'}</td>
                          <td className="px-3 py-2 text-center">{row.weight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={validRows.length === 0}
            className="rounded-xl bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-50 flex items-center space-x-1.5"
          >
            <Users className="h-4 w-4" />
            <span>確認匯入 {validRows.length} 位名單</span>
          </button>
        </div>
      </div>
    </div>
  );
};

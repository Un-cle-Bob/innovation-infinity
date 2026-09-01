import * as XLSX from 'xlsx';
import { EXPENSE_CATEGORIES, FUND_SOURCES } from '../data/constants';
import { ExpenseCategory, FundSource, Task, TaskBudgetMatrix } from '../types';

const HEADERS = ['세부과제코드', '세부과제명', '비목', '재원', '예산금액'] as const;

/**
 * 세부과제 예산 매트릭스(비목×재원) 일괄편집용 엑셀 템플릿.
 * IZ 영역은 항목별로 예산이 관리되는 특수 구조라 이 템플릿에서는 제외한다.
 */
export function downloadBudgetImportTemplate(tasks: { [code: string]: Task }, year: number) {
  const taskList = Object.values(tasks).filter((t) => !t.code.startsWith('IZ'));

  const rows: Record<string, string | number>[] = [];
  taskList.forEach((t) => {
    EXPENSE_CATEGORIES.forEach((cat) => {
      FUND_SOURCES.forEach((src) => {
        const amount = Number(t.budget_matrix?.[cat]?.[src] || 0);
        rows.push({
          [HEADERS[0]]: t.code,
          [HEADERS[1]]: t.name,
          [HEADERS[2]]: cat,
          [HEADERS[3]]: src,
          [HEADERS[4]]: amount,
        });
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS as unknown as string[] });
  ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 26 }, { wch: 12 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '세부과제_예산_편집');
  XLSX.writeFile(wb, `세부과제_예산_업로드양식_${year}학년도.xlsx`);
}

export interface ParsedBudgetTaskUpdate {
  taskCode: string;
  taskName: string;
  matrix: TaskBudgetMatrix;
  total: number;
}

export interface BudgetImportResult {
  updates: ParsedBudgetTaskUpdate[];
  skipped: { taskCode: string; reason: string }[];
  rowErrors: { rowIndex: number; message: string }[];
}

export function parseBudgetImportFile(
  file: File,
  tasks: { [code: string]: Task }
): Promise<BudgetImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result;
        const wb = XLSX.read(raw, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const rowErrors: { rowIndex: number; message: string }[] = [];
        const skipped: { taskCode: string; reason: string }[] = [];
        const skippedCodes = new Set<string>();

        // 세부과제코드별로 (비목,재원) → 금액 누적
        const grouped = new Map<string, { name: string; values: Map<string, number> }>();

        rows.forEach((row, idx) => {
          const rowIndex = idx + 2;
          const taskCode = String(row[HEADERS[0]] || '').trim();
          const taskName = String(row[HEADERS[1]] || '').trim();
          const category = String(row[HEADERS[2]] || '').trim();
          const source = String(row[HEADERS[3]] || '').trim();
          const amountRaw = row[HEADERS[4]];

          if (!taskCode) {
            rowErrors.push({ rowIndex, message: '세부과제코드가 비어 있습니다.' });
            return;
          }
          if (taskCode.startsWith('IZ')) {
            if (!skippedCodes.has(taskCode)) {
              skippedCodes.add(taskCode);
              skipped.push({ taskCode, reason: 'IZ 영역은 항목별 예산관리 화면에서 편집해야 합니다.' });
            }
            return;
          }
          if (!tasks[taskCode]) {
            rowErrors.push({ rowIndex, message: `세부과제코드 [${taskCode}]를 찾을 수 없습니다.` });
            return;
          }
          if (!EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
            rowErrors.push({ rowIndex, message: `비목 [${category}]이 7개 비목 목록에 없습니다.` });
            return;
          }
          if (!FUND_SOURCES.includes(source as FundSource)) {
            rowErrors.push({ rowIndex, message: `재원 [${source}]이 이월금/기본사업비/적정규모화 중 하나가 아닙니다.` });
            return;
          }
          const amount = Number(amountRaw);
          if (Number.isNaN(amount) || amount < 0) {
            rowErrors.push({ rowIndex, message: `예산금액이 올바르지 않습니다: "${amountRaw}"` });
            return;
          }

          if (!grouped.has(taskCode)) {
            grouped.set(taskCode, { name: taskName || tasks[taskCode].name, values: new Map() });
          }
          grouped.get(taskCode)!.values.set(`${category}|${source}`, amount);
        });

        const updates: ParsedBudgetTaskUpdate[] = [];
        grouped.forEach((entry, taskCode) => {
          const matrix: TaskBudgetMatrix = {};
          let total = 0;
          EXPENSE_CATEGORIES.forEach((cat) => {
            matrix[cat] = { 이월금: 0, 기본사업비: 0, 적정규모화: 0 };
            FUND_SOURCES.forEach((src) => {
              const val = entry.values.get(`${cat}|${src}`) || 0;
              matrix[cat]![src] = val;
              total += val;
            });
          });
          updates.push({ taskCode, taskName: entry.name, matrix, total });
        });

        resolve({ updates, skipped, rowErrors });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsBinaryString(file);
  });
}

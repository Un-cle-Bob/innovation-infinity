import * as XLSX from 'xlsx';
import { EXPENSE_CATEGORIES, SUB_CATEGORY_OPTIONS } from '../data/constants';
import { CorporateCard, Department, Execution, ExpenseCategory, SignalFlag, Task } from '../types';

/**
 * 집행내역 엑셀 업로드용 표준 컬럼 순서 (템플릿과 업로드 파싱이 동일한 헤더를 사용한다)
 */
export const EXECUTION_IMPORT_HEADERS = [
  '집행일자(YYYY-MM-DD)',
  '세부과제코드',
  '주요추진항목코드',
  '담당부서',
  '적요(사용목적)',
  '비목',
  '세목',
  '집행액',
  '지출방법(계좌이체/법인카드)',
  '법인카드(카드1~카드6, 계좌이체면 공란)',
  '지출처',
  '내부결재문서번호',
  '지급청구서번호',
  '전표승인번호',
  '점검신호(정상/확인필요/시정필요)',
  '점검메모',
] as const;

/**
 * 업로드용 표준 엑셀 양식 다운로드. 예시 1행 + 참고용 코드 목록 시트를 같이 넣어준다.
 */
export function downloadExecutionImportTemplate(
  tasks: { [code: string]: Task },
  departments: Department[],
  corporateCards: CorporateCard[],
  year: number
) {
  const taskList = Object.values(tasks);
  const firstTask = taskList[0];
  const firstItemCode = firstTask ? Object.keys(firstTask.items || {})[0] || '' : '';

  const exampleRow: Record<string, string | number> = {
    [EXECUTION_IMPORT_HEADERS[0]]: `${year}-04-15`,
    [EXECUTION_IMPORT_HEADERS[1]]: firstTask?.code || '',
    [EXECUTION_IMPORT_HEADERS[2]]: firstItemCode,
    [EXECUTION_IMPORT_HEADERS[3]]: departments[0]?.name || '',
    [EXECUTION_IMPORT_HEADERS[4]]: '예시) 자율전공 홍보물 제작비',
    [EXECUTION_IMPORT_HEADERS[5]]: EXPENSE_CATEGORIES[0],
    [EXECUTION_IMPORT_HEADERS[6]]: SUB_CATEGORY_OPTIONS[0],
    [EXECUTION_IMPORT_HEADERS[7]]: 500000,
    [EXECUTION_IMPORT_HEADERS[8]]: '법인카드',
    [EXECUTION_IMPORT_HEADERS[9]]: corporateCards[0]?.label || '카드1',
    [EXECUTION_IMPORT_HEADERS[10]]: '예시업체',
    [EXECUTION_IMPORT_HEADERS[11]]: '',
    [EXECUTION_IMPORT_HEADERS[12]]: '',
    [EXECUTION_IMPORT_HEADERS[13]]: '',
    [EXECUTION_IMPORT_HEADERS[14]]: '정상',
    [EXECUTION_IMPORT_HEADERS[15]]: '',
  };

  const ws = XLSX.utils.json_to_sheet([exampleRow], { header: EXECUTION_IMPORT_HEADERS as unknown as string[] });
  ws['!cols'] = EXECUTION_IMPORT_HEADERS.map(() => ({ wch: 22 }));

  // 참고용 코드 목록 시트 (세부과제코드/주요추진항목코드/담당부서/비목/세목/법인카드)
  const refRows: Record<string, string>[] = [];
  const taskRefLines: string[] = [];
  taskList.forEach((t) => {
    Object.values(t.items || {}).forEach((it) => {
      taskRefLines.push(`${t.code} / ${it.code} - ${it.name}`);
    });
  });
  const maxLen = Math.max(
    taskRefLines.length,
    departments.length,
    EXPENSE_CATEGORIES.length,
    SUB_CATEGORY_OPTIONS.length,
    corporateCards.length
  );
  for (let i = 0; i < maxLen; i++) {
    refRows.push({
      '세부과제코드 / 주요추진항목코드': taskRefLines[i] || '',
      담당부서: departments[i]?.name || '',
      비목: EXPENSE_CATEGORIES[i] || '',
      세목: SUB_CATEGORY_OPTIONS[i] || '',
      법인카드: corporateCards[i] ? `${corporateCards[i].label}(${corporateCards[i].last4})` : '',
    });
  }
  const wsRef = XLSX.utils.json_to_sheet(refRows);
  wsRef['!cols'] = [{ wch: 46 }, { wch: 16 }, { wch: 26 }, { wch: 20 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '집행내역_업로드양식');
  XLSX.utils.book_append_sheet(wb, wsRef, '참고(코드목록)');
  XLSX.writeFile(wb, `집행내역_업로드양식_${year}학년도.xlsx`);
}

export interface ParsedExecutionRow {
  rowIndex: number; // 엑셀상의 실제 행 번호 (오류 메시지용)
  errors: string[];
  data?: Omit<Execution, 'id' | 'created_at' | 'created_by' | 'fund_allocations'>;
}

function excelDateToStr(raw: unknown): string {
  if (raw instanceof Date) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  return String(raw || '').trim();
}

/**
 * 업로드된 엑셀 파일을 읽어서 집행내역 후보 목록으로 변환한다.
 * 유효하지 않은 행은 errors 배열에 사유를 채워서 반환하고(등록 대상에서 제외),
 * 유효한 행은 data 필드에 addExecution에 바로 넘길 수 있는 형태로 채워준다.
 */
export function parseExecutionImportFile(
  file: File,
  tasks: { [code: string]: Task },
  departments: Department[],
  corporateCards: CorporateCard[]
): Promise<ParsedExecutionRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result;
        const wb = XLSX.read(raw, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const deptNames = new Set(departments.map((d) => d.name));
        const cardByLabel = new Map(corporateCards.map((c) => [c.label, c.id]));

        const results: ParsedExecutionRow[] = rows.map((row, idx) => {
          const rowIndex = idx + 2; // 헤더가 1행이므로 데이터는 2행부터
          const errors: string[] = [];

          const taskCode = String(row[EXECUTION_IMPORT_HEADERS[1]] || '').trim();
          const itemCode = String(row[EXECUTION_IMPORT_HEADERS[2]] || '').trim();
          const department = String(row[EXECUTION_IMPORT_HEADERS[3]] || '').trim();
          const content = String(row[EXECUTION_IMPORT_HEADERS[4]] || '').trim();
          const category = String(row[EXECUTION_IMPORT_HEADERS[5]] || '').trim();
          const subCategory = String(row[EXECUTION_IMPORT_HEADERS[6]] || '').trim();
          const amountRaw = row[EXECUTION_IMPORT_HEADERS[7]];
          const paymentMethod = String(row[EXECUTION_IMPORT_HEADERS[8]] || '').trim();
          const cardLabel = String(row[EXECUTION_IMPORT_HEADERS[9]] || '').trim();
          const payee = String(row[EXECUTION_IMPORT_HEADERS[10]] || '').trim();
          const internalDoc = String(row[EXECUTION_IMPORT_HEADERS[11]] || '').trim();
          const invoiceDoc = String(row[EXECUTION_IMPORT_HEADERS[12]] || '').trim();
          const voucherDoc = String(row[EXECUTION_IMPORT_HEADERS[13]] || '').trim();
          const flagText = String(row[EXECUTION_IMPORT_HEADERS[14]] || '정상').trim();
          const flagNote = String(row[EXECUTION_IMPORT_HEADERS[15]] || '').trim();
          const dateStr = excelDateToStr(row[EXECUTION_IMPORT_HEADERS[0]]);

          const task = tasks[taskCode];
          if (!task) errors.push(`세부과제코드 [${taskCode}]를 찾을 수 없습니다.`);
          const item = task?.items?.[itemCode];
          if (task && !item) errors.push(`주요추진항목코드 [${itemCode}]를 찾을 수 없습니다.`);
          if (!department) errors.push('담당부서가 비어 있습니다.');
          else if (!deptNames.has(department)) errors.push(`담당부서 [${department}]가 고정 목록에 없습니다.`);
          if (!content) errors.push('적요(사용목적)가 비어 있습니다.');
          if (!EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
            errors.push(`비목 [${category}]이 7개 비목 목록에 없습니다.`);
          }

          const amount = Number(amountRaw);
          if (!amount || Number.isNaN(amount) || amount <= 0) {
            errors.push(`집행액이 올바르지 않습니다: "${amountRaw}"`);
          }

          if (paymentMethod !== '계좌이체' && paymentMethod !== '법인카드') {
            errors.push(`지출방법은 '계좌이체' 또는 '법인카드'여야 합니다: "${paymentMethod}"`);
          }
          let cardId: string | undefined;
          if (paymentMethod === '법인카드') {
            cardId = cardByLabel.get(cardLabel);
            if (!cardId) errors.push(`법인카드 [${cardLabel}]를 찾을 수 없습니다.`);
          }

          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            errors.push(`집행일자 형식이 올바르지 않습니다(YYYY-MM-DD): "${dateStr}"`);
          }

          const flag: SignalFlag = flagText === '확인필요' ? 'orange' : flagText === '시정필요' ? 'red' : 'green';

          if (errors.length > 0) {
            return { rowIndex, errors };
          }

          return {
            rowIndex,
            errors: [],
            data: {
              task_code: taskCode,
              item_code: itemCode,
              date: dateStr,
              department,
              content,
              category: category as ExpenseCategory,
              sub_category: subCategory || undefined,
              amount,
              payment_method: paymentMethod as '계좌이체' | '법인카드',
              card_id: cardId,
              payee,
              internal_approval_doc_number: internalDoc,
              invoice_doc_number: invoiceDoc || undefined,
              voucher_approval_number: voucherDoc || undefined,
              flag,
              flag_note: flagNote || undefined,
            },
          };
        });

        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsBinaryString(file);
  });
}

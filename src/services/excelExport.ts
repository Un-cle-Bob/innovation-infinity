import * as XLSX from 'xlsx';
import { CorporateCard, Execution } from '../types';
import { getDomainCode, getExecutionManageNoMap } from '../utils/domainColors';

/**
 * 엑셀 다운로드 (집행내역 -> 지출부 서식 표준 매핑)
 * 컬럼: 연번 | 영역코드 | 세부과제코드 | 주요추진항목코드 | 집행일자 | 비목 | 적요 | 집행액 | 지출처 | 지출방법 | 내부결재번호 | ... | 영역별 관리연번
 */
export function exportExecutionsToExcel(
  executions: Execution[],
  corporateCards: CorporateCard[],
  year: number
) {
  const cardMap = new Map<string, string>();
  corporateCards.forEach((c) => {
    cardMap.set(c.id, `${c.label}(${c.last4})`);
  });

  // 등록순 기준 영역별 관리연번(IA001 등) 맵
  const manageNoMap = getExecutionManageNoMap(executions);

  // 날짜순 정렬
  const sorted = [...executions].sort((a, b) => (a.date > b.date ? 1 : -1));

  const rows = sorted.map((exec, idx) => {
    let paymentText: string = exec.payment_method;
    if (exec.payment_method === '법인카드' && exec.card_id) {
      const cardInfo = cardMap.get(exec.card_id);
      if (cardInfo) {
        paymentText = `법인카드(${cardInfo})`;
      }
    }

    const domainCode = getDomainCode(exec.task_code);
    const domainManageNo = manageNoMap.get(exec.id) || `${domainCode}001`;

    const flagText =
      exec.flag === 'green' ? '정상' : exec.flag === 'orange' ? '확인필요' : '시정필요';

    return {
      연번: idx + 1,
      영역코드: domainCode,
      세부과제코드: exec.task_code || '',
      주요추진항목코드: exec.item_code || '',
      '집행일자 (YYYY-MM-DD)': exec.date || '',
      '항목 (비목)': exec.category || '',
      세목: exec.sub_category || '',
      '적요 (사용목적)': exec.content || '',
      '집행액 (지출)': exec.amount || 0,
      지출처: exec.payee || '',
      '지출방법 (계좌이체/법인카드)': paymentText,
      담당부서: exec.department || '',
      내부결재문서번호: exec.internal_approval_doc_number || '',
      지급청구서번호: exec.invoice_doc_number || '',
      전표승인번호: exec.voucher_approval_number || '',
      점검상태: flagText,
      '점검메모 (비고)': exec.flag_note || '',
      이월금소진: exec.fund_allocations?.find((f) => f.source === '이월금')?.amount || 0,
      기본사업비소진: exec.fund_allocations?.find((f) => f.source === '기본사업비')?.amount || 0,
      적정규모화소진: exec.fund_allocations?.find((f) => f.source === '적정규모화')?.amount || 0,
      '영역별 관리연번': domainManageNo,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 컬럼 너비 조정
  worksheet['!cols'] = [
    { wch: 6 },  // 연번
    { wch: 10 }, // 영역코드
    { wch: 14 }, // 세부과제코드
    { wch: 16 }, // 주요추진항목코드
    { wch: 14 }, // 집행일자
    { wch: 26 }, // 항목(비목)
    { wch: 16 }, // 세목
    { wch: 38 }, // 적요
    { wch: 15 }, // 집행액
    { wch: 20 }, // 지출처
    { wch: 22 }, // 지출방법
    { wch: 16 }, // 담당부서
    { wch: 18 }, // 내부결재
    { wch: 18 }, // 지급청구
    { wch: 18 }, // 전표승인
    { wch: 10 }, // 점검상태
    { wch: 25 }, // 점검메모
    { wch: 14 }, // 이월금
    { wch: 14 }, // 기본사업비
    { wch: 14 }, // 적정규모화
    { wch: 16 }, // 영역별 관리연번
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${year}년_지출부`);

  const filename = `대학혁신지원사업_${year}학년도_지출부_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * 총괄표 엑셀 다운로드 (영역-세부과제 x 7비목 x 3재원 예산/실적/잔액/집행률 매트릭스)
 * 화면 표와 동일하게 2단 헤더(비목별 병합)를 만들어서 내보낸다.
 */
export function exportSummaryGridToExcel(
  summaryRows: any[],
  categories: string[],
  year: number,
  periodLabel: string,
  variant: '세부과제별' | '영역별요약' = '세부과제별'
) {
  // 1행: 영역코드 | 세부과제코드(또는 영역명) | 재원구분 | [비목명(4칸 병합)] × N | 총예산 | 총실적 | 총잔액 | 집행률(%)
  const headerRow1: (string | number)[] = ['영역코드', variant === '영역별요약' ? '영역명' : '세부과제코드', '재원구분'];
  categories.forEach((cat) => {
    headerRow1.push(cat, '', '', '');
  });
  headerRow1.push('총예산', '총실적', '총잔액', '집행률(%)');

  // 2행: (병합됨) | (병합됨) | (병합됨) | 예산 실적 잔액 집행률 반복 | (병합됨) x4
  const headerRow2: (string | number)[] = ['', '', ''];
  categories.forEach(() => {
    headerRow2.push('예산', '실적', '잔액', '집행률');
  });
  headerRow2.push('', '', '', '');

  const dataRows = summaryRows.map((row) => {
    const r: (string | number)[] = [row['영역코드'], row['세부과제코드'], row['재원구분']];
    categories.forEach((cat) => {
      r.push(
        row[`${cat}_예산`] || 0,
        row[`${cat}_실적`] || 0,
        row[`${cat}_잔액`] || 0,
        row[`${cat}_집행률`] || '-'
      );
    });
    r.push(row['총예산'] || 0, row['총실적'] || 0, row['총잔액'] || 0, row['집행률(%)'] || '');
    return r;
  });

  const aoa = [headerRow1, headerRow2, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // 헤더 병합: 앞 3개 컬럼(영역코드/세부과제코드/재원구분)은 위아래(2행) 병합,
  // 비목명은 좌우(4칸: 예산/실적/잔액/집행률) 병합, 총계 4개 컬럼은 위아래 병합
  const merges: XLSX.Range[] = [];
  [0, 1, 2].forEach((c) => {
    merges.push({ s: { r: 0, c }, e: { r: 1, c } });
  });
  let colIdx = 3;
  categories.forEach(() => {
    merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 3 } });
    colIdx += 4;
  });
  for (let i = 0; i < 4; i++) {
    merges.push({ s: { r: 0, c: colIdx + i }, e: { r: 1, c: colIdx + i } });
  }
  worksheet['!merges'] = merges;

  // 컬럼 너비
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 14 },
    { wch: 10 },
    ...categories.flatMap(() => [{ wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 10 }]),
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
  ];

  // 헤더 2줄 고정(틀 고정)
  worksheet['!rows'] = [{ hpt: 20 }, { hpt: 18 }];
  (worksheet as any)['!freeze'] = { xSplit: 3, ySplit: 2 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${year}년_사업비총괄표_${variant}`.slice(0, 31));

  const filename = `대학혁신지원사업_${year}학년도_사업비총괄표_${variant}_${periodLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

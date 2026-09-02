/**
 * 주요추진항목의 담당부서는 "부서A, 부서B"처럼 콤마로 구분해 여러 부서를 기입할 수 있다.
 * 필터링/그룹핑 시에는 이 함수로 분리해서 사용한다.
 */
export function parseDepartments(deptStr: string | undefined | null): string[] {
  if (!deptStr) return [];
  return deptStr
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
}

/** 다중부서 문자열에서 대표(첫번째) 부서 하나만 필요할 때 사용 (예: 집행내역 등록 시 기본값) */
export function getPrimaryDepartment(deptStr: string | undefined | null): string {
  return parseDepartments(deptStr)[0] || '';
}

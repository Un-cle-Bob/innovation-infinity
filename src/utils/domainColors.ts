import { Execution } from '../types';

export interface DomainColorTheme {
  bg: string;
  text: string;
  border: string;
  badge: string;
  dot: string;
  lightBg: string;
}

const PRESET_DOMAINS: Record<string, DomainColorTheme> = {
  IA: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    dot: 'bg-indigo-500',
    lightBg: 'bg-indigo-50/50',
  },
  IB: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    dot: 'bg-emerald-500',
    lightBg: 'bg-emerald-50/50',
  },
  IC: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badge: 'bg-amber-50 text-amber-800 border border-amber-200',
    dot: 'bg-amber-500',
    lightBg: 'bg-amber-50/50',
  },
  ID: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    badge: 'bg-purple-50 text-purple-700 border border-purple-200',
    dot: 'bg-purple-500',
    lightBg: 'bg-purple-50/50',
  },
  IE: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200',
    dot: 'bg-rose-500',
    lightBg: 'bg-rose-50/50',
  },
  IZ: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    badge: 'bg-slate-100 text-slate-700 border border-slate-300',
    dot: 'bg-slate-500',
    lightBg: 'bg-slate-100/60',
  },
  IF: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    badge: 'bg-sky-50 text-sky-700 border border-sky-200',
    dot: 'bg-sky-500',
    lightBg: 'bg-sky-50/50',
  },
  IG: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    badge: 'bg-teal-50 text-teal-800 border border-teal-200',
    dot: 'bg-teal-500',
    lightBg: 'bg-teal-50/50',
  },
  IH: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    badge: 'bg-orange-50 text-orange-800 border border-orange-200',
    dot: 'bg-orange-500',
    lightBg: 'bg-orange-50/50',
  },
};

const COLOR_PALETTE: DomainColorTheme[] = [
  PRESET_DOMAINS.IA,
  PRESET_DOMAINS.IB,
  PRESET_DOMAINS.IC,
  PRESET_DOMAINS.ID,
  PRESET_DOMAINS.IE,
  PRESET_DOMAINS.IF,
  PRESET_DOMAINS.IG,
  PRESET_DOMAINS.IH,
  {
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    badge: 'bg-cyan-50 text-cyan-800 border border-cyan-200',
    dot: 'bg-cyan-500',
    lightBg: 'bg-cyan-50/50',
  },
  {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-800',
    border: 'border-fuchsia-200',
    badge: 'bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200',
    dot: 'bg-fuchsia-500',
    lightBg: 'bg-fuchsia-50/50',
  },
];

/**
 * 영역 코드 (예: IA, IB, IC...) 또는 과제코드(IA-1-1)를 받아 영역별 색상 테마 반환
 */
export function getDomainCode(taskOrDomainCode: string): string {
  if (!taskOrDomainCode) return 'IA';
  const parts = taskOrDomainCode.split('-');
  return parts[0] || 'IA';
}

export function getDomainColorTheme(taskOrDomainCode: string): DomainColorTheme {
  const code = getDomainCode(taskOrDomainCode);
  if (PRESET_DOMAINS[code]) {
    return PRESET_DOMAINS[code];
  }
  // 없는 경우 문자열 해시 기반으로 안정적 색상 할당
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

/**
 * 재원(이월금/기본사업비/적정규모화) 별 색상 테마
 */
export interface FundColorTheme {
  badge: string;
  text: string;
  bar: string;
}

const FUND_COLORS: Record<string, FundColorTheme> = {
  이월금: {
    badge: 'bg-amber-50 text-amber-800 border border-amber-300',
    text: 'text-amber-800',
    bar: 'bg-amber-400',
  },
  기본사업비: {
    badge: 'bg-blue-50 text-blue-800 border border-blue-300',
    text: 'text-blue-800',
    bar: 'bg-blue-400',
  },
  적정규모화: {
    badge: 'bg-purple-50 text-purple-800 border border-purple-300',
    text: 'text-purple-800',
    bar: 'bg-purple-400',
  },
  합계: {
    badge: 'bg-indigo-100 text-indigo-950 border border-indigo-300 font-extrabold',
    text: 'text-indigo-950',
    bar: 'bg-indigo-500',
  },
};

export function getFundColorTheme(source: string): FundColorTheme {
  return FUND_COLORS[source] || FUND_COLORS['합계'];
}

/**
 * 아직 manage_order(고정 관리번호)가 없는 집행내역들에 번호를 부여(백필)한다.
 * 이미 번호가 있는 건은 절대 건드리지 않고, 없는 건들만 영역별로 현재 등록순(시간순) 그대로
 * 그 영역의 최대 번호 다음부터 이어서 부여한다. 한 번 부여된 번호는 이후 다른 건이 삭제되어도
 * 절대 바뀌지 않는다 (관리철 번호가 밀리지 않도록).
 */
export function ensureExecutionManageOrders(executions: Execution[]): Execution[] {
  const byDomain: Record<string, Execution[]> = {};
  executions.forEach((e) => {
    const d = getDomainCode(e.task_code);
    (byDomain[d] ||= []).push(e);
  });

  const result: Execution[] = [];
  Object.values(byDomain).forEach((group) => {
    const withOrder = group.filter((e) => e.manage_order != null);
    const withoutOrder = group
      .filter((e) => e.manage_order == null)
      .sort((a, b) => {
        const timeA = a.created_at || a.date || a.id;
        const timeB = b.created_at || b.date || b.id;
        return timeA.localeCompare(timeB);
      });

    if (withoutOrder.length === 0) {
      result.push(...withOrder);
      return;
    }

    let nextNum = withOrder.length > 0 ? Math.max(...withOrder.map((e) => e.manage_order!)) + 1 : 1;
    const backfilled = withoutOrder.map((e) => ({ ...e, manage_order: nextNum++ }));
    result.push(...withOrder, ...backfilled);
  });

  return result;
}

/**
 * 집행내역 목록을 받아 관리연번(예: IA001, IA002, IB001) 표시용 매핑 테이블 생성.
 * manage_order(고정 번호)가 있으면 그 값을 그대로 사용하고, 아직 없는 레거시 데이터는
 * 화면 표시용으로만 등록순 기준 임시 번호를 계산한다(실제 저장은 add/delete/이동 시점에 이뤄짐).
 */
export function getExecutionManageNoMap(executions: Execution[]): Map<string, string> {
  const manageNoMap = new Map<string, string>();
  const withOrders = ensureExecutionManageOrders(executions);

  withOrders.forEach((exec) => {
    const domain = getDomainCode(exec.task_code);
    const seqStr = String(exec.manage_order || 1).padStart(3, '0');
    manageNoMap.set(exec.id, `${domain}${seqStr}`);
  });

  return manageNoMap;
}

/**
 * 새 집행내역이 등록될 때 부여할 고정 관리번호를 계산한다. 그 영역에서 지금까지 한 번이라도
 * 쓰인 적 있는 가장 큰 번호 다음 값이며, 이미 삭제된 건의 번호는 절대 재사용하지 않는다.
 */
export function getNextManageOrder(existingExecutions: Execution[], taskCode: string): number {
  const domain = getDomainCode(taskCode);
  const withOrders = ensureExecutionManageOrders(existingExecutions).filter(
    (e) => getDomainCode(e.task_code) === domain
  );
  const maxOrder = withOrders.reduce((max, e) => Math.max(max, e.manage_order || 0), 0);
  return maxOrder + 1;
}

/**
 * 같은 영역(도메인) 내에서 특정 집행내역의 고정 관리번호를 바로 위/아래 건과 맞바꾼다.
 * (번호를 재계산하는 것이 아니라 두 건의 번호를 교환하는 것이므로, 다른 건들의 번호는 전혀
 * 바뀌지 않고 삭제로 인한 결번도 그대로 유지된다.) 반환값은 갱신이 필요한 레코드들 또는 null(이동 불가).
 */
export function reorderExecutionManageNo(
  executions: Execution[],
  execId: string,
  direction: 'up' | 'down'
): Execution[] | null {
  const target = executions.find((e) => e.id === execId);
  if (!target) return null;
  const domain = getDomainCode(target.task_code);

  const withOrders = ensureExecutionManageOrders(executions);
  const domainExecs = withOrders.filter((e) => getDomainCode(e.task_code) === domain);
  const sorted = [...domainExecs].sort((a, b) => (a.manage_order || 0) - (b.manage_order || 0));

  const targetIdx = sorted.findIndex((e) => e.id === execId);
  const swapIdx = direction === 'up' ? targetIdx - 1 : targetIdx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return null;

  const a = sorted[targetIdx];
  const b = sorted[swapIdx];
  const tmp = a.manage_order;
  a.manage_order = b.manage_order;
  b.manage_order = tmp;

  // 이번에 새로 백필된 번호가 있을 수 있으니, 해당 영역 전체(변경분 포함)를 반환해 함께 저장한다
  return domainExecs;
}

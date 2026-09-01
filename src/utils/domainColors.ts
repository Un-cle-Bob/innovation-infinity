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
 * 집행내역 목록을 받아 등록순(created_at 오름차순) 기준 영역별 관리연번(예: IA001, IA002, IB001) 매핑 테이블 생성
 */
export function getExecutionManageNoMap(executions: Execution[]): Map<string, string> {
  const manageNoMap = new Map<string, string>();
  
  // 등록순 (created_at 기준 오름차순, 없을 경우 id 순)
  const sorted = [...executions].sort((a, b) => {
    const timeA = a.created_at || a.date || a.id;
    const timeB = b.created_at || b.date || b.id;
    return timeA.localeCompare(timeB);
  });

  const domainCounters: Record<string, number> = {};

  sorted.forEach((exec) => {
    const domain = getDomainCode(exec.task_code);
    domainCounters[domain] = (domainCounters[domain] || 0) + 1;
    const seqStr = String(domainCounters[domain]).padStart(3, '0');
    const manageNo = `${domain}${seqStr}`;
    manageNoMap.set(exec.id, manageNo);
  });

  return manageNoMap;
}

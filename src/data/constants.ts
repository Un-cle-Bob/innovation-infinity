import { AppTabId, CorporateCard, Department, ExpenseCategory, FundSource, User } from '../types';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  '인건비',
  '장학금',
  '교육연구프로그램개발운영비',
  '교육연구환경개선비',
  '실험실습기자재구입운영비',
  '그밖의사업운영경비',
  '간접비',
];

export const FUND_SOURCES: FundSource[] = ['이월금', '기본사업비', '적정규모화'];

/** 세목(비목 하위 세부 지출항목) 사전 목록. 목록에 없는 경우 '직접입력'으로 자유 입력 */
export const SUB_CATEGORY_OPTIONS: string[] = [
  '급여',
  '급여대체',
  '사업관리수당',
  '성과급',
  '강사료(특강료)',
  '장학금',
  '전문가활용비',
  '시상금',
  '일반용역비',
  '일반수용비',
  '여비',
  '소모품비',
  '리스임차료',
  '재료비',
  '교육활동지원비',
  '회의비',
  '기타운영비',
  '기계기구',
  '집기비품',
  '환경개선공사비',
  '장비관리비',
  '홍보비',
  '간접비',
];

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: '기획조정실', order: 1 },
  { id: 'dept-2', name: '교무학생처', order: 2 },
  { id: 'dept-3', name: '입학취업처', order: 3 },
  { id: 'dept-4', name: '국제교류처', order: 4 },
  { id: 'dept-5', name: '행정지원처', order: 5 },
  { id: 'dept-6', name: '산학협력단', order: 6 },
  { id: 'dept-7', name: '평생교육원', order: 7 },
  { id: 'dept-8', name: '직업교육혁신센터', order: 8 },
  { id: 'dept-9', name: '교수학습지원센터', order: 9 },
  { id: 'dept-10', name: '현장실습지원센터', order: 10 },
  { id: 'dept-11', name: '학생상담센터', order: 11 },
  { id: 'dept-12', name: '교양교육연구센터', order: 12 },
  { id: 'dept-13', name: '성인학습지원센터', order: 13 },
  { id: 'dept-14', name: '성과관리센터', order: 14 },
  { id: 'dept-15', name: '취창업지원센터', order: 15 },
  { id: 'dept-16', name: '혁신사업단', order: 16 },
];

export const DEFAULT_CORPORATE_CARDS: CorporateCard[] = [
  { id: 'card1', label: '카드1', last4: '7842' },
  { id: 'card2', label: '카드2', last4: '1812' },
  { id: 'card3', label: '카드3', last4: '8895' },
  { id: 'card4', label: '카드4', last4: '8814' },
  { id: 'card5', label: '카드5', last4: '6809' },
  { id: 'card6', label: '카드6', last4: '6896' },
];

/** 권한 체크박스 UI에 쓰이는 탭 목록 (종합 대시보드는 조회 전용이라 제외, 총 8개) */
export const TAB_PERMISSION_OPTIONS: { id: AppTabId; label: string }[] = [
  { id: 'tasks', label: '예산 관리' },
  { id: 'executions', label: '집행 관리' },
  { id: 'summary', label: '사업비 총괄표' },
  { id: 'programs', label: '실적 관리' },
  { id: 'kpi', label: '성과지표 (KPI)' },
  { id: 'reports', label: '보고서 인쇄/PDF' },
  { id: 'approvals', label: '수정 요청함' },
  // 'settings'(시스템 설정)는 주관리자 전용이라 위임 가능한 권한 목록에서 제외
];

export const DEFAULT_USERS: User[] = [
  {
    uid: 'user-super',
    name: '김총괄 (사업단장)',
    email: 'super@university.ac.kr',
    department: '혁신사업단',
    role: 'super_admin',
    // 주관리자는 tab_permissions와 무관하게 항상 전체 수정/삭제 가능
  },
  {
    uid: 'user-sub-budget',
    name: '이팀장 (예산총괄)',
    email: 'sub-budget@university.ac.kr',
    department: '혁신사업단',
    role: 'sub_admin',
    tab_permissions: {
      tasks: { edit: true, delete: true },
      executions: { edit: true, delete: true },
      summary: { edit: true, delete: true },
      reports: { edit: true, delete: true },
    },
  },
  {
    uid: 'user-sub-performance',
    name: '최팀장 (성과총괄)',
    email: 'sub-performance@university.ac.kr',
    department: '혁신사업단',
    role: 'sub_admin',
    tab_permissions: {
      programs: { edit: true, delete: true },
      kpi: { edit: true, delete: true },
      reports: { edit: true, delete: true },
      approvals: { edit: true, delete: true },
    },
  },
  {
    uid: 'user-assistant-1',
    name: '박담당 (실무담당1)',
    email: 'assistant1@university.ac.kr',
    department: '입학취업처',
    role: 'assistant_admin',
    tab_permissions: {
      executions: { edit: true },
    },
  },
  {
    uid: 'user-assistant-2',
    name: '정담당 (실무담당2)',
    email: 'assistant2@university.ac.kr',
    department: '교무학생처',
    role: 'assistant_admin',
    tab_permissions: {
      executions: { edit: true },
    },
  },
  {
    uid: 'user-assistant-3',
    name: '한담당 (실무담당3)',
    email: 'assistant3@university.ac.kr',
    department: '취창업지원센터',
    role: 'assistant_admin',
    tab_permissions: {
      executions: { edit: true },
      programs: { edit: true },
    },
  },
];

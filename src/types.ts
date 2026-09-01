export type ExpenseCategory = 
  | '인건비'
  | '장학금'
  | '교육연구프로그램개발운영비'
  | '교육연구환경개선비'
  | '실험실습기자재구입운영비'
  | '그밖의사업운영경비'
  | '간접비';

export type FundSource = '이월금' | '기본사업비' | '적정규모화';

export type UserRole = 'super_admin' | 'sub_admin' | 'assistant_admin';

/** 네비게이션 탭(메뉴) 식별자 - Navigation.tsx의 탭 id와 1:1로 대응 */
export type AppTabId =
  | 'dashboard'
  | 'tasks'
  | 'executions'
  | 'summary'
  | 'programs'
  | 'kpi'
  | 'reports'
  | 'approvals'
  | 'settings';

export type ItemStatus = '예정' | '진행중' | '완료' | '보류';

export type SignalFlag = 'green' | 'orange' | 'red';

export interface User {
  uid: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  /**
   * 탭(메뉴)별 수정 권한. 주관리자(super_admin)는 이 값과 무관하게 항상 모든 탭을 수정할 수 있다.
   * 부관리자/보조관리자는 여기 포함된 탭만 수정 가능(다른 탭은 조회만 가능).
   * 미설정(undefined)이면 하위호환을 위해 기존 role 기준 동작(부관리자=전체 허용, 보조관리자=집행관리만)으로 취급.
   */
  tab_permissions?: AppTabId[];
}

export interface Department {
  id: string;
  name: string;
  order: number;
}

export interface CorporateCard {
  id: string;
  label: string;
  last4: string;
}

export interface TaskBudgetMatrix {
  [category: string]: {
    이월금?: number | null;
    기본사업비?: number | null;
    적정규모화?: number | null;
  };
}

export interface TaskItem {
  code: string;
  task_code: string;
  name: string;
  department: string;
  detail?: string;
  status: ItemStatus;
  status_history?: Array<{
    status: ItemStatus;
    changed_at: string;
    changed_by: string;
    note?: string;
  }>;
  /**
   * IZ(사업관리 및 운영) 영역처럼 예산이 세부과제가 아니라 주요추진항목 단위로
   * 명확히 구분되어 있는 경우에만 사용. 있으면 이 항목 고유의 예산 매트릭스로 취급되고,
   * 잔액 계산 시에도 이 항목에 직접 연결된 집행내역(item_code 기준)만 반영한다.
   */
  budget_matrix?: TaskBudgetMatrix;
}

export interface Task {
  code: string;
  domain: string;
  detail: string;
  name: string;
  budget_total: number;
  budget_matrix: TaskBudgetMatrix;
  items: { [itemCode: string]: TaskItem };
}

export interface FundAllocation {
  source: FundSource;
  amount: number;
}

export interface Execution {
  id: string;
  task_code: string;
  item_code: string;
  date: string;
  department: string;
  content: string;
  category: ExpenseCategory;
  /** 세목: 비목 하위의 더 구체적인 지출 항목. 목록에서 선택하거나 '직접입력'으로 자유 입력 */
  sub_category?: string;
  amount: number;
  fund_allocations: FundAllocation[];
  payment_method: '계좌이체' | '법인카드';
  card_id?: string;
  payee: string;
  internal_approval_doc_number: string;
  invoice_doc_number?: string;
  voucher_approval_number?: string;
  flag: SignalFlag;
  flag_note?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface Program {
  id: string;
  task_code: string;
  item_code: string;
  internal_approval_doc_number: string;
  round_label?: string;
  name: string;
  department: string;
  manager: string;
  period: { start: string; end: string };
  budget: number;
  execution_amount_allocated: number;
  result_report_doc_number?: string;
  status: ItemStatus;
  performance: {
    participants?: number;
    satisfaction_score?: number;
    etc_note?: string;
  };
  updated_at: string;
}

export interface SubMeasure {
  id: string;
  name: string;
  detail_note?: string;
  baseline?: number | null;
  actual?: number | null;
  recommended_value?: number | null;
  department: string;
  check_result: 'O' | '-' | 'X';
  evidence_no: string;
  evidence_desc: string;
}

export interface Measure {
  id: string;
  name: string;
  baseline: number;
  actual: number;
  sub_measures: SubMeasure[];
}

export interface KpiDetail {
  id: string;
  name: string;
  baseline: number;
  actual: number;
  recommended_value?: number | null;
  weights?: number[];
  measures: Measure[];
}

export interface KpiIndicator {
  id: string;
  name: string;
  baseline: number;
  target: number;
  actual: number;
  recommended_value?: number | null;
  achievement: number;
  weights?: number[];
  details: KpiDetail[];
}

export interface ApprovalRequest {
  id: string;
  type: 'update' | 'delete';
  target_exec_id: string;
  original_data: Execution;
  payload?: Partial<Execution>;
  requested_by: {
    uid: string;
    name: string;
    department: string;
    role: UserRole;
  };
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  processed_by?: {
    uid: string;
    name: string;
  };
  processed_at?: string;
  reject_reason?: string;
}

export interface YearMeta {
  year: number;
  copied_from_year?: number | null;
  created_at: string;
  title: string;
}

export interface YearData {
  meta: YearMeta;
  tasks: { [taskCode: string]: Task };
  executions: { [execId: string]: Execution };
  programs: { [programId: string]: Program };
  kpis: KpiIndicator[];
  approval_requests: { [reqId: string]: ApprovalRequest };
}

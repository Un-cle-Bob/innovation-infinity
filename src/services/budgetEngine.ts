import { Execution, ExpenseCategory, FundAllocation, FundSource, Task, TaskItem } from '../types';

export interface CategoryBalance {
  category: ExpenseCategory;
  budget: {
    이월금: number;
    기본사업비: number;
    적정규모화: number;
    total: number;
  };
  executed: {
    이월금: number;
    기본사업비: number;
    적정규모화: number;
    total: number;
  };
  remaining: {
    이월금: number;
    기본사업비: number;
    적정규모화: number;
    total: number;
  };
}

export interface TaskBalanceSummary {
  task_code: string;
  task_name: string;
  total_budget: number;
  total_executed: number;
  total_remaining: number;
  execution_rate: number;
  categories: CategoryBalance[];
  fund_summary: {
    이월금: { budget: number; executed: number; remaining: number };
    기본사업비: { budget: number; executed: number; remaining: number };
    적정규모화: { budget: number; executed: number; remaining: number };
  };
}

export interface AllocationCalculationResult {
  allocations: FundAllocation[];
  remainingAfter: {
    이월금: number;
    기본사업비: number;
    적정규모화: number;
  };
  totalAvailable: number;
  isExceeded: boolean;
  exceedAmount: number;
}

/**
 * 5절: 재원(이월금 -> 기본사업비 -> 적정규모화) 자동 소진 순서 계산 엔진
 *
 * item에 자체 budget_matrix가 있는 경우(예: IZ 영역처럼 예산이 주요추진항목 단위로
 * 명확히 구분된 경우) 세부과제 공용 예산이 아니라 그 항목 고유 예산 풀에서
 * 소진하고, 기존 집행내역도 item_code 기준으로 매칭한다.
 */
export function calculateFundAllocation(
  task: Task,
  category: ExpenseCategory,
  amount: number,
  allExecutions: Execution[],
  excludeExecId?: string,
  item?: TaskItem
): AllocationCalculationResult {
  const useItemPool = !!item?.budget_matrix;
  const catMatrix = (useItemPool ? item!.budget_matrix![category] : task.budget_matrix?.[category]) || {};
  const budgetCarryover = Number(catMatrix.이월금 || 0);
  const budgetBase = Number(catMatrix.기본사업비 || 0);
  const budgetScale = Number(catMatrix.적정규모화 || 0);

  // 해당 예산 풀(세부과제 또는 IZ 주요추진항목) & 비목에 대해 이미 집행된 재원별 금액 집계
  // (현재 수정 중인 execution 제외)
  let usedCarryover = 0;
  let usedBase = 0;
  let usedScale = 0;

  allExecutions.forEach((exec) => {
    if (exec.id === excludeExecId) return;
    const isMatch = useItemPool
      ? exec.item_code === item!.code && exec.category === category
      : exec.task_code === task.code && exec.category === category;
    if (isMatch) {
      (exec.fund_allocations || []).forEach((alloc) => {
        if (alloc.source === '이월금') usedCarryover += alloc.amount;
        else if (alloc.source === '기본사업비') usedBase += alloc.amount;
        else if (alloc.source === '적정규모화') usedScale += alloc.amount;
      });
    }
  });

  const remainCarryover = Math.max(0, budgetCarryover - usedCarryover);
  const remainBase = Math.max(0, budgetBase - usedBase);
  const remainScale = Math.max(0, budgetScale - usedScale);

  const totalAvailable = remainCarryover + remainBase + remainScale;

  let needToAllocate = Math.max(0, amount);
  const allocations: FundAllocation[] = [];

  // 1. 이월금 소진
  if (needToAllocate > 0 && remainCarryover > 0) {
    const deduct = Math.min(needToAllocate, remainCarryover);
    allocations.push({ source: '이월금', amount: deduct });
    needToAllocate -= deduct;
  }

  // 2. 기본사업비 소진
  if (needToAllocate > 0 && remainBase > 0) {
    const deduct = Math.min(needToAllocate, remainBase);
    allocations.push({ source: '기본사업비', amount: deduct });
    needToAllocate -= deduct;
  }

  // 3. 적정규모화 소진
  if (needToAllocate > 0 && remainScale > 0) {
    const deduct = Math.min(needToAllocate, remainScale);
    allocations.push({ source: '적정규모화', amount: deduct });
    needToAllocate -= deduct;
  }

  const isExceeded = needToAllocate > 0;
  const exceedAmount = needToAllocate;

  // 만약 초과분이라도 첫 번째 잔여 가능 재원에 억지로 넣지 않고 남은 잔액 표기
  const allocatedCarry = allocations.find((a) => a.source === '이월금')?.amount || 0;
  const allocatedBase = allocations.find((a) => a.source === '기본사업비')?.amount || 0;
  const allocatedScale = allocations.find((a) => a.source === '적정규모화')?.amount || 0;

  return {
    allocations,
    remainingAfter: {
      이월금: Math.max(0, remainCarryover - allocatedCarry),
      기본사업비: Math.max(0, remainBase - allocatedBase),
      적정규모화: Math.max(0, remainScale - allocatedScale),
    },
    totalAvailable,
    isExceeded,
    exceedAmount,
  };
}

/**
 * 세부과제별 전체 예산 및 잔액 요약 계산
 */
export function getTaskBudgetSummary(task: Task, allExecutions: Execution[]): TaskBalanceSummary {
  return computeBudgetSummary(task.code, task.name, task.budget_matrix, task.budget_total, allExecutions, false);
}

/**
 * IZ 영역처럼 예산이 세부과제가 아니라 주요추진항목 단위로 명확히 구분된 경우,
 * 그 항목 고유의 예산/집행/잔액을 계산한다 (item_code 기준으로 집행내역 매칭).
 */
export function getItemBudgetSummary(item: TaskItem, allExecutions: Execution[]): TaskBalanceSummary {
  const matrix = item.budget_matrix || {};
  const total = Object.values(matrix).reduce(
    (sum, m) => sum + Number(m.이월금 || 0) + Number(m.기본사업비 || 0) + Number(m.적정규모화 || 0),
    0
  );
  return computeBudgetSummary(item.code, item.name, matrix, total, allExecutions, true);
}

function computeBudgetSummary(
  code: string,
  name: string,
  matrix: Task['budget_matrix'],
  budgetTotal: number,
  allExecutions: Execution[],
  matchByItemCode: boolean
): TaskBalanceSummary {
  const scopedExecs = allExecutions.filter((e) =>
    matchByItemCode ? e.item_code === code : e.task_code === code
  );
  const categoriesList: ExpenseCategory[] = [
    '인건비',
    '장학금',
    '교육연구프로그램개발운영비',
    '교육연구환경개선비',
    '실험실습기자재구입운영비',
    '그밖의사업운영경비',
    '간접비',
  ];

  const fund_summary = {
    이월금: { budget: 0, executed: 0, remaining: 0 },
    기본사업비: { budget: 0, executed: 0, remaining: 0 },
    적정규모화: { budget: 0, executed: 0, remaining: 0 },
  };

  const categories: CategoryBalance[] = categoriesList.map((cat) => {
    const mat = matrix?.[cat] || {};
    const bCarry = Number(mat.이월금 || 0);
    const bBase = Number(mat.기본사업비 || 0);
    const bScale = Number(mat.적정규모화 || 0);
    const bTotal = bCarry + bBase + bScale;

    let eCarry = 0;
    let eBase = 0;
    let eScale = 0;

    scopedExecs
      .filter((e) => e.category === cat)
      .forEach((e) => {
        (e.fund_allocations || []).forEach((alloc) => {
          if (alloc.source === '이월금') eCarry += alloc.amount;
          else if (alloc.source === '기본사업비') eBase += alloc.amount;
          else if (alloc.source === '적정규모화') eScale += alloc.amount;
        });
      });

    const eTotal = eCarry + eBase + eScale;
    const rCarry = bCarry - eCarry;
    const rBase = bBase - eBase;
    const rScale = bScale - eScale;
    const rTotal = bTotal - eTotal;

    fund_summary.이월금.budget += bCarry;
    fund_summary.이월금.executed += eCarry;
    fund_summary.이월금.remaining += rCarry;

    fund_summary.기본사업비.budget += bBase;
    fund_summary.기본사업비.executed += eBase;
    fund_summary.기본사업비.remaining += rBase;

    fund_summary.적정규모화.budget += bScale;
    fund_summary.적정규모화.executed += eScale;
    fund_summary.적정규모화.remaining += rScale;

    return {
      category: cat,
      budget: { 이월금: bCarry, 기본사업비: bBase, 적정규모화: bScale, total: bTotal },
      executed: { 이월금: eCarry, 기본사업비: eBase, 적정규모화: eScale, total: eTotal },
      remaining: { 이월금: rCarry, 기본사업비: rBase, 적정규모화: rScale, total: rTotal },
    };
  });

  const total_budget = budgetTotal || categories.reduce((sum, c) => sum + c.budget.total, 0);
  const total_executed = categories.reduce((sum, c) => sum + c.executed.total, 0);
  const total_remaining = total_budget - total_executed;
  const execution_rate = total_budget > 0 ? (total_executed / total_budget) * 100 : 0;

  return {
    task_code: code,
    task_name: name,
    total_budget,
    total_executed,
    total_remaining,
    execution_rate,
    categories: categories.filter((c) => c.budget.total > 0 || c.executed.total > 0),
    fund_summary,
  };
}

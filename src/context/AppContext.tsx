import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Achievement,
  ApprovalRequest,
  AppTabId,
  CorporateCard,
  Department,
  Execution,
  ExpenseCategory,
  ItemStatus,
  KpiIndicator,
  Program,
  Task,
  TaskItem,
  User,
  UserRole,
  YearData,
} from '../types';
import { calculateFundAllocation } from '../services/budgetEngine';
import { reorderExecutionManageNo, getNextManageOrder, getDomainCode } from '../utils/domainColors';
import { recalculateKpiTree } from '../services/kpiEngine';
import {
  cloneYearData,
  getStoredYearList,
  loadCorporateCards,
  loadDepartments,
  loadUsers,
  loadYearData,
  saveCorporateCards,
  saveDepartments,
  saveUsers,
  saveYearData,
} from '../services/storage';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  currentYear: number;
  yearList: number[];
  setYear: (year: number) => void;
  createNewYear: (newYear: number, sourceYear: number) => void;

  currentUser: User;
  users: User[];
  setCurrentUserRole: (role: UserRole) => void;
  switchUser: (uid: string) => void;
  updateUserTabPermission: (uid: string, tabId: AppTabId, kind: 'edit' | 'delete', value: boolean) => void;
  canEditTab: (tabId: AppTabId) => boolean;
  canDeleteTab: (tabId: AppTabId) => boolean;

  yearData: YearData;
  tasks: { [code: string]: Task };
  executions: Execution[];
  programs: Program[];
  achievements: Achievement[];
  kpis: KpiIndicator[];
  approvalRequests: ApprovalRequest[];
  pendingApprovalCount: number;

  departments: Department[];
  corporateCards: CorporateCard[];

  // Task & Item Actions
  updateTask: (task: Task) => void;
  updateTaskMatrix: (taskCode: string, matrix: Task['budget_matrix'], budgetTotal: number) => void;
  updateItemBudgetMatrix: (
    taskCode: string,
    itemCode: string,
    matrix: NonNullable<TaskItem['budget_matrix']>
  ) => void;
  updateItemStatus: (taskCode: string, itemCode: string, status: ItemStatus, note?: string) => void;
  updateItem: (taskCode: string, itemCode: string, name: string, department: string) => void;
  addTask: (domain: string, code: string, name: string, detail: string) => boolean;
  updateTaskInfo: (taskCode: string, name: string, detail: string) => void;
  updateTaskCostBasis: (taskCode: string, category: string, content: string) => void;
  deleteTask: (taskCode: string) => void;
  addItem: (taskCode: string, itemCode: string, name: string, department: string) => boolean;
  deleteItem: (taskCode: string, itemCode: string) => void;

  // Execution Actions (4절, 5절, 6절)
  addExecution: (exec: Omit<Execution, 'id' | 'created_at' | 'created_by' | 'fund_allocations'>) => {
    success: boolean;
    error?: string;
  };
  updateExecution: (id: string, updates: Partial<Execution>) => {
    success: boolean;
    isPendingApproval?: boolean;
    error?: string;
  };
  deleteExecution: (id: string) => {
    success: boolean;
    isPendingApproval?: boolean;
    error?: string;
  };
  moveExecutionOrder: (execId: string, direction: 'up' | 'down') => void;
  setExecutionManageOrder: (execId: string, newOrder: number) => void;

  // Approval Workflow Actions (4절)
  approveRequest: (requestId: string) => void;
  rejectRequest: (requestId: string, reason: string) => void;

  // Program Actions (7절)
  addProgram: (program: Omit<Program, 'id' | 'updated_at'>) => void;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  deleteProgram: (id: string) => void;
  addAchievement: (data: Omit<Achievement, 'id' | 'created_at' | 'updated_at'>) => void;
  updateAchievement: (id: string, updates: Partial<Achievement>) => void;
  deleteAchievement: (id: string) => void;

  // KPI Actions (8절)
  updateKpiSubMeasure: (
    kpiId: string,
    detailId: string,
    measureId: string,
    subMeasureId: string,
    actual: number | null,
    checkResult: 'O' | '-' | 'X',
    evidenceNo: string,
    evidenceDesc: string
  ) => void;
  updateKpiWeights: (
    kpiId: string,
    targetType: 'indicator' | 'detail' | 'measure',
    detailId: string | null,
    weights: number[],
    measureId?: string | null
  ) => void;
  applyKpiRecommendation: (
    kpiId: string,
    detailId: string,
    measureId: string,
    subMeasureId: string,
    recommendedValue: number
  ) => void;
  updateKpiSubMeasureRecommendedValue: (
    kpiId: string,
    detailId: string,
    measureId: string,
    subMeasureId: string,
    recommendedValue: number | null
  ) => void;
  updateKpiDetailInfo: (
    kpiId: string,
    detailId: string,
    updates: { name?: string; target?: number | null; recommended_value?: number | null }
  ) => void;
  updateKpiMeasureInfo: (
    kpiId: string,
    detailId: string,
    measureId: string,
    updates: { name?: string }
  ) => void;
  updateKpiSubMeasureInfo: (
    kpiId: string,
    detailId: string,
    measureId: string,
    subMeasureId: string,
    updates: { name?: string; department?: string; detail_note?: string }
  ) => void;

  // Settings Actions (9절)
  addDepartment: (name: string) => void;
  updateDepartment: (id: string, name: string) => void;
  deleteDepartment: (id: string) => void;
  addCorporateCard: (label: string, last4: string) => void;
  updateCorporateCard: (id: string, label: string, last4: string) => void;
  deleteCorporateCard: (id: string) => void;

  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [yearList, setYearList] = useState<number[]>(() => getStoredYearList());
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [yearData, setYearData] = useState<YearData>(() => loadYearData(2026));

  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const list = loadUsers();
    return list[0]; // super_admin by default
  });

  const [departments, setDepartments] = useState<Department[]>(() => loadDepartments());
  const [corporateCards, setCorporateCards] = useState<CorporateCard[]>(() => loadCorporateCards());

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Switch Year
  const setYear = (year: number) => {
    setCurrentYear(year);
    const data = loadYearData(year);
    setYearData(data);
    showToast(`${year}학년도 사업 데이터로 전환되었습니다.`, 'info');
  };

  // Create New Year (2절)
  const createNewYear = (newYear: number, sourceYear: number) => {
    const cloned = cloneYearData(sourceYear, newYear);
    const updatedList = getStoredYearList();
    setYearList(updatedList);
    setCurrentYear(newYear);
    setYearData(cloned);
    showToast(
      `${newYear}학년도 사업 데이터가 ${sourceYear}학년도 골조를 기반으로 생성되었습니다.`,
      'success'
    );
  };

  // Update YearData helper
  const mutateYearData = (updater: (prev: YearData) => YearData) => {
    setYearData((prev) => {
      const next = updater(prev);
      saveYearData(currentYear, next);
      return next;
    });
  };

  // User Switcher & Role Switcher
  const setCurrentUserRole = (role: UserRole) => {
    const updated = { ...currentUser, role };
    setCurrentUser(updated);
    const updatedUsers = users.map((u) => (u.uid === currentUser.uid ? updated : u));
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    showToast(
      `사용자 권한이 [${
        role === 'super_admin' ? '주관리자' : role === 'sub_admin' ? '부관리자' : '보조관리자'
      }]로 변경되었습니다.`,
      'info'
    );
  };

  const switchUser = (uid: string) => {
    const found = users.find((u) => u.uid === uid);
    if (found) {
      setCurrentUser(found);
      showToast(`${found.name} (${found.role}) 계정으로 전환되었습니다.`, 'info');
    }
  };

  /**
   * 사용자별 탭(메뉴) 수정/삭제 권한 개별 설정 (체크박스 하나 토글할 때마다 호출)
   */
  const updateUserTabPermission = (
    uid: string,
    tabId: AppTabId,
    kind: 'edit' | 'delete',
    value: boolean
  ) => {
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.uid !== uid) return u;
        const currentTabPerms = u.tab_permissions || {};
        const currentForTab = currentTabPerms[tabId] || {};
        return {
          ...u,
          tab_permissions: {
            ...currentTabPerms,
            [tabId]: { ...currentForTab, [kind]: value },
          },
        };
      });
      saveUsers(next);
      return next;
    });
    setCurrentUser((prev) => {
      if (prev.uid !== uid) return prev;
      const currentTabPerms = prev.tab_permissions || {};
      const currentForTab = currentTabPerms[tabId] || {};
      return {
        ...prev,
        tab_permissions: {
          ...currentTabPerms,
          [tabId]: { ...currentForTab, [kind]: value },
        },
      };
    });
    showToast('사용자 권한이 업데이트되었습니다.', 'success');
  };

  /**
   * 현재 로그인한 사용자가 특정 탭을 수정(등록/편집)할 수 있는지 여부.
   * - 주관리자: 항상 true
   * - tab_permissions가 설정된 사용자: 그 탭의 edit 값
   * - tab_permissions 미설정(하위호환): 부관리자는 전체 허용, 보조관리자는 집행관리만 허용
   */
  const canEditTab = (tabId: AppTabId): boolean => {
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.tab_permissions) {
      return !!currentUser.tab_permissions[tabId]?.edit;
    }
    if (currentUser.role === 'sub_admin') return true;
    return tabId === 'executions';
  };

  /**
   * 현재 로그인한 사용자가 특정 탭에서 삭제를 시도할 수 있는지 여부.
   * - 주관리자: 항상 true
   * - 보조관리자: 삭제는 항상 승인요청으로만 처리되므로, 그 탭에 edit 권한(=접근 권한)이 있으면 요청 가능
   * - 부관리자: tab_permissions가 설정되어 있으면 그 탭의 delete 값을 그대로 따름 (미설정 시 하위호환으로 전체 허용)
   */
  const canDeleteTab = (tabId: AppTabId): boolean => {
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'assistant_admin') return canEditTab(tabId);
    if (currentUser.tab_permissions) {
      return !!currentUser.tab_permissions[tabId]?.delete;
    }
    return true;
  };

  // Task & Item Mutations
  const updateTask = (task: Task) => {
    mutateYearData((prev) => ({
      ...prev,
      tasks: { ...prev.tasks, [task.code]: task },
    }));
    showToast(`세부과제 [${task.code}] 정보가 저장되었습니다.`, 'success');
  };

  const updateTaskMatrix = (
    taskCode: string,
    matrix: Task['budget_matrix'],
    budgetTotal: number
  ) => {
    mutateYearData((prev) => {
      const target = prev.tasks[taskCode];
      if (!target) return prev;
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskCode]: {
            ...target,
            budget_matrix: matrix,
            budget_total: budgetTotal,
          },
        },
      };
    });
    showToast(`세부과제 [${taskCode}] 예산 매트릭스가 업데이트되었습니다.`, 'success');
  };

  /**
   * IZ 영역처럼 예산이 주요추진항목 단위로 명확히 구분된 경우, 항목별 예산 매트릭스를
   * 직접 수정한다. 저장 시 상위 세부과제의 budget_matrix/budget_total도 모든 항목의
   * 합계로 자동 재계산해서 총괄표(6절/8절)와 어긋나지 않게 맞춘다.
   */
  const updateItemBudgetMatrix = (
    taskCode: string,
    itemCode: string,
    matrix: NonNullable<TaskItem['budget_matrix']>
  ) => {
    mutateYearData((prev) => {
      const task = prev.tasks[taskCode];
      if (!task || !task.items[itemCode]) return prev;

      const updatedItems = {
        ...task.items,
        [itemCode]: {
          ...task.items[itemCode],
          budget_matrix: matrix,
        },
      };

      // 상위 세부과제 예산 매트릭스 = 모든 항목 예산의 합계로 재계산
      const aggregatedMatrix: Task['budget_matrix'] = {};
      let aggregatedTotal = 0;
      Object.values(updatedItems).forEach((it) => {
        if (!it.budget_matrix) return;
        Object.entries(it.budget_matrix).forEach(([cat, sources]) => {
          if (!aggregatedMatrix[cat]) {
            aggregatedMatrix[cat] = { 이월금: 0, 기본사업비: 0, 적정규모화: 0 };
          }
          const carry = Number(sources.이월금 || 0);
          const base = Number(sources.기본사업비 || 0);
          const scale = Number(sources.적정규모화 || 0);
          aggregatedMatrix[cat].이월금 = (aggregatedMatrix[cat].이월금 || 0) + carry;
          aggregatedMatrix[cat].기본사업비 = (aggregatedMatrix[cat].기본사업비 || 0) + base;
          aggregatedMatrix[cat].적정규모화 = (aggregatedMatrix[cat].적정규모화 || 0) + scale;
          aggregatedTotal += carry + base + scale;
        });
      });

      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskCode]: {
            ...task,
            items: updatedItems,
            budget_matrix: aggregatedMatrix,
            budget_total: aggregatedTotal,
          },
        },
      };
    });
    showToast(`주요추진항목 [${itemCode}] 예산이 업데이트되었습니다. (상위 세부과제 합계도 자동 반영)`, 'success');
  };

  const updateItemStatus = (
    taskCode: string,
    itemCode: string,
    status: ItemStatus,
    note?: string
  ) => {
    mutateYearData((prev) => {
      const task = prev.tasks[taskCode];
      if (!task || !task.items[itemCode]) return prev;
      const item = task.items[itemCode];
      const history = item.status_history || [];
      const newHistory = [
        ...history,
        {
          status,
          changed_at: new Date().toISOString(),
          changed_by: currentUser.name,
          note: note || '',
        },
      ];
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskCode]: {
            ...task,
            items: {
              ...task.items,
              [itemCode]: {
                ...item,
                status,
                status_history: newHistory,
              },
            },
          },
        },
      };
    });
    showToast(`추진항목 [${itemCode}] 진행상황이 '${status}'(으)로 변경되었습니다.`, 'success');
  };

  const updateItem = (
    taskCode: string,
    itemCode: string,
    name: string,
    department: string
  ) => {
    mutateYearData((prev) => {
      const task = prev.tasks[taskCode];
      if (!task || !task.items[itemCode]) return prev;
      const item = task.items[itemCode];
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskCode]: {
            ...task,
            items: {
              ...task.items,
              [itemCode]: {
                ...item,
                name,
                department,
              },
            },
          },
        },
      };
    });
  };

  /**
   * 세부과제 신규 추가 (예산은 0원 매트릭스로 시작, 예산관리 화면에서 편집)
   */
  const addTask = (domain: string, code: string, name: string, detail: string) => {
    let created = false;
    mutateYearData((prev) => {
      if (prev.tasks[code]) return prev; // 이미 같은 코드가 있으면 무시
      created = true;
      const newTask: Task = {
        code,
        domain,
        detail,
        name,
        budget_total: 0,
        budget_matrix: {},
        items: {},
      };
      return { ...prev, tasks: { ...prev.tasks, [code]: newTask } };
    });
    if (created) {
      showToast(`세부과제 [${code}]가 추가되었습니다.`, 'success');
    } else {
      showToast(`세부과제 코드 [${code}]가 이미 존재합니다.`, 'error');
    }
    return created;
  };

  /**
   * 세부과제 이름/설명 수정 (예산 매트릭스는 별도 updateTaskMatrix 사용)
   */
  const updateTaskInfo = (taskCode: string, name: string, detail: string) => {
    mutateYearData((prev) => {
      const target = prev.tasks[taskCode];
      if (!target) return prev;
      return { ...prev, tasks: { ...prev.tasks, [taskCode]: { ...target, name, detail } } };
    });
    showToast(`세부과제 [${taskCode}] 정보가 수정되었습니다.`, 'success');
  };

  /** 세부과제의 비목별 산출내역(산출근거) 텍스트를 수정 */
  const updateTaskCostBasis = (taskCode: string, category: string, content: string) => {
    mutateYearData((prev) => {
      const target = prev.tasks[taskCode];
      if (!target) return prev;
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskCode]: {
            ...target,
            cost_basis: { ...target.cost_basis, [category]: content },
          },
        },
      };
    });
  };

  const deleteTask = (taskCode: string) => {
    mutateYearData((prev) => {
      const next = { ...prev.tasks };
      delete next[taskCode];
      return { ...prev, tasks: next };
    });
    showToast(`세부과제 [${taskCode}]가 삭제되었습니다.`, 'success');
  };

  /**
   * 주요추진항목 신규 추가 (진행상황은 '예정'으로 시작)
   */
  const addItem = (taskCode: string, itemCode: string, name: string, department: string) => {
    let created = false;
    mutateYearData((prev) => {
      const task = prev.tasks[taskCode];
      if (!task || task.items[itemCode]) return prev;
      created = true;
      const newItem: TaskItem = {
        code: itemCode,
        task_code: taskCode,
        name,
        department,
        status: '예정',
        status_history: [],
      };
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskCode]: { ...task, items: { ...task.items, [itemCode]: newItem } },
        },
      };
    });
    if (created) {
      showToast(`주요추진항목 [${itemCode}]가 추가되었습니다.`, 'success');
    } else {
      showToast(`주요추진항목 코드 [${itemCode}]가 이미 존재하거나 세부과제를 찾을 수 없습니다.`, 'error');
    }
    return created;
  };

  const deleteItem = (taskCode: string, itemCode: string) => {
    mutateYearData((prev) => {
      const task = prev.tasks[taskCode];
      if (!task) return prev;
      const nextItems = { ...task.items };
      delete nextItems[itemCode];
      return { ...prev, tasks: { ...prev.tasks, [taskCode]: { ...task, items: nextItems } } };
    });
    showToast(`주요추진항목 [${itemCode}]가 삭제되었습니다.`, 'success');
  };

  // Execution Mutations (4절, 5절, 6절)
  const addExecution = (
    execData: Omit<Execution, 'id' | 'created_at' | 'created_by' | 'fund_allocations'>
  ) => {
    const task = yearData.tasks[execData.task_code];
    if (!task) {
      showToast('유효하지 않은 세부과제 코드입니다.', 'error');
      return { success: false, error: '유효하지 않은 세부과제' };
    }

    const allExecs = Object.values(yearData.executions) as Execution[];
    // 5절 자동 재원 소진 계산 (IZ처럼 항목별 예산이 별도로 있으면 그 항목 예산 풀 사용)
    const targetItem = execData.item_code ? task.items[execData.item_code] : undefined;
    const allocResult = calculateFundAllocation(task, execData.category, execData.amount, allExecs, undefined, targetItem);

    if (allocResult.isExceeded) {
      const msg = `해당 세부과제·비목의 예산 잔액이 부족합니다! (초과액: ₩${allocResult.exceedAmount.toLocaleString()})`;
      showToast(msg, 'error');
      return { success: false, error: msg };
    }

    const id = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newExec: Execution = {
      ...execData,
      id,
      fund_allocations: allocResult.allocations,
      created_by: currentUser.name,
      created_at: new Date().toISOString(),
      manage_order: getNextManageOrder(allExecs, execData.task_code),
    };

    // 4절: 보조관리자도 신규 등록은 즉시 반영!
    mutateYearData((prev) => ({
      ...prev,
      executions: { ...prev.executions, [id]: newExec },
    }));

    showToast('새로운 집행내역이 정상 등록되었습니다.', 'success');
    return { success: true };
  };

  const updateExecution = (id: string, updates: Partial<Execution>) => {
    const original = yearData.executions[id];
    if (!original) {
      showToast('해당 집행내역을 찾을 수 없습니다.', 'error');
      return { success: false, error: '존재하지 않는 항목' };
    }

    // 4절: 보조관리자가 수정할 경우 -> approval_requests에 요청 생성, 원본 보존
    if (currentUser.role === 'assistant_admin') {
      const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const req: ApprovalRequest = {
        id: reqId,
        type: 'update',
        target_exec_id: id,
        original_data: original,
        payload: updates,
        requested_by: {
          uid: currentUser.uid,
          name: currentUser.name,
          department: currentUser.department,
          role: currentUser.role,
        },
        requested_at: new Date().toISOString(),
        status: 'pending',
      };

      mutateYearData((prev) => ({
        ...prev,
        approval_requests: { ...prev.approval_requests, [reqId]: req },
      }));

      showToast('보조관리자 권한: 집행내역 수정 요청이 생성되었습니다.', 'info');
      return { success: true, isPendingApproval: true };
    }

    // 주관리자 또는 부관리자: 직접 수정 반영
    const targetTaskCode = updates.task_code || original.task_code;
    const targetCategory = (updates.category || original.category) as ExpenseCategory;
    const targetAmount = updates.amount !== undefined ? updates.amount : original.amount;
    const task = yearData.tasks[targetTaskCode];

    if (!task) {
      showToast('유효하지 않은 세부과제입니다.', 'error');
      return { success: false, error: '유효하지 않은 세부과제' };
    }

    const allExecs = Object.values(yearData.executions) as Execution[];
    const targetItemCode = updates.item_code || original.item_code;
    const targetItem = targetItemCode ? task.items[targetItemCode] : undefined;
    const allocResult = calculateFundAllocation(task, targetCategory, targetAmount, allExecs, id, targetItem);

    if (allocResult.isExceeded) {
      const msg = `예산 잔액 초과로 수정할 수 없습니다. (초과액: ₩${allocResult.exceedAmount.toLocaleString()})`;
      showToast(msg, 'error');
      return { success: false, error: msg };
    }

    const updatedExec: Execution = {
      ...original,
      ...updates,
      fund_allocations: allocResult.allocations,
      updated_at: new Date().toISOString(),
    };

    mutateYearData((prev) => ({
      ...prev,
      executions: { ...prev.executions, [id]: updatedExec },
    }));

    showToast('집행내역이 성공적으로 수정되었습니다.', 'success');
    return { success: true };
  };

  const deleteExecution = (id: string) => {
    const original = yearData.executions[id];
    if (!original) {
      showToast('해당 집행내역을 찾을 수 없습니다.', 'error');
      return { success: false, error: '존재하지 않는 항목' };
    }

    // 4절: 보조관리자가 삭제할 경우 -> approval_requests에 요청 생성, 원본 보존
    if (currentUser.role === 'assistant_admin') {
      const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const req: ApprovalRequest = {
        id: reqId,
        type: 'delete',
        target_exec_id: id,
        original_data: original,
        requested_by: {
          uid: currentUser.uid,
          name: currentUser.name,
          department: currentUser.department,
          role: currentUser.role,
        },
        requested_at: new Date().toISOString(),
        status: 'pending',
      };

      mutateYearData((prev) => ({
        ...prev,
        approval_requests: { ...prev.approval_requests, [reqId]: req },
      }));

      showToast('보조관리자 권한: 집행내역 삭제 요청이 생성되었습니다.', 'info');
      return { success: true, isPendingApproval: true };
    }

    // 주관리자 / 부관리자: 직접 삭제
    mutateYearData((prev) => {
      const nextExecs = { ...prev.executions };
      delete nextExecs[id];
      return { ...prev, executions: nextExecs };
    });

    showToast('집행내역이 삭제되었습니다.', 'success');
    return { success: true };
  };

  /** 같은 영역(도메인) 내에서 집행내역의 관리연번 순서를 한 칸 위/아래로 이동 */
  const moveExecutionOrder = (execId: string, direction: 'up' | 'down') => {
    mutateYearData((prev) => {
      const allExecs = Object.values(prev.executions) as Execution[];
      const updated = reorderExecutionManageNo(allExecs, execId, direction);
      if (!updated) return prev;

      const nextExecutions = { ...prev.executions };
      updated.forEach((e) => {
        nextExecutions[e.id] = e;
      });
      return { ...prev, executions: nextExecutions };
    });
  };

  /**
   * 관리연번의 숫자 부분을 사용자가 직접 입력해 고정 번호를 바꾼다. 같은 영역 안에 이미 그 번호를
   * 쓰는 다른 건이 있으면 막지는 않되 경고 토스트만 띄운다(자동 배정 로직은 항상 현재 최댓값+1을
   * 계산하므로, 향후 새 번호가 이 수정값과 충돌할 일은 없다).
   */
  const setExecutionManageOrder = (execId: string, newOrder: number) => {
    const target = yearData.executions[execId];
    if (!target) return;
    const domain = getDomainCode(target.task_code);
    const duplicate = (Object.values(yearData.executions) as Execution[]).find(
      (e) => e.id !== execId && getDomainCode(e.task_code) === domain && e.manage_order === newOrder
    );

    mutateYearData((prev) => {
      const orig = prev.executions[execId];
      if (!orig) return prev;
      return {
        ...prev,
        executions: { ...prev.executions, [execId]: { ...orig, manage_order: newOrder } },
      };
    });

    if (duplicate) {
      showToast(
        `이미 같은 영역에서 사용 중인 번호입니다 (${domain}${String(newOrder).padStart(3, '0')}). 번호는 저장되었지만 다른 건과 중복 표시될 수 있어요.`,
        'error'
      );
    }
  };

  // Approval Workflow (4절)
  const approveRequest = (requestId: string) => {
    const req = yearData.approval_requests[requestId];
    if (!req) return;

    mutateYearData((prev) => {
      const updatedReqs = {
        ...prev.approval_requests,
        [requestId]: {
          ...req,
          status: 'approved' as const,
          processed_by: { uid: currentUser.uid, name: currentUser.name },
          processed_at: new Date().toISOString(),
        },
      };

      let updatedExecs = { ...prev.executions };

      if (req.type === 'delete') {
        delete updatedExecs[req.target_exec_id];
      } else if (req.type === 'update' && req.payload) {
        const orig = prev.executions[req.target_exec_id];
        if (orig) {
          const targetTaskCode = req.payload.task_code || orig.task_code;
          const targetCategory = (req.payload.category || orig.category) as ExpenseCategory;
          const targetAmount = req.payload.amount !== undefined ? req.payload.amount : orig.amount;
          const task = prev.tasks[targetTaskCode];

          const allExecs = Object.values(prev.executions);
          const targetItemCode = req.payload.item_code || orig.item_code;
          const targetItem = task && targetItemCode ? task.items[targetItemCode] : undefined;
          const allocResult = calculateFundAllocation(
            task,
            targetCategory,
            targetAmount,
            allExecs,
            req.target_exec_id,
            targetItem
          );

          updatedExecs[req.target_exec_id] = {
            ...orig,
            ...req.payload,
            fund_allocations: allocResult.allocations,
            updated_at: new Date().toISOString(),
          };
        }
      }

      return {
        ...prev,
        executions: updatedExecs,
        approval_requests: updatedReqs,
      };
    });

    showToast(`요청 건이 승인되어 데이터에 반영되었습니다.`, 'success');
  };

  const rejectRequest = (requestId: string, reason: string) => {
    const req = yearData.approval_requests[requestId];
    if (!req) return;

    mutateYearData((prev) => ({
      ...prev,
      approval_requests: {
        ...prev.approval_requests,
        [requestId]: {
          ...req,
          status: 'rejected' as const,
          reject_reason: reason,
          processed_by: { uid: currentUser.uid, name: currentUser.name },
          processed_at: new Date().toISOString(),
        },
      },
    }));

    showToast(`요청 건이 반려 처리되었습니다. (사유: ${reason})`, 'info');
  };

  // Program Mutations (7절)
  const addProgram = (progData: Omit<Program, 'id' | 'updated_at'>) => {
    const id = `prog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newProg: Program = {
      ...progData,
      id,
      updated_at: new Date().toISOString(),
    };
    mutateYearData((prev) => {
      // 3번 요청: 세부프로그램을 등록하면, 소속된 주요추진항목이 '예정' 상태일 경우 자동으로 '진행중'으로 전환
      let nextTasks = prev.tasks;
      const task = prev.tasks[progData.task_code];
      const item = task?.items?.[progData.item_code];
      if (task && item && item.status === '예정') {
        const history = item.status_history || [];
        nextTasks = {
          ...prev.tasks,
          [progData.task_code]: {
            ...task,
            items: {
              ...task.items,
              [progData.item_code]: {
                ...item,
                status: '진행중',
                status_history: [
                  ...history,
                  {
                    status: '진행중',
                    changed_at: new Date().toISOString(),
                    changed_by: currentUser.name,
                    note: '세부프로그램 등록으로 자동 변경',
                  },
                ],
              },
            },
          },
        };
      }
      return {
        ...prev,
        programs: { ...prev.programs, [id]: newProg },
        tasks: nextTasks,
      };
    });
    showToast('세부프로그램이 등록되었습니다.', 'success');
  };

  const updateProgram = (id: string, updates: Partial<Program>) => {
    mutateYearData((prev) => {
      const orig = prev.programs[id];
      if (!orig) return prev;
      return {
        ...prev,
        programs: {
          ...prev.programs,
          [id]: {
            ...orig,
            ...updates,
            updated_at: new Date().toISOString(),
          },
        },
      };
    });
  };

  const deleteProgram = (id: string) => {
    mutateYearData((prev) => {
      const nextProgs = { ...prev.programs };
      delete nextProgs[id];
      return { ...prev, programs: nextProgs };
    });
    showToast('세부프로그램이 삭제되었습니다.', 'success');
  };

  // 성과 실적 관리 (7절 확장): 프로그램 외의 위원회 운영, 규정 정비, 구성원 참여, 성과확산, 협약체결 등
  const addAchievement = (data: Omit<Achievement, 'id' | 'created_at' | 'updated_at'>) => {
    const id = `ach-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAchievement: Achievement = {
      ...data,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mutateYearData((prev) => ({
      ...prev,
      achievements: { ...prev.achievements, [id]: newAchievement },
    }));
    showToast('성과 실적이 등록되었습니다.', 'success');
  };

  const updateAchievement = (id: string, updates: Partial<Achievement>) => {
    mutateYearData((prev) => {
      const orig = prev.achievements[id];
      if (!orig) return prev;
      return {
        ...prev,
        achievements: {
          ...prev.achievements,
          [id]: { ...orig, ...updates, updated_at: new Date().toISOString() },
        },
      };
    });
  };

  const deleteAchievement = (id: string) => {
    mutateYearData((prev) => {
      const next = { ...prev.achievements };
      delete next[id];
      return { ...prev, achievements: next };
    });
    showToast('성과 실적이 삭제되었습니다.', 'success');
  };

  // KPI Mutations (8절)
  const updateKpiSubMeasure = (
    kpiId: string,
    detailId: string,
    measureId: string,
    subMeasureId: string,
    actual: number | null,
    checkResult: 'O' | '-' | 'X',
    evidenceNo: string,
    evidenceDesc: string
  ) => {
    mutateYearData((prev) => {
      const nextKpis = prev.kpis.map((kpi) => {
        if (kpi.id !== kpiId) return kpi;
        return {
          ...kpi,
          details: kpi.details.map((det) => {
            if (det.id !== detailId) return det;
            return {
              ...det,
              measures: det.measures.map((mea) => {
                if (mea.id !== measureId) return mea;
                return {
                  ...mea,
                  sub_measures: mea.sub_measures.map((sm) => {
                    if (sm.id !== subMeasureId) return sm;
                    return {
                      ...sm,
                      actual,
                      check_result: checkResult,
                      evidence_no: evidenceNo,
                      evidence_desc: evidenceDesc,
                    };
                  }),
                };
              }),
            };
          }),
        };
      });

      // 8절: 상향 가중치 재계산 자동 실행
      const recalculated = recalculateKpiTree(nextKpis);
      return { ...prev, kpis: recalculated };
    });
  };

  const updateKpiSubMeasureRecommendedValue = (
    kpiId: string,
    detailId: string,
    measureId: string,
    subMeasureId: string,
    recommendedValue: number | null
  ) => {
    mutateYearData((prev) => {
      const nextKpis = prev.kpis.map((kpi) => {
        if (kpi.id !== kpiId) return kpi;
        return {
          ...kpi,
          details: kpi.details.map((det) => {
            if (det.id !== detailId) return det;
            return {
              ...det,
              measures: det.measures.map((mea) => {
                if (mea.id !== measureId) return mea;
                return {
                  ...mea,
                  sub_measures: mea.sub_measures.map((sm) =>
                    sm.id !== subMeasureId ? sm : { ...sm, recommended_value: recommendedValue }
                  ),
                };
              }),
            };
          }),
        };
      });
      return { ...prev, kpis: nextKpis };
    });
  };

  const updateKpiWeights = (
    kpiId: string,
    targetType: 'indicator' | 'detail' | 'measure',
    detailId: string | null,
    weights: number[],
    measureId?: string | null
  ) => {
    mutateYearData((prev) => {
      const nextKpis = prev.kpis.map((kpi) => {
        if (kpi.id !== kpiId) return kpi;
        if (targetType === 'indicator') {
          return { ...kpi, weights };
        }
        if (targetType === 'detail') {
          return {
            ...kpi,
            details: kpi.details.map((det) => (det.id !== detailId ? det : { ...det, weights })),
          };
        }
        // targetType === 'measure': 특정 세부지표 안의 특정 측정지표에 가중치 설정
        return {
          ...kpi,
          details: kpi.details.map((det) => {
            if (det.id !== detailId) return det;
            return {
              ...det,
              measures: det.measures.map((mea) => (mea.id !== measureId ? mea : { ...mea, weights })),
            };
          }),
        };
      });
      const recalculated = recalculateKpiTree(nextKpis);
      return { ...prev, kpis: recalculated };
    });
    showToast('KPI 가중치가 재설정되어 전체 지표가 재계산되었습니다.', 'success');
  };

  const updateKpiDetailInfo = (
    kpiId: string,
    detailId: string,
    updates: { name?: string; target?: number | null; recommended_value?: number | null }
  ) => {
    mutateYearData((prev) => ({
      ...prev,
      kpis: prev.kpis.map((kpi) => {
        if (kpi.id !== kpiId) return kpi;
        return {
          ...kpi,
          details: kpi.details.map((det) => (det.id !== detailId ? det : { ...det, ...updates })),
        };
      }),
    }));
    showToast('세부지표 정보가 수정되었습니다.', 'success');
  };

  const updateKpiMeasureInfo = (
    kpiId: string,
    detailId: string,
    measureId: string,
    updates: { name?: string }
  ) => {
    mutateYearData((prev) => ({
      ...prev,
      kpis: prev.kpis.map((kpi) => {
        if (kpi.id !== kpiId) return kpi;
        return {
          ...kpi,
          details: kpi.details.map((det) => {
            if (det.id !== detailId) return det;
            return {
              ...det,
              measures: det.measures.map((mea) => (mea.id !== measureId ? mea : { ...mea, ...updates })),
            };
          }),
        };
      }),
    }));
    showToast('측정지표 정보가 수정되었습니다.', 'success');
  };

  const updateKpiSubMeasureInfo = (
    kpiId: string,
    detailId: string,
    measureId: string,
    subMeasureId: string,
    updates: { name?: string; department?: string; detail_note?: string }
  ) => {
    mutateYearData((prev) => ({
      ...prev,
      kpis: prev.kpis.map((kpi) => {
        if (kpi.id !== kpiId) return kpi;
        return {
          ...kpi,
          details: kpi.details.map((det) => {
            if (det.id !== detailId) return det;
            return {
              ...det,
              measures: det.measures.map((mea) => {
                if (mea.id !== measureId) return mea;
                return {
                  ...mea,
                  sub_measures: mea.sub_measures.map((sm) =>
                    sm.id !== subMeasureId ? sm : { ...sm, ...updates }
                  ),
                };
              }),
            };
          }),
        };
      }),
    }));
    showToast('세부측정지표 정보가 수정되었습니다.', 'success');
  };

  const applyKpiRecommendation = (
    kpiId: string,
    detailId: string,
    measureId: string,
    subMeasureId: string,
    recommendedValue: number
  ) => {
    updateKpiSubMeasure(
      kpiId,
      detailId,
      measureId,
      subMeasureId,
      recommendedValue,
      'O',
      '권장값 적용',
      '권장목표치 100% 적용'
    );
    showToast(`권장값(${recommendedValue})이 실적값으로 자동 적용되었습니다.`, 'success');
  };

  // Fixed Data (9절)
  const addDepartment = (name: string) => {
    const id = `dept-${Date.now()}`;
    const newDept: Department = { id, name, order: departments.length + 1 };
    const updated = [...departments, newDept];
    setDepartments(updated);
    saveDepartments(updated);
    showToast(`담당부서 [${name}]이(가) 추가되었습니다.`, 'success');
  };

  const updateDepartment = (id: string, name: string) => {
    const updated = departments.map((d) => (d.id === id ? { ...d, name } : d));
    setDepartments(updated);
    saveDepartments(updated);
    showToast(`담당부서가 [${name}](으)로 수정되었습니다.`, 'success');
  };

  const deleteDepartment = (id: string) => {
    const updated = departments.filter((d) => d.id !== id);
    setDepartments(updated);
    saveDepartments(updated);
    showToast('담당부서가 삭제되었습니다.', 'success');
  };

  const addCorporateCard = (label: string, last4: string) => {
    const id = `card-${Date.now()}`;
    const newCard: CorporateCard = { id, label, last4 };
    const updated = [...corporateCards, newCard];
    setCorporateCards(updated);
    saveCorporateCards(updated);
    showToast(`법인카드 [${label}(${last4})]가 추가되었습니다.`, 'success');
  };

  const updateCorporateCard = (id: string, label: string, last4: string) => {
    const updated = corporateCards.map((c) => (c.id === id ? { ...c, label, last4 } : c));
    setCorporateCards(updated);
    saveCorporateCards(updated);
    showToast(`법인카드가 [${label}(${last4})]로 수정되었습니다.`, 'success');
  };

  const deleteCorporateCard = (id: string) => {
    const updated = corporateCards.filter((c) => c.id !== id);
    setCorporateCards(updated);
    saveCorporateCards(updated);
    showToast('법인카드가 삭제되었습니다.', 'success');
  };

  const executionsList = Object.values(yearData.executions) as Execution[];
  const programsList = Object.values(yearData.programs) as Program[];
  const achievementsList = Object.values(yearData.achievements || {}) as Achievement[];
  const approvalRequestsList = Object.values(yearData.approval_requests) as ApprovalRequest[];
  const pendingApprovalCount = approvalRequestsList.filter((r) => r.status === 'pending').length;

  return (
    <AppContext.Provider
      value={{
        currentYear,
        yearList,
        setYear,
        createNewYear,
        currentUser,
        users,
        setCurrentUserRole,
        switchUser,
        updateUserTabPermission,
        canEditTab,
        canDeleteTab,
        yearData,
        tasks: yearData.tasks,
        executions: executionsList,
        programs: programsList,
        achievements: achievementsList,
        kpis: yearData.kpis,
        approvalRequests: approvalRequestsList,
        pendingApprovalCount,
        departments,
        corporateCards,
        updateTask,
        updateTaskMatrix,
        updateItemBudgetMatrix,
        updateItemStatus,
        updateItem,
        addTask,
        updateTaskInfo,
        updateTaskCostBasis,
        deleteTask,
        addItem,
        deleteItem,
        addExecution,
        updateExecution,
        deleteExecution,
        moveExecutionOrder,
        setExecutionManageOrder,
        approveRequest,
        rejectRequest,
        addProgram,
        updateProgram,
        deleteProgram,
        addAchievement,
        updateAchievement,
        deleteAchievement,
        updateKpiSubMeasure,
        updateKpiWeights,
        applyKpiRecommendation,
        updateKpiSubMeasureRecommendedValue,
        updateKpiDetailInfo,
        updateKpiMeasureInfo,
        updateKpiSubMeasureInfo,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addCorporateCard,
        updateCorporateCard,
        deleteCorporateCard,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

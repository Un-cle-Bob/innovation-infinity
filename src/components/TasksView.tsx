import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory, FundSource, ItemStatus, Task, TaskItem } from '../types';
import { EXPENSE_CATEGORIES, FUND_SOURCES } from '../data/constants';
import { getTaskBudgetSummary, getItemBudgetSummary } from '../services/budgetEngine';
import {
  downloadBudgetImportTemplate,
  parseBudgetImportFile,
  BudgetImportResult,
} from '../services/budgetImport';
import { getDomainCode, getDomainColorTheme } from '../utils/domainColors';
import { parseDepartments } from '../utils/departments';
import { MultiDeptSelect } from './MultiDeptSelect';
import {
  FolderTree,
  Search,
  SlidersHorizontal,
  Edit3,
  Check,
  ChevronRight,
  ChevronDown,
  Building,
  Activity,
  DollarSign,
  Layers,
  X,
  History,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  LayoutGrid,
  Upload,
  Download,
  Plus,
  Trash2,
  Target,
  FileText,
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const {
    currentYear,
    tasks,
    executions,
    programs,
    departments,
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
    canEditTab,
    canDeleteTab,
    showToast,
  } = useApp();

  const canEditTasks = canEditTab('tasks');
  const canDeleteTasks = canDeleteTab('tasks');

  // 세부과제 추가/수정 모달 상태
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskDomain, setNewTaskDomain] = useState('IA');
  const [newTaskCode, setNewTaskCode] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDetail, setNewTaskDetail] = useState('');

  const [editingTaskCode, setEditingTaskCode] = useState<string | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<{ taskCode: string; item: TaskItem } | null>(null);
  const [addingCostBasisTaskCode, setAddingCostBasisTaskCode] = useState<string | null>(null);
  const [newCostBasisCategory, setNewCostBasisCategory] = useState<string>('');
  const [newCostBasisContent, setNewCostBasisContent] = useState('');
  const [editingCostBasisRow, setEditingCostBasisRow] = useState<{ taskCode: string; category: string } | null>(
    null
  );
  const [editCostBasisContent, setEditCostBasisContent] = useState('');
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDetail, setEditTaskDetail] = useState('');

  // 주요추진항목 추가/수정 상태
  const [addingItemToTask, setAddingItemToTask] = useState<string | null>(null);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDept, setNewItemDept] = useState('');

  const [editingItemKey, setEditingItemKey] = useState<string | null>(null); // `${taskCode}::${itemCode}`
  const [editItemName, setEditItemName] = useState('');
  const [editItemDept, setEditItemDept] = useState('');

  // 항목별 "관련 실적 요약" 펼치기 상태
  const [expandedItemKey, setExpandedItemKey] = useState<string | null>(null);

  // 엑셀 업로드(예산 일괄편집) 상태
  const budgetImportFileRef = React.useRef<HTMLInputElement>(null);
  const [budgetImportResult, setBudgetImportResult] = useState<BudgetImportResult | null>(null);
  const [isBudgetImportModalOpen, setIsBudgetImportModalOpen] = useState(false);
  const [isBudgetImporting, setIsBudgetImporting] = useState(false);


  const [viewMode, setViewMode] = useState<'tasks' | 'departments'>('tasks');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTaskCode, setExpandedTaskCode] = useState<string | null>('IA-1-1');

  // Matrix Editing Modal
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tempMatrix, setTempMatrix] = useState<Task['budget_matrix']>({});

  // IZ 전용: 주요추진항목별 예산 편집 모달
  const [editingItem, setEditingItem] = useState<{ taskCode: string; item: TaskItem } | null>(null);
  const [tempItemMatrix, setTempItemMatrix] = useState<Task['budget_matrix']>({});

  // Item Status History Modal
  const [selectedItemHistory, setSelectedItemHistory] = useState<{
    taskCode: string;
    item: TaskItem;
  } | null>(null);

  const domainOptions = [
    { code: 'ALL', label: '전체 영역' },
    { code: 'IA', label: '교육혁신 (IA)' },
    { code: 'IB', label: '고등직업교육혁신 (IB)' },
    { code: 'IC', label: '산학혁신 (IC)' },
    { code: 'ID', label: '지역협력혁신 (ID)' },
    { code: 'IE', label: '자율혁신 (IE)' },
    { code: 'IZ', label: '사업관리 (IZ)' },
  ];

  // 모든 부서 목록 (departments 및 task items에서 수집)
  const allDepartmentList = useMemo(() => {
    const deptSet = new Set<string>();
    departments.forEach((d) => deptSet.add(d.name));

    (Object.values(tasks) as Task[]).forEach((t) => {
      Object.values(t.items || {}).forEach((item) => {
        parseDepartments(item.department).forEach((d) => deptSet.add(d));
      });
    });

    return Array.from(deptSet).sort();
  }, [departments, tasks]);

  // 세부과제 목록 필터링 (과제 뷰)
  const filteredTasks = useMemo(() => {
    return (Object.values(tasks) as Task[]).filter((t) => {
      const matchDomain = selectedDomain === 'ALL' || t.code.startsWith(selectedDomain);
      
      const items = Object.values(t.items || {}) as TaskItem[];
      const matchDept =
        selectedDepartment === 'ALL' ||
        items.some((item) => parseDepartments(item.department).includes(selectedDepartment));

      const matchSearch =
        searchQuery.trim() === '' ||
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        items.some(
          (it) =>
            it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            it.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
            it.code.toLowerCase().includes(searchQuery.toLowerCase())
        );

      return matchDomain && matchDept && matchSearch;
    });
  }, [tasks, selectedDomain, selectedDepartment, searchQuery]);

  // 부서별 추진항목 & 세부과제 그룹핑 데이터 (부서별 뷰). 부서가 2개 이상인 항목은 해당하는 모든 부서 그룹에 나타남
  const departmentGroupedData = useMemo(() => {
    const deptMap: {
      [deptName: string]: {
        department: string;
        taskCodes: Set<string>;
        items: Array<{ taskCode: string; taskName: string; item: TaskItem }>;
      };
    } = {};

    allDepartmentList.forEach((d) => {
      deptMap[d] = {
        department: d,
        taskCodes: new Set<string>(),
        items: [],
      };
    });

    (Object.values(tasks) as Task[]).forEach((t) => {
      if (selectedDomain !== 'ALL' && !t.code.startsWith(selectedDomain)) return;

      Object.values(t.items || {}).forEach((item) => {
        const itemDepts = parseDepartments(item.department);
        const targetDepts = itemDepts.length > 0 ? itemDepts : ['미지정'];

        targetDepts.forEach((dName) => {
          if (!deptMap[dName]) {
            deptMap[dName] = { department: dName, taskCodes: new Set(), items: [] };
          }

          const matchSearch =
            searchQuery.trim() === '' ||
            dName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.code.toLowerCase().includes(searchQuery.toLowerCase());

        if (matchSearch) {
          deptMap[dName].taskCodes.add(t.code);
          deptMap[dName].items.push({
            taskCode: t.code,
            taskName: t.name,
            item,
          });
        }
        });
      });
    });

    return Object.values(deptMap)
      .filter((g) => {
        if (selectedDepartment !== 'ALL' && g.department !== selectedDepartment) return false;
        return g.items.length > 0;
      })
      .sort((a, b) => b.items.length - a.items.length);
  }, [tasks, allDepartmentList, selectedDomain, selectedDepartment, searchQuery]);

  // 엑셀 업로드(예산 일괄편집) 핸들러
  const handleDownloadBudgetTemplate = () => {
    downloadBudgetImportTemplate(tasks, currentYear);
  };

  const handleBudgetImportButtonClick = () => {
    budgetImportFileRef.current?.click();
  };

  const handleBudgetImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseBudgetImportFile(file, tasks);
      setBudgetImportResult(result);
      setIsBudgetImportModalOpen(true);
    } catch (err) {
      showToast('엑셀 파일을 읽는 중 오류가 발생했습니다. 양식을 다시 확인해주세요.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmBudgetImport = () => {
    if (!budgetImportResult) return;
    setIsBudgetImporting(true);
    budgetImportResult.updates.forEach((u) => {
      updateTaskMatrix(u.taskCode, u.matrix, u.total);
    });
    setIsBudgetImporting(false);
    setIsBudgetImportModalOpen(false);
    setBudgetImportResult(null);
  };

  // 세부과제 추가/수정/삭제 핸들러
  const handleOpenAddTaskModal = () => {
    setNewTaskDomain('IA');
    setNewTaskCode('');
    setNewTaskName('');
    setNewTaskDetail('');
    setIsAddTaskModalOpen(true);
  };

  const handleSubmitAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskCode.trim() || !newTaskName.trim()) return;
    const ok = addTask(newTaskDomain, newTaskCode.trim(), newTaskName.trim(), newTaskDetail.trim());
    if (ok) setIsAddTaskModalOpen(false);
  };

  const handleStartEditTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskCode(task.code);
    setEditTaskName(task.name);
    setEditTaskDetail(task.detail || '');
  };

  const handleSaveEditTask = () => {
    if (!editingTaskCode || !editTaskName.trim()) return;
    updateTaskInfo(editingTaskCode, editTaskName.trim(), editTaskDetail.trim());
    setEditingTaskCode(null);
  };

  const handleDeleteTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTaskTarget(task);
  };

  // 주요추진항목 추가/수정/삭제 핸들러
  const handleOpenAddItemForm = (taskCode: string) => {
    setNewItemCode('');
    setNewItemName('');
    setNewItemDept(departments[0]?.name || '');
    setAddingItemToTask(taskCode);
  };

  const handleSubmitAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingItemToTask || !newItemCode.trim() || !newItemName.trim()) return;
    const ok = addItem(addingItemToTask, newItemCode.trim(), newItemName.trim(), newItemDept);
    if (ok) setAddingItemToTask(null);
  };

  const handleStartEditItem = (taskCode: string, item: TaskItem) => {
    setEditingItemKey(`${taskCode}::${item.code}`);
    setEditItemName(item.name);
    setEditItemDept(item.department);
  };

  const handleSaveEditItem = (taskCode: string, itemCode: string) => {
    if (!editItemName.trim()) return;
    updateItem(taskCode, itemCode, editItemName.trim(), editItemDept);
    setEditingItemKey(null);
  };

  const handleDeleteItem = (taskCode: string, item: TaskItem) => {
    setDeleteItemTarget({ taskCode, item });
  };

  const handleOpenMatrixModal = (task: Task) => {
    setEditingTask(task);
    setTempMatrix(JSON.parse(JSON.stringify(task.budget_matrix || {})));
  };

  const handleMatrixCellChange = (
    category: ExpenseCategory,
    source: FundSource,
    value: string
  ) => {
    const num = value === '' ? null : Number(value);
    setTempMatrix((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [source]: num,
      },
    }));
  };

  const handleSaveMatrix = () => {
    if (!editingTask) return;

    // Calculate total from matrix
    let total = 0;
    EXPENSE_CATEGORIES.forEach((cat) => {
      const row = tempMatrix[cat] || {};
      FUND_SOURCES.forEach((src) => {
        total += Number(row[src] || 0);
      });
    });

    updateTaskMatrix(editingTask.code, tempMatrix, total > 0 ? total : editingTask.budget_total);
    setEditingTask(null);
  };

  const handleOpenItemMatrixModal = (taskCode: string, item: TaskItem) => {
    setEditingItem({ taskCode, item });
    setTempItemMatrix(JSON.parse(JSON.stringify(item.budget_matrix || {})));
  };

  const handleItemMatrixCellChange = (
    category: ExpenseCategory,
    source: FundSource,
    value: string
  ) => {
    const num = value === '' ? null : Number(value);
    setTempItemMatrix((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [source]: num,
      },
    }));
  };

  const handleSaveItemMatrix = () => {
    if (!editingItem) return;
    updateItemBudgetMatrix(editingItem.taskCode, editingItem.item.code, tempItemMatrix);
    setEditingItem(null);
  };

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case '예정':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case '진행중':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case '완료':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case '보류':
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. View Header & Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">예산 관리</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            세부과제별 7비목 × 3재원 예산 매트릭스 및 부서별 주요추진항목(실행부서/진행상황) 통합 관리
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('tasks')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'tasks'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree className="h-3.5 w-3.5" />
              <span>과제별 보기 ({filteredTasks.length})</span>
            </button>
            <button
              onClick={() => setViewMode('departments')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'departments'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <Building className="h-3.5 w-3.5" />
              <span>부서별 추진항목·예산 보기</span>
            </button>
          </div>

          {/* 예산 엑셀 일괄편집 (IZ 영역 제외) */}
          {canEditTasks && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleOpenAddTaskModal}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                title="새 세부과제 추가"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>세부과제 추가</span>
              </button>
              <button
                onClick={handleDownloadBudgetTemplate}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                title="세부과제 예산(비목×재원) 일괄편집용 엑셀 양식 다운로드 (IZ 영역 제외)"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>예산 양식 다운로드</span>
              </button>
              <input
                ref={budgetImportFileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleBudgetImportFileSelected}
              />
              <button
                onClick={handleBudgetImportButtonClick}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                title="엑셀로 여러 세부과제 예산을 한 번에 반영 (IZ 영역 제외)"
              >
                <Upload className="h-3.5 w-3.5 text-indigo-600" />
                <span>예산 엑셀 업로드</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Filter Bar (Domain + Department + Search) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Domain Filter Tabs & Department Select */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">영역:</span>
              <div className="flex flex-wrap gap-1">
                {domainOptions.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => setSelectedDomain(opt.code)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      selectedDomain === opt.code
                        ? 'bg-slate-900 text-white font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Department Filter (Dropdown) */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Building className="h-3.5 w-3.5 text-indigo-600" />
                <span>실행부서:</span>
              </div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs text-slate-800 font-bold focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">전체 부서 (전체 과제)</option>
                {allDepartmentList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="과제/항목/부서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3-A. TASK-CENTRIC VIEW (세부과제별 뷰) */}
      {/* ========================================================= */}
      {viewMode === 'tasks' && (
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              선택한 조건에 일치하는 세부과제가 없습니다.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isExpanded = expandedTaskCode === task.code;
              const summary = getTaskBudgetSummary(task, executions);
              const itemsList = Object.values(task.items || {}) as TaskItem[];
              const domainTheme = getDomainColorTheme(getDomainCode(task.code));

              return (
                <div
                  key={task.code}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs transition-all"
                >
                  {/* Task Header Row */}
                  <div
                    onClick={() => setExpandedTaskCode(isExpanded ? null : task.code)}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between bg-white hover:bg-slate-50/70 cursor-pointer border-b border-slate-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0" onClick={(e) => editingTaskCode === task.code && e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-mono font-extrabold border ${domainTheme.badge}`}
                          >
                            {task.code}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            [{task.domain}]
                          </span>
                        </div>
                        {editingTaskCode === task.code ? (
                          <div className="mt-1.5 space-y-1.5 max-w-md">
                            <input
                              type="text"
                              value={editTaskName}
                              onChange={(e) => setEditTaskName(e.target.value)}
                              placeholder="세부과제명"
                              className="w-full rounded-md border border-indigo-300 px-2 py-1 text-sm font-bold"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={editTaskDetail}
                              onChange={(e) => setEditTaskDetail(e.target.value)}
                              placeholder="세부내용 (선택)"
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={handleSaveEditTask}
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                              >
                                <Check className="h-3 w-3" />
                                저장
                              </button>
                              <button
                                onClick={() => setEditingTaskCode(null)}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
                              >
                                <X className="h-3 w-3" />
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-sm font-bold text-slate-900 mt-1">{task.name}</h3>
                            {task.detail && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.detail}</p>
                            )}
                          </>
                        )}
                      </div>
                      {canEditTasks && editingTaskCode !== task.code && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => handleStartEditTask(task, e)}
                            className="rounded-md p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            title="세부과제명/내용 수정"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          {canDeleteTasks && (
                            <button
                              onClick={(e) => handleDeleteTask(task, e)}
                              className="rounded-md p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="세부과제 삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Budget & Execution Stats */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 pl-10 sm:pl-0">
                      <div className="w-32 text-right shrink-0">
                        <span className="block text-[10px] font-semibold text-slate-400">총 예산</span>
                        <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                          ₩{summary.total_budget.toLocaleString()}
                        </span>
                      </div>

                      <div className="w-32 text-right shrink-0">
                        <span className="block text-[10px] font-semibold text-slate-400">누적 집행액</span>
                        <span className="text-xs font-bold text-emerald-600 font-mono tabular-nums">
                          ₩{summary.total_executed.toLocaleString()}
                        </span>
                      </div>

                      <div className="w-40 text-right shrink-0">
                        <span className="block text-[10px] font-semibold text-slate-400">잔액 (집행률)</span>
                        <span className="text-xs font-bold text-blue-700 font-mono tabular-nums">
                          ₩{summary.total_remaining.toLocaleString()}
                          <span className="ml-1 text-[11px] text-indigo-600">
                            ({summary.execution_rate.toFixed(1)}%)
                          </span>
                        </span>
                        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${
                              summary.execution_rate >= 80
                                ? 'bg-emerald-500'
                                : summary.execution_rate >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, summary.execution_rate)}%` }}
                          />
                        </div>
                      </div>

                      {canEditTab('tasks') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMatrixModal(task);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
                          title="7비목 × 3재원 예산 매트릭스 편집"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          <span>예산 매트릭스</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details Body */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50/50 space-y-4">
                      {/* 0) 산출내역 (비목별 산출근거) — 세부과제마다 비목 개수가 다르므로 행을 하나씩 추가하는 방식 */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-600" />
                            <h4 className="text-xs font-bold text-slate-800">산출내역</h4>
                            <span className="text-[11px] text-slate-400">비목별 예산 산출근거</span>
                          </div>
                          {canEditTasks && addingCostBasisTaskCode !== task.code && (
                            <button
                              onClick={() => {
                                const usedCats = Object.keys(task.cost_basis || {}).filter(
                                  (c) => task.cost_basis?.[c]
                                );
                                const nextCat = EXPENSE_CATEGORIES.find((c) => !usedCats.includes(c));
                                if (!nextCat) {
                                  showToast('7개 비목에 이미 모두 산출내역이 등록되어 있습니다.', 'info');
                                  return;
                                }
                                setAddingCostBasisTaskCode(task.code);
                                setNewCostBasisCategory(nextCat);
                                setNewCostBasisContent('');
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              <Plus className="h-3 w-3" />
                              행 추가
                            </button>
                          )}
                        </div>

                        <div className="mt-2 divide-y divide-slate-100">
                          {EXPENSE_CATEGORIES.filter((cat) => task.cost_basis?.[cat]).length === 0 &&
                            addingCostBasisTaskCode !== task.code && (
                              <p className="py-3 text-[11px] text-slate-400">
                                등록된 산출내역이 없습니다. {canEditTasks && '"행 추가"를 눌러 비목별 산출근거를 입력해보세요.'}
                              </p>
                            )}

                          {EXPENSE_CATEGORIES.filter((cat) => task.cost_basis?.[cat]).map((cat) => {
                            const isEditingThis =
                              editingCostBasisRow?.taskCode === task.code &&
                              editingCostBasisRow?.category === cat;
                            return (
                              <div key={cat} className="flex gap-3 py-2 group">
                                <div className="w-28 shrink-0 pt-0.5">
                                  <span className="text-[11px] font-bold text-slate-700">{cat}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  {isEditingThis ? (
                                    <div className="space-y-1.5">
                                      <textarea
                                        value={editCostBasisContent}
                                        onChange={(e) => setEditCostBasisContent(e.target.value)}
                                        rows={2}
                                        autoFocus
                                        className="w-full rounded-md border border-indigo-300 px-2 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                                      />
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => {
                                            updateTaskCostBasis(task.code, cat, editCostBasisContent);
                                            setEditingCostBasisRow(null);
                                          }}
                                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                                        >
                                          <Check className="h-3 w-3" />
                                          저장
                                        </button>
                                        <button
                                          onClick={() => setEditingCostBasisRow(null)}
                                          className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-300"
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                                        {task.cost_basis?.[cat]}
                                      </p>
                                      {canEditTasks && (
                                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setEditingCostBasisRow({ taskCode: task.code, category: cat });
                                              setEditCostBasisContent(task.cost_basis?.[cat] || '');
                                            }}
                                            className="text-slate-400 hover:text-indigo-600 p-0.5"
                                            title="수정"
                                          >
                                            <Edit3 className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => updateTaskCostBasis(task.code, cat, '')}
                                            className="text-slate-400 hover:text-rose-600 p-0.5"
                                            title="삭제"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* 행 추가 폼 */}
                          {addingCostBasisTaskCode === task.code && (
                            <div className="flex gap-3 py-2.5 bg-indigo-50/40 -mx-3.5 px-3.5">
                              <div className="w-28 shrink-0">
                                <select
                                  value={newCostBasisCategory}
                                  onChange={(e) => setNewCostBasisCategory(e.target.value)}
                                  className="w-full rounded-md border border-indigo-300 px-1.5 py-1 text-[11px] font-bold text-indigo-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                                >
                                  {EXPENSE_CATEGORIES.filter(
                                    (c) => !task.cost_basis?.[c] || c === newCostBasisCategory
                                  ).map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <textarea
                                  value={newCostBasisContent}
                                  onChange={(e) => setNewCostBasisContent(e.target.value)}
                                  rows={2}
                                  autoFocus
                                  placeholder="산출근거를 입력하세요 (예: 강사비 300,000원×3건=900,000원)"
                                  className="w-full rounded-md border border-indigo-300 px-2 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                                />
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      if (!newCostBasisCategory) return;
                                      updateTaskCostBasis(task.code, newCostBasisCategory, newCostBasisContent);
                                      setAddingCostBasisTaskCode(null);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                                  >
                                    <Check className="h-3 w-3" />
                                    추가
                                  </button>
                                  <button
                                    onClick={() => setAddingCostBasisTaskCode(null)}
                                    className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-300"
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 1) 7비목 x 3재원 실시간 잔액표 */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-indigo-600" />
                            <h4 className="text-xs font-bold text-slate-800">
                              예산 비목 × 재원별 편성 및 소진 잔액표 (실시간)
                            </h4>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            이월금 우선 소진 / 세목 잔액 실시간 추적
                          </span>
                        </div>

                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-xs text-left table-fixed">
                            <colgroup>
                              <col style={{ width: '18%' }} />
                              <col style={{ width: '22%' }} />
                              <col style={{ width: '22%' }} />
                              <col style={{ width: '22%' }} />
                              <col style={{ width: '16%' }} />
                            </colgroup>
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                              <tr>
                                <th className="p-2 font-semibold">비목</th>
                                <th className="p-2 text-right font-semibold">이월금 (편성/집행/잔액)</th>
                                <th className="p-2 text-right font-semibold">기본사업비 (편성/집행/잔액)</th>
                                <th className="p-2 text-right font-semibold">적정규모화 (편성/집행/잔액)</th>
                                <th className="p-2 text-right font-bold text-slate-900">비목 합계 (잔액)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {summary.categories.map((c) => {
                                const hasBudget = c.budget.total > 0;
                                return (
                                  <tr
                                    key={c.category}
                                    className={`hover:bg-slate-50/80 ${
                                      !hasBudget && c.executed.total === 0 ? 'text-slate-400' : 'text-slate-800'
                                    }`}
                                  >
                                    <td className="p-2 font-medium">{c.category}</td>
                                    <td className="p-2">
                                      {c.budget.이월금 > 0 || c.executed.이월금 > 0 ? (
                                        <div className="flex items-center justify-end gap-1 font-mono text-[11px] tabular-nums">
                                          <span className="w-14 text-right truncate">{c.budget.이월금.toLocaleString()}</span>
                                          <span className="text-slate-300">/</span>
                                          <span className="w-14 text-right truncate font-bold text-emerald-600">{c.executed.이월금.toLocaleString()}</span>
                                          <span className="text-slate-300">/</span>
                                          <span className="w-14 text-right truncate font-bold text-blue-600">{c.remaining.이월금.toLocaleString()}</span>
                                        </div>
                                      ) : (
                                        <div className="text-right text-slate-300">-</div>
                                      )}
                                    </td>
                                    <td className="p-2">
                                      {c.budget.기본사업비 > 0 || c.executed.기본사업비 > 0 ? (
                                        <div className="flex items-center justify-end gap-1 font-mono text-[11px] tabular-nums">
                                          <span className="w-14 text-right truncate">{c.budget.기본사업비.toLocaleString()}</span>
                                          <span className="text-slate-300">/</span>
                                          <span className="w-14 text-right truncate font-bold text-emerald-600">{c.executed.기본사업비.toLocaleString()}</span>
                                          <span className="text-slate-300">/</span>
                                          <span className="w-14 text-right truncate font-bold text-blue-600">{c.remaining.기본사업비.toLocaleString()}</span>
                                        </div>
                                      ) : (
                                        <div className="text-right text-slate-300">-</div>
                                      )}
                                    </td>
                                    <td className="p-2">
                                      {c.budget.적정규모화 > 0 || c.executed.적정규모화 > 0 ? (
                                        <div className="flex items-center justify-end gap-1 font-mono text-[11px] tabular-nums">
                                          <span className="w-14 text-right truncate">{c.budget.적정규모화.toLocaleString()}</span>
                                          <span className="text-slate-300">/</span>
                                          <span className="w-14 text-right truncate font-bold text-emerald-600">{c.executed.적정규모화.toLocaleString()}</span>
                                          <span className="text-slate-300">/</span>
                                          <span className="w-14 text-right truncate font-bold text-blue-600">{c.remaining.적정규모화.toLocaleString()}</span>
                                        </div>
                                      ) : (
                                        <div className="text-right text-slate-300">-</div>
                                      )}
                                    </td>
                                    <td className="p-2 text-right font-mono text-xs font-bold text-indigo-900 tabular-nums">
                                      ₩{c.remaining.total.toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 2) 주요추진항목 리스트 */}
                      <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-emerald-600" />
                            <h4 className="text-xs font-bold text-slate-800">
                              주요추진항목 및 실행부서별 추진현황 ({itemsList.length}개)
                            </h4>
                          </div>
                          {canEditTasks && (
                            <button
                              onClick={() => handleOpenAddItemForm(task.code)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                            >
                              <Plus className="h-3 w-3" />
                              항목 추가
                            </button>
                          )}
                        </div>

                        {/* 항목 추가 인라인 폼 */}
                        {addingItemToTask === task.code && (
                          <form
                            onSubmit={handleSubmitAddItem}
                            className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/50 p-2.5"
                          >
                            <input
                              type="text"
                              value={newItemCode}
                              onChange={(e) => setNewItemCode(e.target.value)}
                              placeholder={`코드 (예: ${task.code}-1)`}
                              className="w-36 rounded-md border border-slate-300 px-2 py-1 text-xs font-mono"
                              required
                            />
                            <input
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              placeholder="주요추진항목 내용"
                              className="flex-1 min-w-[160px] rounded-md border border-slate-300 px-2 py-1 text-xs"
                              required
                            />
                            <MultiDeptSelect
                              allDepts={departments}
                              value={newItemDept}
                              onChange={setNewItemDept}
                              className="flex items-center justify-between gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs min-w-[150px]"
                            />
                            <button
                              type="submit"
                              className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                            >
                              추가
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddingItemToTask(null)}
                              className="rounded-md bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-300"
                            >
                              취소
                            </button>
                          </form>
                        )}

                        <div className="mt-3 space-y-2">
                          {itemsList.map((item) => {
                            const itemKey = `${task.code}::${item.code}`;
                            const isEditingItem = editingItemKey === itemKey;
                            const isExpandedItem = expandedItemKey === itemKey;
                            const linkedPrograms = programs.filter((p) => p.item_code === item.code);

                            return (
                            <div
                              key={item.code}
                              className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between ${
                                selectedDepartment !== 'ALL' && item.department === selectedDepartment
                                  ? 'border-indigo-300 bg-indigo-50/40 ring-1 ring-indigo-200'
                                  : 'border-slate-100 bg-slate-50/60'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-slate-700 shrink-0">
                                  {item.code}
                                </span>
                                <div className="flex-1 min-w-0">
                                  {isEditingItem ? (
                                    <div className="space-y-1.5 max-w-sm">
                                      <input
                                        type="text"
                                        value={editItemName}
                                        onChange={(e) => setEditItemName(e.target.value)}
                                        className="w-full rounded-md border border-indigo-300 px-2 py-1 text-xs font-bold"
                                        autoFocus
                                      />
                                      <MultiDeptSelect
                                        allDepts={departments}
                                        value={editItemDept}
                                        onChange={setEditItemDept}
                                        className="flex items-center justify-between gap-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                                      />
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleSaveEditItem(task.code, item.code)}
                                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                                        >
                                          <Check className="h-3 w-3" />
                                          저장
                                        </button>
                                        <button
                                          onClick={() => setEditingItemKey(null)}
                                          className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-300"
                                        >
                                          <X className="h-3 w-3" />
                                          취소
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                          onClick={() =>
                                            setExpandedItemKey(isExpandedItem ? null : itemKey)
                                          }
                                          className="text-xs font-bold text-slate-900 hover:text-indigo-700 hover:underline text-left"
                                          title="관련 실적(세부프로그램) 요약 보기"
                                        >
                                          {item.name}
                                        </button>
                                        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                          <Building className="h-3 w-3" />
                                          {item.department}
                                        </span>
                                        {linkedPrograms.length > 0 && (
                                          <button
                                            onClick={() =>
                                              setExpandedItemKey(isExpandedItem ? null : itemKey)
                                            }
                                            className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                          >
                                            <Target className="h-3 w-3" />
                                            관련 실적 {linkedPrograms.length}건
                                          </button>
                                        )}
                                      </div>
                                      {item.detail && (
                                        <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                                      )}
                                    </>
                                  )}

                                  {/* 관련 실적(세부프로그램) 요약 패널 */}
                                  {isExpandedItem && !isEditingItem && (
                                    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50/40 p-2.5 space-y-2">
                                      {linkedPrograms.length === 0 ? (
                                        <p className="text-[11px] text-slate-500">
                                          이 항목에 연결된 세부프로그램이 아직 없습니다.
                                        </p>
                                      ) : (
                                        (() => {
                                          // 통기안(같은 내부결재문서번호를 공유하는 프로그램 묶음)은 문서번호끼리만 모아서 보여줌
                                          // (집행액은 이 패널에서 다루지 않음 — 항목 단위 집행액은 아래 항목 헤더에 별도 표시)
                                          const groups = new Map<string, typeof linkedPrograms>();
                                          linkedPrograms.forEach((p) => {
                                            const key = p.internal_approval_doc_number || `__단독__${p.id}`;
                                            if (!groups.has(key)) groups.set(key, []);
                                            groups.get(key)!.push(p);
                                          });

                                          return Array.from(groups.entries()).map(([docKey, groupPrograms]) => {
                                            const isBundled = groupPrograms.length > 1;

                                            return (
                                              <div
                                                key={docKey}
                                                className="rounded bg-white border border-emerald-100 px-2 py-1.5 text-[11px] space-y-1"
                                              >
                                                {isBundled && (
                                                  <div className="flex items-center gap-1.5 pb-1 border-b border-dashed border-emerald-200">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700">
                                                      <FileText className="h-3 w-3" />
                                                      통기안 {groupPrograms.length}건 ({groupPrograms[0].internal_approval_doc_number})
                                                    </span>
                                                  </div>
                                                )}
                                                {groupPrograms.map((p) => (
                                                  <div key={p.id} className="space-y-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                      <div className="flex items-center gap-1.5 min-w-0">
                                                        <span
                                                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold border ${getStatusColor(
                                                            p.status
                                                          )}`}
                                                        >
                                                          {p.status}
                                                        </span>
                                                        <span className="font-semibold text-slate-800 truncate">
                                                          {p.name}
                                                          {p.round_label ? ` (${p.round_label})` : ''}
                                                        </span>
                                                      </div>
                                                      <div className="shrink-0 text-slate-500">
                                                        참여 {p.performance?.participants ?? 0}명
                                                        {p.performance?.satisfaction_score
                                                          ? ` · 만족도 ${p.performance.satisfaction_score.toFixed(1)}`
                                                          : ''}
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                                                      {p.result_report_doc_number ? (
                                                        <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                                                          <FileText className="h-3 w-3" />
                                                          {p.result_report_doc_number}
                                                        </span>
                                                      ) : p.status === '완료' ? (
                                                        <span className="inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                                          결과보고서 미제출
                                                        </span>
                                                      ) : (
                                                        <span className="text-[10px] text-slate-300">결과보고서 -</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          });
                                        })()
                                      )}
                                    </div>
                                  )}

                                  {/* IZ 영역처럼 항목별 예산이 별도로 있는 경우: 항목 고유 예산 요약 + 편집 */}
                                  {item.budget_matrix && (
                                    (() => {
                                      const itemSummary = getItemBudgetSummary(item, executions);
                                      return (
                                        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-amber-50/50 px-2.5 py-1.5">
                                          <span className="text-[10px] font-bold text-amber-800">항목별 예산</span>
                                          <div className="w-28 text-right">
                                            <span className="block text-[9px] font-semibold text-slate-400">예산</span>
                                            <span className="text-[11px] font-bold text-slate-900 font-mono tabular-nums">
                                              ₩{itemSummary.total_budget.toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="w-28 text-right">
                                            <span className="block text-[9px] font-semibold text-slate-400">집행액</span>
                                            <span className="text-[11px] font-bold text-emerald-700 font-mono tabular-nums">
                                              ₩{itemSummary.total_executed.toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="w-32 text-right">
                                            <span className="block text-[9px] font-semibold text-slate-400">잔액 (집행률)</span>
                                            <span className="text-[11px] font-bold text-blue-700 font-mono tabular-nums">
                                              ₩{itemSummary.total_remaining.toLocaleString()}
                                              <span className="ml-1 text-indigo-600">
                                                ({itemSummary.execution_rate.toFixed(1)}%)
                                              </span>
                                            </span>
                                          </div>
                                          {canEditTab('tasks') && (
                                            <button
                                              onClick={() => handleOpenItemMatrixModal(task.code, item)}
                                              className="ml-auto inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                                              title="이 항목 고유의 예산 매트릭스 편집"
                                            >
                                              <SlidersHorizontal className="h-3 w-3" />
                                              항목 예산 편집
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })()
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 pl-8 sm:pl-0">
                                {(() => {
                                  // 항목(item.code) 코드로 등록된 모든 집행내역의 합 — 문서번호 매칭이 아니라
                                  // task_code+item_code로 직접 집계하므로 통기안이 있어도 중복될 일이 없음
                                  const itemExecAmount = executions
                                    .filter((e) => e.task_code === task.code && e.item_code === item.code)
                                    .reduce((sum, e) => sum + e.amount, 0);
                                  return (
                                    <div className="text-right">
                                      <span className="block text-[9px] font-semibold text-slate-400">집행액</span>
                                      <span className="text-xs font-bold text-emerald-700 font-mono tabular-nums">
                                        ₩{itemExecAmount.toLocaleString()}
                                      </span>
                                    </div>
                                  );
                                })()}

                                <select
                                  value={item.status}
                                  disabled={!canEditTab('tasks')}
                                  onChange={(e) =>
                                    updateItemStatus(
                                      task.code,
                                      item.code,
                                      e.target.value as ItemStatus,
                                      '진행상태 갱신'
                                    )
                                  }
                                  className={`rounded-md border px-2 py-1 text-xs font-bold focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${getStatusColor(
                                    item.status
                                  )}`}
                                >
                                  <option value="예정">예정</option>
                                  <option value="진행중">진행중</option>
                                  <option value="완료">완료</option>
                                  <option value="보류">보류</option>
                                </select>

                                <button
                                  onClick={() => setSelectedItemHistory({ taskCode: task.code, item })}
                                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                                  title="변경 이력 보기"
                                >
                                  <History className="h-3.5 w-3.5" />
                                </button>

                                {canEditTasks && !isEditingItem && (
                                  <button
                                    onClick={() => handleStartEditItem(task.code, item)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="항목명/부서 수정"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {canDeleteTasks && !isEditingItem && (
                                  <button
                                    onClick={() => handleDeleteItem(task.code, item)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="항목 삭제"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3-B. DEPARTMENT-CENTRIC VIEW (부서별 추진항목 & 예산 뷰) */}
      {/* ========================================================= */}
      {viewMode === 'departments' && (
        <div className="space-y-6">
          {departmentGroupedData.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              일치하는 부서 데이터가 없습니다.
            </div>
          ) : (
            departmentGroupedData.map((deptGroup) => {
              // 부서가 담당하는 세부과제들의 예산 집계
              let deptBudget = 0;
              let deptExecuted = 0;
              const associatedTasks: Task[] = [];

              deptGroup.taskCodes.forEach((tCode) => {
                const t = tasks[tCode];
                if (t) {
                  associatedTasks.push(t);
                  const s = getTaskBudgetSummary(t, executions);
                  deptBudget += s.total_budget;
                  deptExecuted += s.total_executed;
                }
              });

              const deptRemaining = deptBudget - deptExecuted;
              const deptRate = deptBudget > 0 ? (deptExecuted / deptBudget) * 100 : 0;

              return (
                <div
                  key={deptGroup.department}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4"
                >
                  {/* Department Card Header */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs font-bold">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900">
                            {deptGroup.department}
                          </h3>
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                            추진항목 {deptGroup.items.length}개 / 연계 과제 {associatedTasks.length}개
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          연계 세부과제:{' '}
                          {associatedTasks.map((t) => t.code).join(', ')}
                        </p>
                      </div>
                    </div>

                    {/* Department Financial Overview */}
                    <div className="flex items-center gap-4 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold text-slate-400">
                          연계 과제 총 예산
                        </span>
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          ₩{deptBudget.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold text-emerald-600">
                          누적 집행액
                        </span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">
                          ₩{deptExecuted.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold text-blue-600">
                          잔액 (집행률)
                        </span>
                        <span className="text-xs font-bold text-blue-700 font-mono">
                          ₩{deptRemaining.toLocaleString()}
                          <span className="ml-1 text-[11px] text-indigo-700 font-extrabold">
                            ({deptRate.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Associated Tasks Cards Inside Department */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {associatedTasks.map((task) => {
                      const summary = getTaskBudgetSummary(task, executions);
                      const taskItemsForDept = deptGroup.items.filter(
                        (it) => it.taskCode === task.code
                      );

                      return (
                        <div
                          key={task.code}
                          className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded">
                                {task.code}
                              </span>
                              <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={task.name}>
                                {task.name}
                              </span>
                            </div>

                            {canEditTab('tasks') && (
                              <button
                                onClick={() => handleOpenMatrixModal(task)}
                                className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold inline-flex items-center gap-1"
                              >
                                <SlidersHorizontal className="h-3 w-3" />
                                <span>예산 매트릭스</span>
                              </button>
                            )}
                          </div>

                          {/* Task Mini Budget Metrics */}
                          <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono bg-white p-2 rounded border border-slate-200">
                            <span>예산: ₩{summary.total_budget.toLocaleString()}</span>
                            <span className="text-emerald-700 font-bold">
                              집행: ₩{summary.total_executed.toLocaleString()}
                            </span>
                            <span className="text-blue-700 font-bold">
                              잔액: ₩{summary.total_remaining.toLocaleString()} ({summary.execution_rate.toFixed(1)}%)
                            </span>
                          </div>

                          {/* Items belonging to this department */}
                          <div className="space-y-1.5">
                            {taskItemsForDept.map(({ item }) => (
                              <div
                                key={item.code}
                                className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-500">
                                    [{item.code}]
                                  </span>
                                  <span className="font-semibold text-slate-800">{item.name}</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={item.status}
                                    disabled={!canEditTab('tasks')}
                                    onChange={(e) =>
                                      updateItemStatus(
                                        task.code,
                                        item.code,
                                        e.target.value as ItemStatus,
                                        `부서 뷰에서 상태 변경 (${deptGroup.department})`
                                      )
                                    }
                                    className={`rounded px-2 py-0.5 text-xs font-bold border disabled:opacity-50 disabled:cursor-not-allowed ${getStatusColor(
                                      item.status
                                    )}`}
                                  >
                                    <option value="예정">예정</option>
                                    <option value="진행중">진행중</option>
                                    <option value="완료">완료</option>
                                    <option value="보류">보류</option>
                                  </select>

                                  <button
                                    onClick={() => setSelectedItemHistory({ taskCode: task.code, item })}
                                    className="rounded p-1 text-slate-400 hover:text-slate-600"
                                    title="이력 보기"
                                  >
                                    <History className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3-C. 세부과제 추가 모달 */}
      {/* ========================================================= */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">세부과제 추가</h3>
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitAddTask} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">영역</label>
                <select
                  value={newTaskDomain}
                  onChange={(e) => setNewTaskDomain(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="IA">교육혁신 (IA)</option>
                  <option value="IB">고등직업교육혁신 (IB)</option>
                  <option value="IC">산학혁신 (IC)</option>
                  <option value="ID">지역협력혁신 (ID)</option>
                  <option value="IE">자율혁신 (IE)</option>
                  <option value="IZ">사업관리 (IZ)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  세부과제 코드 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTaskCode}
                  onChange={(e) => setNewTaskCode(e.target.value)}
                  placeholder={`예: ${newTaskDomain}-6-1`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  세부과제명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">세부내용 (선택)</label>
                <input
                  type="text"
                  value={newTaskDetail}
                  onChange={(e) => setNewTaskDetail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                예산은 0원으로 시작합니다. 추가 후 예산관리 화면에서 비목×재원 매트릭스를 편집해주세요.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3-D. 세부과제/항목 삭제 확인 모달 (iframe에서 window.confirm이 안 뜨는 문제를 피하기 위해 커스텀으로 구현) */}
      {deleteTaskTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">세부과제 삭제</h3>
            <p className="text-xs text-slate-500 mt-1">
              <strong>
                [{deleteTaskTarget.code}] {deleteTaskTarget.name}
              </strong>
              을(를) 삭제하시겠습니까?
              {Object.keys(deleteTaskTarget.items || {}).length > 0 && (
                <>
                  {' '}
                  주요추진항목 {Object.keys(deleteTaskTarget.items || {}).length}개가 함께 삭제됩니다.
                </>
              )}{' '}
              (이미 등록된 집행내역/실적은 삭제되지 않고 남아있을 수 있으니 주의하세요)
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setDeleteTaskTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  deleteTask(deleteTaskTarget.code);
                  setDeleteTaskTarget(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteItemTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">주요추진항목 삭제</h3>
            <p className="text-xs text-slate-500 mt-1">
              <strong>
                [{deleteItemTarget.item.code}] {deleteItemTarget.item.name}
              </strong>
              을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setDeleteItemTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  deleteItem(deleteItemTarget.taskCode, deleteItemTarget.item.code);
                  setDeleteItemTarget(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. Matrix Modal (7비목 x 3재원 예산 매트릭스 편집) */}
      {/* ========================================================= */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-extrabold text-white font-mono">
                    {editingTask.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{editingTask.name}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  7개 비목(인건비~간접비) × 3대 재원(이월금, 기본사업비, 적정규모화) 예산 편성
                </p>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[65vh] overflow-y-auto pr-1">
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="border border-slate-200 p-2">비목</th>
                    <th className="border border-slate-200 p-2 text-right">이월금 (₩)</th>
                    <th className="border border-slate-200 p-2 text-right">기본사업비 (₩)</th>
                    <th className="border border-slate-200 p-2 text-right">적정규모화 (₩)</th>
                    <th className="border border-slate-200 p-2 text-right">비목 합계 (₩)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const row = tempMatrix[cat] || {};
                    const rowSum =
                      Number(row.이월금 || 0) +
                      Number(row.기본사업비 || 0) +
                      Number(row.적정규모화 || 0);

                    return (
                      <tr key={cat} className="hover:bg-slate-50">
                        <td className="border border-slate-200 p-2 font-semibold text-slate-800">
                          {cat}
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.이월금 ?? ''}
                            onChange={(e) => handleMatrixCellChange(cat, '이월금', e.target.value)}
                            className="w-full text-right rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.기본사업비 ?? ''}
                            onChange={(e) => handleMatrixCellChange(cat, '기본사업비', e.target.value)}
                            className="w-full text-right rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.적정규모화 ?? ''}
                            onChange={(e) => handleMatrixCellChange(cat, '적정규모화', e.target.value)}
                            className="w-full text-right rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-slate-200 p-2 text-right font-bold text-indigo-900 bg-slate-50/60 font-mono">
                          ₩{rowSum.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveMatrix}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>예산 매트릭스 저장</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4-B. IZ 전용: 주요추진항목별 예산 편집 모달 */}
      {/* ========================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-600 px-2 py-0.5 text-xs font-extrabold text-white font-mono">
                    {editingItem.item.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{editingItem.item.name}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  이 주요추진항목 고유의 예산 편성 (상위 세부과제 [{editingItem.taskCode}] 예산은 저장 시 항목 합계로 자동 갱신됩니다)
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[65vh] overflow-y-auto pr-1">
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="border border-slate-200 p-2">비목</th>
                    <th className="border border-slate-200 p-2 text-right">이월금 (₩)</th>
                    <th className="border border-slate-200 p-2 text-right">기본사업비 (₩)</th>
                    <th className="border border-slate-200 p-2 text-right">적정규모화 (₩)</th>
                    <th className="border border-slate-200 p-2 text-right">비목 합계 (₩)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const row = tempItemMatrix[cat] || {};
                    const rowSum =
                      Number(row.이월금 || 0) +
                      Number(row.기본사업비 || 0) +
                      Number(row.적정규모화 || 0);

                    return (
                      <tr key={cat} className="hover:bg-slate-50">
                        <td className="border border-slate-200 p-2 font-semibold text-slate-800">
                          {cat}
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.이월금 ?? ''}
                            onChange={(e) => handleItemMatrixCellChange(cat, '이월금', e.target.value)}
                            className="w-full text-right rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.기본사업비 ?? ''}
                            onChange={(e) => handleItemMatrixCellChange(cat, '기본사업비', e.target.value)}
                            className="w-full text-right rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.적정규모화 ?? ''}
                            onChange={(e) => handleItemMatrixCellChange(cat, '적정규모화', e.target.value)}
                            className="w-full text-right rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-slate-200 p-2 text-right font-bold text-amber-900 bg-slate-50/60 font-mono">
                          ₩{rowSum.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveItemMatrix}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-xs flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>항목 예산 저장</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4-C. 예산 엑셀 업로드 미리보기 모달 */}
      {/* ========================================================= */}
      {isBudgetImportModalOpen && budgetImportResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">예산 엑셀 업로드 미리보기</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-bold text-indigo-700">
                    {budgetImportResult.updates.length}개 세부과제
                  </span>{' '}
                  예산이 갱신됩니다
                  {budgetImportResult.skipped.length > 0 && (
                    <>
                      {' '}
                      · <span className="font-semibold text-amber-700">IZ 영역 {budgetImportResult.skipped.length}건 제외</span>
                    </>
                  )}
                  {budgetImportResult.rowErrors.length > 0 && (
                    <>
                      {' '}
                      · <span className="font-semibold text-rose-600">오류 {budgetImportResult.rowErrors.length}행 (해당 행 제외)</span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBudgetImportModalOpen(false);
                  setBudgetImportResult(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5">
              {budgetImportResult.updates.map((u) => (
                <div
                  key={u.taskCode}
                  className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs"
                >
                  <span className="font-mono font-bold text-slate-800">{u.taskCode}</span>
                  <span className="text-slate-600 truncate max-w-[240px]">{u.taskName}</span>
                  <span className="font-mono font-bold text-emerald-800">₩{u.total.toLocaleString()}</span>
                </div>
              ))}
              {budgetImportResult.skipped.map((s) => (
                <div
                  key={s.taskCode}
                  className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs text-amber-800"
                >
                  <span className="font-mono font-bold">{s.taskCode}</span> — {s.reason}
                </div>
              ))}
              {budgetImportResult.rowErrors.map((e, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs text-rose-700"
                >
                  {e.rowIndex}행 — {e.message}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsBudgetImportModalOpen(false);
                  setBudgetImportResult(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isBudgetImporting || budgetImportResult.updates.length === 0}
                onClick={handleConfirmBudgetImport}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4" />
                <span>{isBudgetImporting ? '반영 중...' : `${budgetImportResult.updates.length}개 세부과제 일괄반영`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. Status History Modal */}
      {/* ========================================================= */}
      {selectedItemHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedItemHistory.item.code} 진행상황 변경 이력
                </h3>
                <p className="text-xs text-slate-500">{selectedItemHistory.item.name}</p>
              </div>
              <button
                onClick={() => setSelectedItemHistory(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
              {!selectedItemHistory.item.status_history ||
              selectedItemHistory.item.status_history.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">변경 이력이 없습니다.</div>
              ) : (
                selectedItemHistory.item.status_history.map((h, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-xs px-1.5 py-0.5 font-bold border ${getStatusColor(
                          h.status
                        )}`}
                      >
                        {h.status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.changed_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-600">
                      변경자: <strong>{h.changed_by}</strong> {h.note && `(${h.note})`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

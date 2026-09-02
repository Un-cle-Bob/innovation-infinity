import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ItemStatus, Program, Task, TaskItem } from '../types';
import { getDomainCode, getDomainColorTheme } from '../utils/domainColors';
import { getTaskBudgetSummary } from '../services/budgetEngine';
import { AchievementSection } from './AchievementSection';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  Building,
  Calendar,
  User,
  Users,
  Star,
  FileText,
  Link,
  Sparkles,
  DollarSign,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';

type ProgramSortKey =
  | 'name'
  | 'domain'
  | 'task_code'
  | 'item_code'
  | 'department'
  | 'manager'
  | 'schedule'
  | 'doc_number'
  | 'budget'
  | 'execution'
  | 'rate'
  | 'status'
  | 'participants'
  | 'satisfaction';

interface ProgramRowItem {
  program: Program;
  originalIndex: number;
  isGrouped: boolean;
  docNumber: string;
  isGroupFirst: boolean;
  groupSpan: number;
  groupTotalBudget: number;
  groupTotalExecution: number;
  groupExecutionRate: number;
  groupBudgetBreakdown: { round: string; amount: number }[];
}

export const ProgramsView: React.FC = () => {
  const {
    tasks,
    executions,
    programs,
    departments,
    addProgram,
    updateProgram,
    deleteProgram,
    currentUser,
    canEditTab,
    canDeleteTab,
  } = useApp();

  const canEdit = canEditTab('programs');
  const canDelete = canDeleteTab('programs');

  // 실적 관리: 프로그램 실적 / 성과 실적(위원회·규정정비·구성원참여 등) 전환
  const [recordMode, setRecordMode] = useState<'program' | 'achievement'>('program');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('ALL');
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('ALL');
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<string>('ALL');

  // Sorting State
  const [sortKey, setSortKey] = useState<ProgramSortKey>('task_code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // New Program Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [taskCode, setTaskCode] = useState<string>('IA-1-1');
  const [itemCode, setItemCode] = useState<string>('IA-1-1-1');
  const [name, setName] = useState<string>('');
  const [roundLabel, setRoundLabel] = useState<string>('1차');
  const [internalApprovalDocNumber, setInternalApprovalDocNumber] = useState<string>('');
  const [department, setDepartment] = useState<string>('입학취업처');
  const [manager, setManager] = useState<string>('');
  const [scheduleStart, setScheduleStart] = useState<string>('2026-03-01');
  const [scheduleEnd, setScheduleEnd] = useState<string>('2026-06-30');
  const [budget, setBudget] = useState<number | ''>('');
  const [allocatedAmount, setAllocatedAmount] = useState<number | ''>('');
  const [status, setStatus] = useState<ItemStatus>('예정');
  const [resultReportDocNumber, setResultReportDocNumber] = useState<string>('');
  const [participants, setParticipants] = useState<number | ''>('');
  const [participantsUnit, setParticipantsUnit] = useState<string>('명');
  const [satisfactionScore, setSatisfactionScore] = useState<number | ''>('');
  const [etcNote, setEtcNote] = useState<string>('');

  // Inline Editing State
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<Partial<Program>>({});

  // Custom Delete Confirm State (fixes iframe window.confirm issues)
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  // 프로그램 전체수정 모달 (등록폼과 동일한 항목을 전부 수정 가능하게 통합)
  const [budgetEditTarget, setBudgetEditTarget] = useState<Program | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoundLabel, setEditRoundLabel] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editManager, setEditManager] = useState('');
  const [editStatus, setEditStatus] = useState<ItemStatus>('예정');
  const [editParticipants, setEditParticipants] = useState('');
  const [editParticipantsUnit, setEditParticipantsUnit] = useState('명');
  const [editSatisfaction, setEditSatisfaction] = useState('');
  const [editResultDoc, setEditResultDoc] = useState('');
  const [editAllocatedBudget, setEditAllocatedBudget] = useState('');
  const [editPeriodStart, setEditPeriodStart] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');
  const [editDocNumber, setEditDocNumber] = useState('');
  const [editEtcNote, setEditEtcNote] = useState('');

  const taskList = Object.values(tasks) as Task[];
  const currentTask = tasks[taskCode];
  const currentItems = Object.values(currentTask?.items || {}) as TaskItem[];

  /**
   * 세부과제의 예산관리 배정 총액 대비, 이미 등록된 실적 프로그램들의 배정예산 합계 + 새로 반영할 금액이
   * 초과하는지 확인. (excludeProgramId: 수정 중인 프로그램 본인은 합계에서 제외)
   */
  const checkProgramBudgetOverage = (
    forTaskCode: string,
    newAmount: number,
    excludeProgramId?: string
  ): { exceeds: boolean; taskBudget: number; alreadyAllocated: number; exceedAmount: number } => {
    const task = tasks[forTaskCode];
    if (!task) return { exceeds: false, taskBudget: 0, alreadyAllocated: 0, exceedAmount: 0 };
    const taskBudget = getTaskBudgetSummary(task, executions).total_budget;
    const alreadyAllocated = programs
      .filter((p) => p.task_code === forTaskCode && p.id !== excludeProgramId)
      .reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalAfter = alreadyAllocated + newAmount;
    return {
      exceeds: totalAfter > taskBudget,
      taskBudget,
      alreadyAllocated,
      exceedAmount: Math.max(0, totalAfter - taskBudget),
    };
  };

  // 집행내역의 결재문서번호별 총 집행액 맵 (자동 연동)
  const execAmountByDocNumber = useMemo(() => {
    const map = new Map<string, number>();
    executions.forEach((exec) => {
      const doc = exec.internal_approval_doc_number?.trim();
      if (doc) {
        const prev = map.get(doc) || 0;
        map.set(doc, prev + exec.amount);
      }
    });
    return map;
  }, [executions]);

  // 집행내역에 있지만 아직 프로그램에 등록되지 않은 결재번호 목록 (스마트 추천)
  const unlinkedDocNumbers = useMemo(() => {
    const registeredDocs = new Set(
      programs.map((p) => p.internal_approval_doc_number?.trim()).filter(Boolean)
    );
    const unlinked: { docNumber: string; amount: number; sampleExec: any }[] = [];

    execAmountByDocNumber.forEach((totalAmount, docNum) => {
      if (!registeredDocs.has(docNum)) {
        const sampleExec = executions.find((e) => e.internal_approval_doc_number === docNum);
        unlinked.push({ docNumber: docNum, amount: totalAmount, sampleExec });
      }
    });
    return unlinked;
  }, [programs, execAmountByDocNumber, executions]);

  // Available unique domains
  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    programs.forEach((p) => set.add(getDomainCode(p.task_code)));
    return Array.from(set).sort();
  }, [programs]);

  // Available task codes
  const availableTaskCodes = useMemo(() => {
    const set = new Set<string>();
    programs.forEach((p) => set.add(p.task_code));
    return Array.from(set).sort();
  }, [programs]);

  // Available managers
  const availableManagers = useMemo(() => {
    const set = new Set<string>();
    programs.forEach((p) => {
      if (p.manager?.trim()) set.add(p.manager.trim());
    });
    return Array.from(set).sort();
  }, [programs]);

  // Filter and Sort Programs, then Group by internal_approval_doc_number
  const tableRows = useMemo(() => {
    // 1. Filtering
    const filtered = programs.filter((prog) => {
      const domainCode = getDomainCode(prog.task_code);

      // Top Filter Bars
      if (selectedDeptFilter !== 'ALL' && prog.department !== selectedDeptFilter) return false;
      if (selectedStatusFilter !== 'ALL' && prog.status !== selectedStatusFilter) return false;
      if (selectedDomainFilter !== 'ALL' && domainCode !== selectedDomainFilter) return false;
      if (selectedManagerFilter !== 'ALL' && prog.manager !== selectedManagerFilter) return false;
      if (selectedTaskFilter !== 'ALL' && prog.task_code !== selectedTaskFilter) return false;

      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const match =
          prog.name.toLowerCase().includes(q) ||
          prog.task_code.toLowerCase().includes(q) ||
          prog.item_code.toLowerCase().includes(q) ||
          domainCode.toLowerCase().includes(q) ||
          (prog.internal_approval_doc_number &&
            prog.internal_approval_doc_number.toLowerCase().includes(q)) ||
          (prog.result_report_doc_number &&
            prog.result_report_doc_number.toLowerCase().includes(q)) ||
          (prog.manager && prog.manager.toLowerCase().includes(q)) ||
          (prog.department && prog.department.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    // 2. Sorting
    filtered.sort((a, b) => {
      const domainA = getDomainCode(a.task_code);
      const domainB = getDomainCode(b.task_code);

      const execA =
        (a.internal_approval_doc_number && execAmountByDocNumber.get(a.internal_approval_doc_number)) ||
        a.execution_amount_allocated ||
        0;
      const execB =
        (b.internal_approval_doc_number && execAmountByDocNumber.get(b.internal_approval_doc_number)) ||
        b.execution_amount_allocated ||
        0;
      const rateA = a.budget > 0 ? (execA / a.budget) * 100 : 0;
      const rateB = b.budget > 0 ? (execB / b.budget) * 100 : 0;

      let valA: any = '';
      let valB: any = '';

      switch (sortKey) {
        case 'domain':
          valA = domainA;
          valB = domainB;
          break;
        case 'name':
          valA = a.name;
          valB = b.name;
          break;
        case 'task_code':
          valA = a.task_code;
          valB = b.task_code;
          break;
        case 'item_code':
          valA = a.item_code;
          valB = b.item_code;
          break;
        case 'department':
          valA = a.department;
          valB = b.department;
          break;
        case 'manager':
          valA = a.manager || '';
          valB = b.manager || '';
          break;
        case 'schedule':
          valA = a.period?.start || '';
          valB = b.period?.start || '';
          break;
        case 'doc_number':
          valA = a.internal_approval_doc_number || '';
          valB = b.internal_approval_doc_number || '';
          break;
        case 'budget':
          valA = a.budget;
          valB = b.budget;
          break;
        case 'execution':
          valA = execA;
          valB = execB;
          break;
        case 'rate':
          valA = rateA;
          valB = rateB;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'participants':
          valA = a.performance?.participants || 0;
          valB = b.performance?.participants || 0;
          break;
        case 'satisfaction':
          valA = a.performance?.satisfaction_score || 0;
          valB = b.performance?.satisfaction_score || 0;
          break;
        default:
          valA = a.task_code;
          valB = b.task_code;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    // 3. Grouping: 문서번호가 동일한 프로그램끼리는 항상 위아래로 연속 나열하도록 인접 묶음 처리
    // Map of docNumber -> Program[]
    const docGroupsMap = new Map<string, Program[]>();
    const unGroupedPrograms: Program[] = [];

    filtered.forEach((prog) => {
      const doc = prog.internal_approval_doc_number?.trim();
      if (doc) {
        if (!docGroupsMap.has(doc)) {
          docGroupsMap.set(doc, []);
        }
        docGroupsMap.get(doc)!.push(prog);
      } else {
        unGroupedPrograms.push(prog);
      }
    });

    // Reconstruct list keeping groups together in the sorted order of their first occurrence
    const visitedDocs = new Set<string>();
    const groupedOrderedList: { prog: Program; doc: string; isGroup: boolean; groupList: Program[] }[] = [];

    filtered.forEach((prog) => {
      const doc = prog.internal_approval_doc_number?.trim();
      if (doc && docGroupsMap.has(doc)) {
        if (!visitedDocs.has(doc)) {
          visitedDocs.add(doc);
          const members = docGroupsMap.get(doc)!;
          const isRealGroup = members.length > 1;
          members.forEach((m) => {
            groupedOrderedList.push({
              prog: m,
              doc,
              isGroup: isRealGroup,
              groupList: members,
            });
          });
        }
      } else {
        groupedOrderedList.push({
          prog,
          doc: '',
          isGroup: false,
          groupList: [prog],
        });
      }
    });

    // 4. Build Table Rows with rowSpan metadata
    const rows: ProgramRowItem[] = [];
    let currentDocRun: string | null = null;

    groupedOrderedList.forEach((item, idx) => {
      const { prog, doc, isGroup, groupList } = item;
      const isFirst = !isGroup || doc !== currentDocRun;

      if (isGroup && isFirst) {
        currentDocRun = doc;
      } else if (!isGroup) {
        currentDocRun = null;
      }

      // Group totals
      const groupTotalBudget = groupList.reduce((sum, p) => sum + (p.budget || 0), 0);
      const groupTotalExecution =
        doc && execAmountByDocNumber.has(doc)
          ? execAmountByDocNumber.get(doc)!
          : groupList.reduce((sum, p) => sum + (p.execution_amount_allocated || 0), 0);
      const groupExecutionRate =
        groupTotalBudget > 0 ? (groupTotalExecution / groupTotalBudget) * 100 : 0;

      const groupBudgetBreakdown = groupList.map((p) => ({
        round: p.round_label || (p.name.includes('1차') ? '1차' : p.name.includes('2차') ? '2차' : '개별'),
        amount: p.budget || 0,
      }));

      rows.push({
        program: prog,
        originalIndex: idx + 1,
        isGrouped: isGroup,
        docNumber: doc,
        isGroupFirst: isFirst,
        groupSpan: isGroup ? groupList.length : 1,
        groupTotalBudget,
        groupTotalExecution,
        groupExecutionRate,
        groupBudgetBreakdown,
      });
    });

    return rows;
  }, [
    programs,
    selectedDeptFilter,
    selectedStatusFilter,
    selectedDomainFilter,
    selectedManagerFilter,
    selectedTaskFilter,
    searchQuery,
    sortKey,
    sortDirection,
    execAmountByDocNumber,
  ]);

  const handleSort = (key: ProgramSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(
        key === 'budget' || key === 'execution' || key === 'rate' || key === 'satisfaction'
          ? 'desc'
          : 'asc'
      );
    }
  };

  const handleOpenAddModal = (initialDocNumber?: string, sampleExec?: any) => {
    if (sampleExec) {
      setTaskCode(sampleExec.task_code);
      setItemCode(sampleExec.item_code);
      setName(sampleExec.content || '');
      setDepartment(sampleExec.department || '입학취업처');
      setInternalApprovalDocNumber(sampleExec.internal_approval_doc_number || '');
      const totalAmt = execAmountByDocNumber.get(sampleExec.internal_approval_doc_number) || 0;
      setBudget(totalAmt);
      setAllocatedAmount(totalAmt);
    } else {
      const firstTask = taskList[0];
      if (firstTask) {
        setTaskCode(firstTask.code);
        const firstItem = (Object.values(firstTask.items || {}) as TaskItem[])[0];
        if (firstItem) {
          setItemCode(firstItem.code);
          setDepartment(firstItem.department || '입학취업처');
        }
      }
      setName('');
      setInternalApprovalDocNumber(initialDocNumber || '');
      setBudget('');
      setAllocatedAmount('');
    }

    setRoundLabel('1차');
    setManager(currentUser.name || '담당자');
    setScheduleStart('2026-03-01');
    setScheduleEnd('2026-06-30');
    setStatus('진행중');
    setResultReportDocNumber('');
    setParticipants('');
    setParticipantsUnit('명');
    setSatisfactionScore('');
    setEtcNote('');
    setIsAddModalOpen(true);
  };

  const handleTaskChange = (code: string) => {
    setTaskCode(code);
    const targetTask = tasks[code];
    const firstItem = (Object.values(targetTask?.items || {}) as TaskItem[])[0];
    if (firstItem) {
      setItemCode(firstItem.code);
      setDepartment(firstItem.department || department);
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newBudget = Number(budget) || 0;
    const overageCheck = checkProgramBudgetOverage(taskCode, newBudget);
    if (overageCheck.exceeds) {
      alert(
        `배정예산이 세부과제 예산을 초과합니다.\n\n세부과제 총예산: ₩${overageCheck.taskBudget.toLocaleString()}\n` +
          `이미 배정된 다른 프로그램 합계: ₩${overageCheck.alreadyAllocated.toLocaleString()}\n` +
          `초과액: ₩${overageCheck.exceedAmount.toLocaleString()}\n\n금액을 줄여서 다시 시도해주세요.`
      );
      return;
    }

    addProgram({
      task_code: taskCode,
      item_code: itemCode,
      name: name.trim(),
      round_label: roundLabel.trim(),
      internal_approval_doc_number: internalApprovalDocNumber.trim(),
      department,
      manager: manager.trim(),
      period: { start: scheduleStart, end: scheduleEnd },
      budget: Number(budget) || 0,
      execution_amount_allocated: Number(allocatedAmount) || 0,
      result_report_doc_number: resultReportDocNumber.trim(),
      status,
      performance: {
        participants: participants !== '' ? Number(participants) : undefined,
        participants_unit: participants !== '' ? participantsUnit.trim() || '명' : undefined,
        satisfaction_score: satisfactionScore !== '' ? Number(satisfactionScore) : undefined,
        etc_note: etcNote.trim(),
      },
    });

    setIsAddModalOpen(false);
  };

  // Inline Editing
  const startInlineEdit = (prog: Program) => {
    setInlineEditingId(prog.id);
    setInlineDraft({ ...prog });
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineDraft({});
  };

  const saveInlineEdit = (id: string) => {
    if (!inlineDraft) return;
    updateProgram(id, inlineDraft);
    setInlineEditingId(null);
    setInlineDraft({});
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteProgram(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleOpenBudgetEdit = (prog: Program) => {
    setBudgetEditTarget(prog);
    setEditName(prog.name);
    setEditRoundLabel(prog.round_label || '');
    setEditDepartment(prog.department);
    setEditManager(prog.manager);
    setEditStatus(prog.status);
    setEditParticipants(prog.performance?.participants != null ? String(prog.performance.participants) : '');
    setEditParticipantsUnit(prog.performance?.participants_unit || '명');
    setEditSatisfaction(
      prog.performance?.satisfaction_score != null ? String(prog.performance.satisfaction_score) : ''
    );
    setEditResultDoc(prog.result_report_doc_number || '');
    setEditAllocatedBudget(String(prog.execution_amount_allocated ?? prog.budget ?? 0));
    setEditPeriodStart(prog.period?.start || '');
    setEditPeriodEnd(prog.period?.end || '');
    setEditDocNumber(prog.internal_approval_doc_number || '');
    setEditEtcNote(prog.performance?.etc_note || '');
  };

  const handleSaveBudgetEdit = () => {
    if (!budgetEditTarget) return;
    const newBudget = Number(editAllocatedBudget) || 0;
    const check = checkProgramBudgetOverage(budgetEditTarget.task_code, newBudget, budgetEditTarget.id);
    if (check.exceeds) {
      alert(
        `배정예산이 세부과제 예산을 초과합니다.\n\n세부과제 총예산: ₩${check.taskBudget.toLocaleString()}\n` +
          `이미 배정된 다른 프로그램 합계: ₩${check.alreadyAllocated.toLocaleString()}\n` +
          `초과액: ₩${check.exceedAmount.toLocaleString()}\n\n금액을 줄여서 다시 시도해주세요.`
      );
      return;
    }
    updateProgram(budgetEditTarget.id, {
      name: editName.trim() || budgetEditTarget.name,
      round_label: editRoundLabel.trim(),
      department: editDepartment,
      manager: editManager.trim(),
      status: editStatus,
      execution_amount_allocated: Number(editAllocatedBudget) || 0,
      budget: Number(editAllocatedBudget) || 0,
      period: { start: editPeriodStart, end: editPeriodEnd },
      internal_approval_doc_number: editDocNumber.trim(),
      result_report_doc_number: editResultDoc.trim() || undefined,
      performance: {
        ...budgetEditTarget.performance,
        participants: editParticipants.trim() ? Number(editParticipants) : undefined,
        participants_unit: editParticipants.trim() ? editParticipantsUnit.trim() || '명' : undefined,
        satisfaction_score: editSatisfaction.trim() ? Number(editSatisfaction) : undefined,
        etc_note: editEtcNote.trim(),
      },
    });
    setBudgetEditTarget(null);
  };

  const activeFilterCount =
    (selectedDeptFilter !== 'ALL' ? 1 : 0) +
    (selectedStatusFilter !== 'ALL' ? 1 : 0) +
    (selectedDomainFilter !== 'ALL' ? 1 : 0) +
    (selectedManagerFilter !== 'ALL' ? 1 : 0) +
    (selectedTaskFilter !== 'ALL' ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedDeptFilter('ALL');
    setSelectedStatusFilter('ALL');
    setSelectedDomainFilter('ALL');
    setSelectedManagerFilter('ALL');
    setSelectedTaskFilter('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-5">
      {/* 1. Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">성과 관리</h2>
            {recordMode === 'program' && activeFilterCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                필터 {activeFilterCount}개 적용중
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {recordMode === 'program'
              ? '세부프로그램별 영역·과제·추진항목 코드 연계 · 결재문서별 예산/실집행액 통합 묶음 · 참여인원 및 만족도 관리'
              : '위원회 운영 · 규정·지침 정비 · 구성원 참여·의견수렴 · 성과확산 · 업무협약 체결 등 프로그램 외 실적 관리'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 프로그램 실적 / 성과 실적 전환 */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setRecordMode('program')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                recordMode === 'program' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              프로그램 실적 관리
            </button>
            <button
              onClick={() => setRecordMode('achievement')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                recordMode === 'achievement'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              사업 관리 실적
            </button>
          </div>

          {recordMode === 'program' && activeFilterCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>필터 초기화</span>
            </button>
          )}

          {recordMode === 'program' && canEdit && (
            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>실적 프로그램 신규 등록</span>
            </button>
          )}
        </div>
      </div>

      {recordMode === 'achievement' ? (
        <AchievementSection />
      ) : (
        <>
      {/* 2. Unlinked Executions Notice (Smart Linking) */}
      {canEdit && unlinkedDocNumbers.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-xs font-bold text-indigo-950">
                  집행내역에서 발견된 미연계 결재문서 ({unlinkedDocNumbers.length}건)
                </h3>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  집행내역에 등록된 내부결재문서번호를 클릭하면 실적 프로그램으로 원클릭 등록됩니다.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unlinkedDocNumbers.map((item) => (
              <button
                key={item.docNumber}
                onClick={() => handleOpenAddModal(item.docNumber, item.sampleExec)}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs text-indigo-900 shadow-2xs hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
                title={`${item.sampleExec?.content || ''} (클릭하여 실적 등록)`}
              >
                <Link className="h-3.5 w-3.5 text-indigo-600" />
                <span className="font-mono font-bold">{item.docNumber}</span>
                <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                  {item.sampleExec?.content}
                </span>
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-800">
                  ₩{item.amount.toLocaleString()}
                </span>
                <Plus className="h-3 w-3 text-indigo-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Vertical & Structured Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              상태:
            </span>
            {['ALL', '예정', '진행중', '완료', '보류'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
                  selectedStatusFilter === st
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? `전체 (${programs.length})` : st}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="프로그램명, 결재번호, 과제, 담당자..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-7 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Domain, Department, Manager Vertical Selects */}
        <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 text-xs">
          {/* 영역 필터 */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">영역:</span>
            <select
              value={selectedDomainFilter}
              onChange={(e) => setSelectedDomainFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">전체 영역</option>
              {availableDomains.map((dom) => (
                <option key={dom} value={dom}>
                  {dom} 영역
                </option>
              ))}
            </select>
          </div>

          {/* 세부과제 필터 */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">세부과제:</span>
            <select
              value={selectedTaskFilter}
              onChange={(e) => setSelectedTaskFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">전체 세부과제</option>
              {availableTaskCodes.map((tc) => (
                <option key={tc} value={tc}>
                  {tc} {tasks[tc]?.name ? `- ${tasks[tc].name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 담당부서 필터 */}
          <div className="flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-600">부서:</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">전체 부서</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* 담당자 필터 */}
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-600">담당자:</span>
            <select
              value={selectedManagerFilter}
              onChange={(e) => setSelectedManagerFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">전체 담당자</option>
              {availableManagers.map((mgr) => (
                <option key={mgr} value={mgr}>
                  {mgr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Table with Header Filter & Sorting */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900 text-white font-medium select-none">
                <th className="py-2.5 px-3 w-12 text-center">연번</th>

                {/* 영역 코드 */}
                <th className="py-2.5 px-2.5 w-16 text-center">
                  <span
                    onClick={() => handleSort('domain')}
                    className="cursor-pointer hover:text-indigo-200"
                  >
                    영역
                  </span>
                </th>

                {/* 세부과제 코드 */}
                <th className="py-2.5 px-3 w-28">
                  <div
                    onClick={() => handleSort('task_code')}
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>세부과제</span>
                    {sortKey === 'task_code' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      ))}
                  </div>
                </th>

                {/* 추진항목 코드 */}
                <th className="py-2.5 px-3 w-28">
                  <div
                    onClick={() => handleSort('item_code')}
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>추진항목</span>
                    {sortKey === 'item_code' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      ))}
                  </div>
                </th>

                {/* 세부프로그램명 (정렬 불필요) */}
                <th className="py-2.5 px-3 min-w-[220px]">
                  <span>세부프로그램명 (차수)</span>
                </th>

                {/* 담당부서 */}
                <th className="py-2.5 px-3 w-28">
                  <div
                    onClick={() => handleSort('department')}
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>담당부서</span>
                    {sortKey === 'department' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      ))}
                  </div>
                </th>

                {/* 담당자 */}
                <th className="py-2.5 px-2.5 w-24">
                  <span
                    onClick={() => handleSort('manager')}
                    className="cursor-pointer hover:text-indigo-200"
                  >
                    담당자
                  </span>
                </th>

                {/* 추진일정 (신규 추가) */}
                <th className="py-2.5 px-3 w-28">
                  <div
                    onClick={() => handleSort('schedule')}
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>추진일정</span>
                    {sortKey === 'schedule' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      ))}
                  </div>
                </th>

                {/* 결재문서번호 (그룹핑 기준) */}
                <th className="py-2.5 px-3 w-32">
                  <div
                    onClick={() => handleSort('doc_number')}
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>내부결재문서번호 ★</span>
                  </div>
                </th>

                {/* 배정예산 (그룹 통합 셀) */}
                <th className="py-2.5 px-3 text-right w-32">
                  <div
                    onClick={() => handleSort('budget')}
                    className="flex items-center justify-end gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>배정예산 (₩)</span>
                    {sortKey === 'budget' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      ))}
                  </div>
                </th>

                {/* 실집행액 (그룹 통합 셀) */}
                <th className="py-2.5 px-3 text-right w-28">
                  <div
                    onClick={() => handleSort('execution')}
                    className="flex items-center justify-end gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>실집행액 (₩)</span>
                    {sortKey === 'execution' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      ))}
                  </div>
                </th>

                {/* 집행률 (그룹 통합 셀) */}
                <th className="py-2.5 px-3 text-right w-20">
                  <div
                    onClick={() => handleSort('rate')}
                    className="flex items-center justify-end gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>집행률</span>
                    {sortKey === 'rate' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      ))}
                  </div>
                </th>

                {/* 상태 */}
                <th className="py-2.5 px-3 w-20 text-center">
                  <div
                    onClick={() => handleSort('status')}
                    className="flex items-center justify-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>상태</span>
                  </div>
                </th>

                {/* 참여인원 */}
                <th className="py-2.5 px-3 text-right w-20">
                  <div
                    onClick={() => handleSort('participants')}
                    className="flex items-center justify-end gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>참여인원</span>
                  </div>
                </th>

                {/* 만족도 */}
                <th className="py-2.5 px-3 text-right w-16">
                  <div
                    onClick={() => handleSort('satisfaction')}
                    className="flex items-center justify-end gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>만족도</span>
                  </div>
                </th>

                {/* 결과보고서 */}
                <th className="py-2.5 px-3 w-32">
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <FileText className="h-3 w-3" />
                    결과보고서 ★
                  </span>
                </th>

                {/* 비고 */}
                <th className="py-2.5 px-3 min-w-[160px]">비고</th>

                {/* 관리 */}
                <th className="py-2.5 px-3 w-20 text-center sticky right-0 bg-slate-900">관리</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-slate-400">
                    <Info className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    등록된 실적 프로그램이 없습니다.
                  </td>
                </tr>
              ) : (
                tableRows.map((rowItem) => {
                  const prog = rowItem.program;
                  const isEditing = inlineEditingId === prog.id;
                  const domainCode = getDomainCode(prog.task_code);
                  const domainTheme = getDomainColorTheme(prog.task_code);
                  const task = tasks[prog.task_code];
                  const item = task?.items?.[prog.item_code];

                  return (
                    <tr
                      key={prog.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        rowItem.isGrouped
                          ? 'border-l-4 border-indigo-400 bg-indigo-50/10'
                          : rowItem.originalIndex % 2 === 1
                          ? 'bg-slate-50/30'
                          : 'bg-white'
                      }`}
                    >
                      {/* 연번 */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {rowItem.originalIndex}
                      </td>

                      {/* 영역 코드 (컬러 뱃지) */}
                      <td className="py-2.5 px-2.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${domainTheme.bg} ${domainTheme.text} ${domainTheme.border} border`}
                        >
                          {domainCode}
                        </span>
                      </td>

                      {/* 세부과제 코드 (수정 가능) */}
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <select
                            value={inlineDraft.task_code || prog.task_code}
                            onChange={(e) => {
                              const newTaskCode = e.target.value;
                              const newTask = tasks[newTaskCode];
                              const firstItem = (Object.values(newTask?.items || {}) as TaskItem[])[0];
                              setInlineDraft({
                                ...inlineDraft,
                                task_code: newTaskCode,
                                item_code: firstItem?.code || '',
                              });
                            }}
                            className="w-32 rounded-md border border-indigo-300 px-1.5 py-0.5 text-xs font-mono font-bold"
                          >
                            {taskList.map((t) => (
                              <option key={t.code} value={t.code}>
                                {t.code} - {t.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded cursor-help ${domainTheme.bg} ${domainTheme.text}`}
                            title={`${prog.task_code}: ${task?.name || ''}`}
                          >
                            {prog.task_code}
                          </span>
                        )}
                      </td>

                      {/* 추진항목 코드 (수정 가능) */}
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <select
                            value={inlineDraft.item_code || prog.item_code}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, item_code: e.target.value })}
                            className="w-32 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs font-mono"
                          >
                            {(
                              Object.values(
                                tasks[inlineDraft.task_code || prog.task_code]?.items || {}
                              ) as TaskItem[]
                            ).map((it) => (
                              <option key={it.code} value={it.code}>
                                {it.code} - {it.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`font-mono text-xs font-semibold cursor-help px-1 rounded ${domainTheme.bg} ${domainTheme.text}`}
                            title={`${prog.item_code}: ${item?.name || ''}`}
                          >
                            {prog.item_code}
                          </span>
                        )}
                      </td>

                      {/* 세부프로그램명 (차수 포함, 툴팁 지원) */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-xs truncate">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={inlineDraft.name || ''}
                              onChange={(e) => setInlineDraft({ ...inlineDraft, name: e.target.value })}
                              className="w-full rounded-md border border-slate-300 px-1.5 py-0.5 text-xs font-bold"
                            />
                            <input
                              type="text"
                              placeholder="차수"
                              value={inlineDraft.round_label || ''}
                              onChange={(e) =>
                                setInlineDraft({ ...inlineDraft, round_label: e.target.value })
                              }
                              className="w-14 rounded-md border border-slate-300 px-1 py-0.5 text-xs"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 truncate">
                            {rowItem.isGrouped && (
                              <span className="shrink-0 rounded-xs bg-indigo-100 text-indigo-700 px-1 py-0.2 text-[10px] font-bold">
                                통기안
                              </span>
                            )}
                            <span
                              className="truncate font-bold text-slate-900 cursor-default"
                              title={`${prog.name} ${prog.round_label ? `(${prog.round_label})` : ''}`}
                            >
                              {prog.name}
                            </span>
                            {prog.round_label && (
                              <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                                {prog.round_label}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 담당부서 */}
                      <td className="py-2.5 px-3 text-slate-700 max-w-[110px] truncate" title={prog.department}>
                        {isEditing ? (
                          <select
                            value={inlineDraft.department || ''}
                            onChange={(e) =>
                              setInlineDraft({ ...inlineDraft, department: e.target.value })
                            }
                            className="w-24 rounded-md border border-slate-300 px-1 py-0.5 text-xs"
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.name}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          prog.department
                        )}
                      </td>

                      {/* 담당자 (인라인 수정 가능) */}
                      <td className="py-2.5 px-2.5 text-slate-800">
                        {isEditing ? (
                          <input
                            type="text"
                            value={inlineDraft.manager || ''}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, manager: e.target.value })}
                            className="w-16 rounded-md border border-slate-300 px-1 py-0.5 text-xs font-semibold"
                          />
                        ) : (
                          <span className="font-medium">{prog.manager || '-'}</span>
                        )}
                      </td>

                      {/* 추진일정 */}
                      <td className="py-2.5 px-3 text-[11px] text-slate-600 font-mono">
                        {prog.period?.start ? (
                          <span title={`추진기간: ${prog.period.start} ~ ${prog.period.end || '미정'}`}>
                            {prog.period.start.slice(2, 10)} ~ {prog.period.end ? prog.period.end.slice(5, 10) : ''}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* 내부결재문서번호 (그룹일 경우 rowSpan으로 통합) */}
                      {rowItem.isGroupFirst ? (
                        <td
                          rowSpan={rowItem.groupSpan}
                          className={`py-2.5 px-3 font-mono font-bold text-xs ${
                            rowItem.isGrouped
                              ? 'bg-indigo-50/40 border-r border-indigo-100 text-indigo-800 align-middle'
                              : 'text-indigo-700'
                          }`}
                        >
                          {rowItem.docNumber ? (
                            <div>
                              <span className="rounded-sm bg-indigo-50 px-1.5 py-0.5 border border-indigo-200 block truncate max-w-[130px]" title={rowItem.docNumber}>
                                {rowItem.docNumber}
                              </span>
                              {rowItem.isGrouped && (
                                <span className="text-[10px] font-normal text-indigo-600 mt-0.5 block">
                                  {rowItem.groupSpan}개 프로그램 통기안
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>
                      ) : null}

                      {/* 배정예산 (동일 결재문서번호 그룹일 경우 rowSpan으로 합계 및 차수별 금액 안내) */}
                      {rowItem.isGroupFirst ? (
                        <td
                          rowSpan={rowItem.groupSpan}
                          className={`py-2.5 px-3 text-right font-mono font-bold text-xs ${
                            rowItem.isGrouped
                              ? 'bg-indigo-50/40 border-r border-indigo-100 align-middle text-slate-900'
                              : 'text-slate-900'
                          }`}
                        >
                          <div>₩{rowItem.groupTotalBudget.toLocaleString()}</div>
                          {rowItem.isGrouped && (
                            <div className="text-[10px] font-normal text-slate-500 mt-0.5" title={rowItem.groupBudgetBreakdown.map(b => `${b.round}: ₩${b.amount.toLocaleString()}`).join(' / ')}>
                              {rowItem.groupBudgetBreakdown.map((b) => `${b.round} ${Math.round(b.amount / 10000)}만`).join(' + ')}
                            </div>
                          )}
                        </td>
                      ) : null}

                      {/* 실집행액 (동일 결재문서번호 총 실집행액 한 번만 표시) */}
                      {rowItem.isGroupFirst ? (
                        <td
                          rowSpan={rowItem.groupSpan}
                          className={`py-2.5 px-3 text-right font-mono font-bold text-xs ${
                            rowItem.isGrouped
                              ? 'bg-indigo-50/40 border-r border-indigo-100 align-middle text-emerald-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          <div>₩{rowItem.groupTotalExecution.toLocaleString()}</div>
                          {rowItem.isGrouped && (
                            <div className="text-[10px] font-medium text-emerald-600 mt-0.5">
                              (결재 통합집행)
                            </div>
                          )}
                        </td>
                      ) : null}

                      {/* 집행률 (그룹 통합 집행률) */}
                      {rowItem.isGroupFirst ? (
                        <td
                          rowSpan={rowItem.groupSpan}
                          className={`py-2.5 px-3 text-right font-mono font-bold text-xs ${
                            rowItem.isGrouped
                              ? 'bg-indigo-50/40 border-r border-indigo-100 align-middle'
                              : ''
                          }`}
                        >
                          <span
                            className={
                              rowItem.groupExecutionRate >= 100
                                ? 'text-indigo-600'
                                : rowItem.groupExecutionRate >= 70
                                ? 'text-emerald-600'
                                : 'text-slate-600'
                            }
                          >
                            {rowItem.groupExecutionRate.toFixed(1)}%
                          </span>
                        </td>
                      ) : null}

                      {/* 상태 (개별 표시) */}
                      <td className="py-2.5 px-3 text-center">
                        {isEditing ? (
                          <select
                            value={inlineDraft.status || '진행중'}
                            onChange={(e) =>
                              setInlineDraft({ ...inlineDraft, status: e.target.value as ItemStatus })
                            }
                            className="rounded-md border border-slate-300 px-1 py-0.5 text-xs"
                          >
                            <option value="예정">예정</option>
                            <option value="진행중">진행중</option>
                            <option value="완료">완료</option>
                            <option value="보류">보류</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              prog.status === '완료'
                                ? 'bg-emerald-100 text-emerald-800'
                                : prog.status === '진행중'
                                ? 'bg-blue-100 text-blue-800'
                                : prog.status === '예정'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {prog.status}
                          </span>
                        )}
                      </td>

                      {/* 참여인원 (개별 표시) */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs">
                        {isEditing ? (
                          <input
                            type="number"
                            value={inlineDraft.performance?.participants || ''}
                            onChange={(e) =>
                              setInlineDraft({
                                ...inlineDraft,
                                performance: {
                                  ...inlineDraft.performance,
                                  participants: e.target.value ? Number(e.target.value) : undefined,
                                },
                              })
                            }
                            className="w-14 rounded-md border border-slate-300 px-1 py-0.5 text-right text-xs"
                          />
                        ) : (
                          <span>
                            {prog.performance?.participants != null
                              ? `${prog.performance.participants.toLocaleString()}${prog.performance.participants_unit || '명'}`
                              : '-'}
                          </span>
                        )}
                      </td>

                      {/* 만족도 (개별 표시) */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={inlineDraft.performance?.satisfaction_score || ''}
                            onChange={(e) =>
                              setInlineDraft({
                                ...inlineDraft,
                                performance: {
                                  ...inlineDraft.performance,
                                  satisfaction_score: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                },
                              })
                            }
                            className="w-12 rounded-md border border-slate-300 px-1 py-0.5 text-right text-xs"
                          />
                        ) : prog.performance?.satisfaction_score ? (
                          <span className="font-bold text-amber-600">
                            {prog.performance.satisfaction_score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* 결과보고서번호 (강조 표시) */}
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={inlineDraft.result_report_doc_number || ''}
                            onChange={(e) =>
                              setInlineDraft({
                                ...inlineDraft,
                                result_report_doc_number: e.target.value,
                              })
                            }
                            placeholder="문서번호 입력"
                            className="w-28 rounded-md border border-amber-300 px-1.5 py-0.5 text-xs font-mono font-bold"
                          />
                        ) : prog.result_report_doc_number ? (
                          <span
                            title={prog.result_report_doc_number}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-800 max-w-[130px] truncate"
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            {prog.result_report_doc_number}
                          </span>
                        ) : prog.status === '완료' ? (
                          <span
                            title="완료된 프로그램인데 결과보고서 문서번호가 없습니다"
                            className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700"
                          >
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            미제출
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* 비고 (인라인 수정 시 직접 입력 가능) */}
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={inlineDraft.performance?.etc_note ?? prog.performance?.etc_note ?? ''}
                            onChange={(e) =>
                              setInlineDraft({
                                ...inlineDraft,
                                performance: { ...prog.performance, ...inlineDraft.performance, etc_note: e.target.value },
                              })
                            }
                            placeholder="비고 입력"
                            className="w-full min-w-[140px] rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
                          />
                        ) : (
                          <span className="text-slate-600 text-[11px] truncate block max-w-[180px]" title={prog.performance?.etc_note}>
                            {prog.performance?.etc_note || <span className="text-slate-300">-</span>}
                          </span>
                        )}
                      </td>

                      {/* 관리 (인라인 수정 / 삭제) */}
                      <td className="py-2.5 px-3 text-center sticky right-0 bg-white shadow-xs border-l border-slate-100">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveInlineEdit(prog.id)}
                              className="rounded-md bg-emerald-600 p-1 text-white hover:bg-emerald-700"
                              title="저장"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              className="rounded-md bg-slate-200 p-1 text-slate-600 hover:bg-slate-300"
                              title="취소"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            {canEdit && (
                              <button
                                onClick={() => startInlineEdit(prog)}
                                className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition-colors"
                                title="인라인 수정"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleOpenBudgetEdit(prog)}
                                className="text-slate-400 hover:text-emerald-600 p-1 rounded hover:bg-emerald-50 transition-colors"
                                title="프로그램 전체 수정 (명칭·예산·일정·문서번호·실적 등)"
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteTarget(prog)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                title="프로그램 삭제"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {!canEdit && !canDelete && (
                              <span className="text-[10px] text-slate-300">조회전용</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Custom Delete Confirmation Modal (Avoid iframe window.confirm issues) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="rounded-full bg-rose-100 p-2">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">실적 프로그램 삭제 확인</h3>
                <p className="text-xs text-slate-500 mt-0.5">이 작업은 복구할 수 없습니다.</p>
              </div>
            </div>

            <div className="my-4 rounded-lg bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200">
              <div>
                <span className="text-slate-500">프로그램명:</span>{' '}
                <strong className="text-slate-800">{deleteTarget.name}</strong>
              </div>
              <div>
                <span className="text-slate-500">과제/항목:</span>{' '}
                <span className="font-mono text-slate-700">
                  {deleteTarget.task_code} · {deleteTarget.item_code}
                </span>
              </div>
              {deleteTarget.internal_approval_doc_number && (
                <div>
                  <span className="text-slate-500">내부결재문서번호:</span>{' '}
                  <span className="font-mono font-bold text-indigo-700">
                    {deleteTarget.internal_approval_doc_number}
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-500">배정예산:</span>{' '}
                <span className="font-mono font-bold text-slate-900">
                  ₩{(deleteTarget.budget || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5-B. 배정예산 / 추진일정 / 내부결재문서번호 편집 모달 */}
      {budgetEditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">실적 프로그램 전체 수정</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">
                  {budgetEditTarget.task_code} · {budgetEditTarget.item_code}
                </p>
              </div>
              <button
                onClick={() => setBudgetEditTarget(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">프로그램명</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">차수</label>
                  <input
                    type="text"
                    value={editRoundLabel}
                    onChange={(e) => setEditRoundLabel(e.target.value)}
                    placeholder="예: 1차"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">담당부서</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">담당자</label>
                  <input
                    type="text"
                    value={editManager}
                    onChange={(e) => setEditManager(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">배정예산 (₩)</label>
                <input
                  type="number"
                  value={editAllocatedBudget}
                  onChange={(e) => setEditAllocatedBudget(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">추진일정 시작</label>
                  <input
                    type="date"
                    value={editPeriodStart}
                    onChange={(e) => setEditPeriodStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">추진일정 종료</label>
                  <input
                    type="date"
                    value={editPeriodEnd}
                    onChange={(e) => setEditPeriodEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  내부결재문서번호 (집행연계) ★
                </label>
                <input
                  type="text"
                  value={editDocNumber}
                  onChange={(e) => setEditDocNumber(e.target.value)}
                  placeholder="예: 혁신-2026-0001"
                  className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  집행내역의 내부결재문서번호와 정확히 일치해야 실적-집행 연동이 이루어집니다. 이미 다른 곳에서
                  참조 중인 문서번호를 바꾸면 기존 연동이 끊어질 수 있으니 주의하세요.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">결과보고서 문서번호</label>
                <input
                  type="text"
                  value={editResultDoc}
                  onChange={(e) => setEditResultDoc(e.target.value)}
                  placeholder="예: 혁신-2026-0001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">상태</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ItemStatus)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="예정">예정</option>
                    <option value="진행중">진행중</option>
                    <option value="완료">완료</option>
                    <option value="보류">보류</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">실적값</label>
                  <input
                    type="number"
                    value={editParticipants}
                    onChange={(e) => setEditParticipants(e.target.value)}
                    placeholder="예: 45"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">단위</label>
                  <input
                    type="text"
                    list="program-unit-suggestions"
                    value={editParticipantsUnit}
                    onChange={(e) => setEditParticipantsUnit(e.target.value)}
                    placeholder="명/회/건"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <datalist id="program-unit-suggestions">
                    <option value="명" />
                    <option value="회" />
                    <option value="건" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">만족도</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editSatisfaction}
                    onChange={(e) => setEditSatisfaction(e.target.value)}
                    placeholder="해당 시만"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">비고 및 성과 메모</label>
                <textarea
                  value={editEtcNote}
                  onChange={(e) => setEditEtcNote(e.target.value)}
                  rows={2}
                  placeholder="특이사항이나 참고 메모를 남겨주세요"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBudgetEditTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveBudgetEdit}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. New Program Registration Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">실적 프로그램 신규 등록</h3>
                <p className="text-xs text-slate-500">
                  세부과제 및 추진항목에 연계하여 실적 프로그램을 등록합니다.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="mt-4 space-y-4">
              {/* Row 1: Task Code & Item Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    세부과제 코드 선택 *
                  </label>
                  <select
                    value={taskCode}
                    onChange={(e) => handleTaskChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    {taskList.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.code} — {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    추진항목 코드 선택 *
                  </label>
                  <select
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    {currentItems.map((it) => (
                      <option key={it.code} value={it.code}>
                        {it.code} — {it.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Program Name & Round */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    세부프로그램명 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 자율전공 진로탐색 특강"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">차수 / 구분</label>
                  <input
                    type="text"
                    placeholder="1차, 2차, 연간 등"
                    value={roundLabel}
                    onChange={(e) => setRoundLabel(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 3: Internal Approval Doc Number & Department & Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    내부결재문서번호 (집행연계) ★
                  </label>
                  <input
                    type="text"
                    placeholder="예: 혁신-2026-0001"
                    value={internalApprovalDocNumber}
                    onChange={(e) => setInternalApprovalDocNumber(e.target.value)}
                    className="w-full rounded-lg border border-indigo-300 px-3 py-2 text-xs font-mono font-bold text-indigo-900 bg-indigo-50/40 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">담당부서 *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">담당자 성명</label>
                  <input
                    type="text"
                    placeholder="예: 홍길동"
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 4: 추진일정 (시작일 ~ 종료일) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">추진 시작일</label>
                  <input
                    type="date"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">추진 종료일</label>
                  <input
                    type="date"
                    value={scheduleEnd}
                    onChange={(e) => setScheduleEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 5: Budget & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">배정 예산 (₩)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">진행 상태</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ItemStatus)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="예정">예정</option>
                    <option value="진행중">진행중</option>
                    <option value="완료">완료</option>
                    <option value="보류">보류</option>
                  </select>
                </div>
              </div>

              {/* Row 6: 정량 성과 (실적값+단위, 만족도, 결과보고서번호) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">실적값</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">단위</label>
                  <input
                    type="text"
                    list="program-add-unit-suggestions"
                    placeholder="명/회/건"
                    value={participantsUnit}
                    onChange={(e) => setParticipantsUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <datalist id="program-add-unit-suggestions">
                    <option value="명" />
                    <option value="회" />
                    <option value="건" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">만족도 (해당 시만)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    placeholder="4.5"
                    value={satisfactionScore}
                    onChange={(e) =>
                      setSatisfactionScore(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-amber-700 mb-1">
                    <FileText className="h-3.5 w-3.5" />
                    결과보고서 문서번호 ★
                  </label>
                  <input
                    type="text"
                    placeholder="예: 혁신-2026-0001"
                    value={resultReportDocNumber}
                    onChange={(e) => setResultReportDocNumber(e.target.value)}
                    className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Row 7: 비고 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">비고 및 성과 메모</label>
                <input
                  type="text"
                  placeholder="특이사항, 참여대상, 성과 요약 등"
                  value={etcNote}
                  onChange={(e) => setEtcNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
                >
                  실적 프로그램 등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

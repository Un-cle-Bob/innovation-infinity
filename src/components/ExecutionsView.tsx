import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Execution, ExpenseCategory, SignalFlag, Task, TaskItem } from '../types';
import { EXPENSE_CATEGORIES, SUB_CATEGORY_OPTIONS } from '../data/constants';
import { calculateFundAllocation } from '../services/budgetEngine';
import { exportExecutionsToExcel } from '../services/excelExport';
import {
  downloadExecutionImportTemplate,
  parseExecutionImportFile,
  ParsedExecutionRow,
} from '../services/executionImport';
import { getDomainCode, getDomainColorTheme, getExecutionManageNoMap } from '../utils/domainColors';
import {
  ReceiptText,
  Plus,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  CreditCard,
  Building,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

type SortKey =
  | 'date'
  | 'manageNo'
  | 'task_code'
  | 'category'
  | 'amount'
  | 'department'
  | 'payment_method'
  | 'flag'
  | 'created_at';

export const ExecutionsView: React.FC = () => {
  const {
    currentYear,
    tasks,
    executions,
    departments,
    corporateCards,
    currentUser,
    addExecution,
    updateExecution,
    deleteExecution,
    canEditTab,
    canDeleteTab,
  } = useApp();

  const canEdit = canEditTab('executions');
  const canDelete = canDeleteTab('executions');

  // 엑셀 업로드(일괄등록) 상태
  const importFileInputRef = React.useRef<HTMLInputElement>(null);
  const [importResults, setImportResults] = useState<ParsedExecutionRow[] | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Search & Global quick filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFlagFilter, setSelectedFlagFilter] = useState<'all' | 'green' | 'orange' | 'red' | 'warning'>(
    'all'
  );
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedDomainFilterExec, setSelectedDomainFilterExec] = useState<string>('ALL');
  const [selectedTaskFilterExec, setSelectedTaskFilterExec] = useState<string>('ALL');
  const [selectedCategoryFilterExec, setSelectedCategoryFilterExec] = useState<string>('ALL');

  // Sorting State
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // New Execution Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTaskCode, setSelectedTaskCode] = useState<string>('IA-1-1');
  const [selectedItemCode, setSelectedItemCode] = useState<string>('IA-1-1-1');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [department, setDepartment] = useState<string>('입학취업처');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('교육연구프로그램개발운영비');
  const [subCategory, setSubCategory] = useState<string>('');
  const [subCategoryCustom, setSubCategoryCustom] = useState<boolean>(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'계좌이체' | '법인카드'>('법인카드');
  const [cardId, setCardId] = useState<string>('card1');
  const [payee, setPayee] = useState<string>('');
  const [internalApprovalDocNumber, setInternalApprovalDocNumber] = useState<string>('');
  const [invoiceDocNumber, setInvoiceDocNumber] = useState<string>('');
  const [voucherApprovalNumber, setVoucherApprovalNumber] = useState<string>('');
  const [flag, setFlag] = useState<SignalFlag>('green');
  const [flagNote, setFlagNote] = useState<string>('');

  // Inline Editing State
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<Partial<Execution>>({});

  // Custom Delete Confirm Dialog State (Fixes iframe confirm() issues)
  const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null);

  const taskList = Object.values(tasks) as Task[];
  const currentTask = tasks[selectedTaskCode];
  const itemsForCurrentTask = Object.values(currentTask?.items || {}) as TaskItem[];

  // 등록순 기준 영역별 관리연번(IA001 등) 맵
  const manageNoMap = useMemo(() => getExecutionManageNoMap(executions), [executions]);

  // 실시간 재원 배분 계산 (등록 모달용)
  const allocationPreview = useMemo(() => {
    if (!currentTask || !amount || amount <= 0) return null;
    return calculateFundAllocation(currentTask, category, Number(amount), executions);
  }, [currentTask, category, amount, executions]);

  // Available unique domains for filtering
  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    executions.forEach((e) => set.add(getDomainCode(e.task_code)));
    return Array.from(set).sort();
  }, [executions]);

  // Available unique task codes for filtering
  const availableTaskCodes = useMemo(() => {
    const set = new Set<string>();
    executions.forEach((e) => set.add(e.task_code));
    return Array.from(set).sort();
  }, [executions]);

  // Filtered and Sorted Executions
  const processedExecutions = useMemo(() => {
    let result = executions.filter((exec) => {
      const domainCode = getDomainCode(exec.task_code);

      // Flag Filter
      if (selectedFlagFilter === 'warning' && exec.flag === 'green') return false;
      if (selectedFlagFilter !== 'all' && selectedFlagFilter !== 'warning' && exec.flag !== selectedFlagFilter)
        return false;

      // Dept Filter
      if (selectedDeptFilter !== 'ALL' && exec.department !== selectedDeptFilter) return false;

      // Top-bar Filters (영역/세부과제/비목)
      if (selectedDomainFilterExec !== 'ALL' && domainCode !== selectedDomainFilterExec) return false;
      if (selectedTaskFilterExec !== 'ALL' && exec.task_code !== selectedTaskFilterExec) return false;
      if (selectedCategoryFilterExec !== 'ALL' && exec.category !== selectedCategoryFilterExec) return false;

      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const manageNo = manageNoMap.get(exec.id)?.toLowerCase() || '';
        const match =
          manageNo.includes(q) ||
          exec.content.toLowerCase().includes(q) ||
          exec.payee.toLowerCase().includes(q) ||
          exec.task_code.toLowerCase().includes(q) ||
          exec.internal_approval_doc_number.toLowerCase().includes(q) ||
          (exec.invoice_doc_number && exec.invoice_doc_number.toLowerCase().includes(q)) ||
          (exec.voucher_approval_number && exec.voucher_approval_number.toLowerCase().includes(q)) ||
          (exec.flag_note && exec.flag_note.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortKey as keyof Execution] || '';
      let valB: any = b[sortKey as keyof Execution] || '';

      if (sortKey === 'manageNo') {
        valA = manageNoMap.get(a.id) || '';
        valB = manageNoMap.get(b.id) || '';
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    return result;
  }, [
    executions,
    selectedFlagFilter,
    selectedDeptFilter,
    selectedDomainFilterExec,
    selectedTaskFilterExec,
    selectedCategoryFilterExec,
    searchQuery,
    sortKey,
    sortDirection,
    manageNoMap,
  ]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'amount' || key === 'date' ? 'desc' : 'asc');
    }
  };

  // 엑셀 업로드(일괄등록) 핸들러
  const handleDownloadTemplate = () => {
    downloadExecutionImportTemplate(tasks, departments, corporateCards, currentYear);
  };

  const handleImportButtonClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const results = await parseExecutionImportFile(file, tasks, departments, corporateCards);
      setImportResults(results);
      setIsImportModalOpen(true);
    } catch (err) {
      alert('엑셀 파일을 읽는 중 오류가 발생했습니다. 양식을 다시 확인해주세요.');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importResults) return;
    const validRows = importResults.filter((r) => r.errors.length === 0 && r.data);
    if (validRows.length === 0) return;

    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;
    for (const row of validRows) {
      if (!row.data) continue;
      const res = addExecution(row.data);
      if (res.success) successCount += 1;
      else failCount += 1;
    }
    setIsImporting(false);
    setIsImportModalOpen(false);
    setImportResults(null);
    alert(
      `일괄등록이 끝났습니다.\n성공: ${successCount}건${failCount > 0 ? `\n실패(예산 초과 등): ${failCount}건` : ''}`
    );
  };

  const handleOpenAddModal = () => {
    const firstTask = taskList[0] || tasks['IA-1-1'];
    if (firstTask) {
      setSelectedTaskCode(firstTask.code);
      const firstItem = (Object.values(firstTask.items || {}) as TaskItem[])[0];
      if (firstItem) {
        setSelectedItemCode(firstItem.code);
        setDepartment(firstItem.department || departments[0]?.name || '입학취업처');
      }
    }
    setDate(new Date().toISOString().slice(0, 10));
    setContent('');
    setCategory('교육연구프로그램개발운영비');
    setSubCategory('');
    setSubCategoryCustom(false);
    setAmount('');
    setPaymentMethod('법인카드');
    setCardId('card1');
    setPayee('');
    setInternalApprovalDocNumber('');
    setInvoiceDocNumber('');
    setVoucherApprovalNumber('');
    setFlag('green');
    setFlagNote('');
    setIsAddModalOpen(true);
  };

  const handleTaskChange = (code: string) => {
    setSelectedTaskCode(code);
    const targetTask = tasks[code];
    const firstItem = (Object.values(targetTask?.items || {}) as TaskItem[])[0];
    if (firstItem) {
      setSelectedItemCode(firstItem.code);
      setDepartment(firstItem.department || department);
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      return;
    }
    if (!content.trim()) {
      return;
    }

    const res = addExecution({
      task_code: selectedTaskCode,
      item_code: selectedItemCode,
      date,
      department,
      content,
      category,
      sub_category: subCategory.trim() || undefined,
      amount: Number(amount),
      payment_method: paymentMethod,
      card_id: paymentMethod === '법인카드' ? cardId : undefined,
      payee,
      internal_approval_doc_number: internalApprovalDocNumber.trim(),
      invoice_doc_number: invoiceDocNumber.trim(),
      voucher_approval_number: voucherApprovalNumber.trim(),
      flag,
      flag_note: flagNote.trim(),
    });

    if (res.success) {
      setIsAddModalOpen(false);
    }
  };

  // Inline Editing Handlers
  const startInlineEdit = (exec: Execution) => {
    setInlineEditingId(exec.id);
    setInlineDraft({ ...exec });
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineDraft({});
  };

  const saveInlineEdit = (id: string) => {
    if (!inlineDraft) return;
    const res = updateExecution(id, inlineDraft);
    if (res.success) {
      setInlineEditingId(null);
      setInlineDraft({});
    }
  };

  const handleFlagQuickToggle = (exec: Execution, nextFlag: SignalFlag) => {
    updateExecution(exec.id, { flag: nextFlag });
  };

  const handleExportExcel = () => {
    exportExecutionsToExcel(processedExecutions, corporateCards, currentYear);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteExecution(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const activeFilterCount =
    (selectedFlagFilter !== 'all' ? 1 : 0) +
    (selectedDeptFilter !== 'ALL' ? 1 : 0) +
    (selectedDomainFilterExec !== 'ALL' ? 1 : 0) +
    (selectedTaskFilterExec !== 'ALL' ? 1 : 0) +
    (selectedCategoryFilterExec !== 'ALL' ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedFlagFilter('all');
    setSelectedDeptFilter('ALL');
    setSelectedDomainFilterExec('ALL');
    setSelectedTaskFilterExec('ALL');
    setSelectedCategoryFilterExec('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-5">
      {/* 1. Top Header & Action Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">집행 관리</h2>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                필터 {activeFilterCount}개 적용중
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            등록순 영역별 관리연번(IA001 등) · 재원 자동소진 · 집행 점검 관리 · 지출부 엑셀 다운로드
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>필터 초기화</span>
            </button>
          )}

          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            title="지출부 서식 컬럼 매핑 엑셀 다운로드"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>지출부 엑셀 다운로드 ({processedExecutions.length}건)</span>
          </button>

          {/* Excel Bulk Import */}
          {canEdit && (
            <>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                title="집행내역 일괄등록용 표준 엑셀 양식 다운로드"
              >
                <Download className="h-4 w-4 text-slate-500" />
                <span>업로드 양식 다운로드</span>
              </button>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportFileSelected}
              />
              <button
                onClick={handleImportButtonClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs"
                title="엑셀 파일을 올려서 집행내역 여러 건을 한 번에 등록"
              >
                <Upload className="h-4 w-4 text-indigo-600" />
                <span>엑셀 업로드</span>
              </button>
            </>
          )}

          {/* New Execution Button */}
          {canEdit && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>집행내역 신규 등록</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Bar: Inspection Status + Department + Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        {/* Inspection Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            점검 상태:
          </span>
          <button
            onClick={() => setSelectedFlagFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
              selectedFlagFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            전체 ({executions.length})
          </button>
          <button
            onClick={() => setSelectedFlagFilter('green')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
              selectedFlagFilter === 'green'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${selectedFlagFilter === 'green' ? 'bg-white' : 'bg-emerald-500'}`} />
            정상 ({executions.filter((e) => e.flag === 'green').length})
          </button>
          <button
            onClick={() => setSelectedFlagFilter('orange')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
              selectedFlagFilter === 'orange'
                ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${selectedFlagFilter === 'orange' ? 'bg-white' : 'bg-amber-500'}`} />
            확인 필요 ({executions.filter((e) => e.flag === 'orange').length})
          </button>
          <button
            onClick={() => setSelectedFlagFilter('red')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
              selectedFlagFilter === 'red'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${selectedFlagFilter === 'red' ? 'bg-white' : 'bg-rose-500'}`} />
            시정 필요 ({executions.filter((e) => e.flag === 'red').length})
          </button>
        </div>

        {/* Right Search & Department dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Select */}
          <div className="flex items-center gap-1.5 text-xs">
            <Building className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">전체 부서</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Text Search */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="적요, 관리연번, 결재번호..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
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

        {/* Second Row: 정렬 + 영역/세부과제/비목 필터 (표테이블 헤더 필터 대체) */}
        <div className="flex flex-wrap items-center gap-3 pt-2.5 mt-2.5 border-t border-slate-100 text-xs w-full">
          {/* 정렬 기준 + 방향 */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">정렬:</span>
            <select
              value={sortKey === 'manageNo' || sortKey === 'date' || sortKey === 'created_at' ? sortKey : 'created_at'}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="created_at">등록일순 (정렬없음, 기본)</option>
              <option value="date">집행일자순</option>
              <option value="manageNo">관리연번순 (IA001~IZ999)</option>
            </select>
            <button
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {sortDirection === 'asc' ? (
                <>
                  <ArrowUp className="h-3 w-3" />
                  오름차순
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3" />
                  내림차순
                </>
              )}
            </button>
          </div>

          {/* 영역 필터 */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">영역:</span>
            <select
              value={selectedDomainFilterExec}
              onChange={(e) => setSelectedDomainFilterExec(e.target.value)}
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
              value={selectedTaskFilterExec}
              onChange={(e) => setSelectedTaskFilterExec(e.target.value)}
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

          {/* 비목 필터 */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">비목:</span>
            <select
              value={selectedCategoryFilterExec}
              onChange={(e) => setSelectedCategoryFilterExec(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">전체 비목</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Spreadsheet-style Horizontal Table with Header Filters & Sorting */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900 text-white font-medium select-none">
                {/* 연번 */}
                <th className="py-2.5 px-3 w-12 text-center">연번</th>

                {/* 집행일자 */}
                <th className="py-2.5 px-3 w-28">
                  <div
                    onClick={() => handleSort('date')}
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>집행일자</span>
                    {sortKey === 'date' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 영역별 관리연번 (IA001 등) */}
                <th className="py-2.5 px-3 w-28">
                  <div
                    onClick={() => handleSort('manageNo')}
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span className="font-bold text-amber-300">관리연번</span>
                    {sortKey === 'manageNo' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 영역 / 세부과제 */}
                <th className="py-2.5 px-3 min-w-[140px]">
                  <div
                    onClick={() => handleSort('task_code')}
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>세부과제</span>
                    {sortKey === 'task_code' && (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      )
                    )}
                  </div>
                </th>

                {/* 주요추진항목 */}
                <th className="py-2.5 px-3 min-w-[150px]">주요추진항목</th>

                {/* 담당부서 */}
                <th className="py-2.5 px-3 w-24">담당부서</th>

                {/* 적요 */}
                <th className="py-2.5 px-3 min-w-[180px]">적요 (사용목적)</th>

                {/* 비목 */}
                <th className="py-2.5 px-3 w-32">
                  <div
                    onClick={() => handleSort('category')}
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>비목</span>
                    {sortKey === 'category' && (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      )
                    )}
                  </div>
                </th>

                {/* 세목 */}
                <th className="py-2.5 px-3 w-32">세목</th>

                {/* 집행액 */}
                <th className="py-2.5 px-3 text-right w-28">
                  <div
                    onClick={() => handleSort('amount')}
                    className="flex items-center justify-end gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>집행액 (₩)</span>
                    {sortKey === 'amount' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 재원 자동배분 */}
                <th className="py-2.5 px-3 w-36">재원 자동배분</th>

                {/* 결제방식/카드 */}
                <th className="py-2.5 px-3 w-28">
                  <div
                    onClick={() => handleSort('payment_method')}
                    className="flex items-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>결제방식</span>
                    {sortKey === 'payment_method' && (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      )
                    )}
                  </div>
                </th>

                {/* 지출처 */}
                <th className="py-2.5 px-3 w-28">지출처</th>

                {/* 내부결재문서번호 */}
                <th className="py-2.5 px-3 w-32">내부결재문서번호 ★</th>

                {/* 지급청구서번호 */}
                <th className="py-2.5 px-3 w-28">지급청구서번호</th>

                {/* 전표승인번호 */}
                <th className="py-2.5 px-3 w-28">전표승인번호</th>

                {/* 점검 */}
                <th className="py-2.5 px-3 w-24 text-center">
                  <div
                    onClick={() => handleSort('flag')}
                    className="flex items-center justify-center gap-1 cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <span>점검</span>
                    {sortKey === 'flag' && (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-indigo-300" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-indigo-300" />
                      )
                    )}
                  </div>
                </th>

                {/* 점검 메모 */}
                <th className="py-2.5 px-3 min-w-[150px]">점검 메모</th>

                {/* 관리 */}
                <th className="py-2.5 px-3 w-20 text-center sticky right-0 bg-slate-900">관리</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {processedExecutions.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400">
                    <Info className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    조건에 해당하는 집행내역이 없습니다.
                  </td>
                </tr>
              ) : (
                processedExecutions.map((exec, idx) => {
                  const isEditing = inlineEditingId === exec.id;
                  const task = tasks[exec.task_code];
                  const item = task?.items[exec.item_code];
                  const domainCode = getDomainCode(exec.task_code);
                  const domainTheme = getDomainColorTheme(exec.task_code);
                  const manageNo = manageNoMap.get(exec.id) || `${domainCode}001`;

                  // 재원별 소진 내역
                  const carryAmount = exec.fund_allocations?.find((f) => f.source === '이월금')?.amount || 0;
                  const basicAmount = exec.fund_allocations?.find((f) => f.source === '기본사업비')?.amount || 0;
                  const adjustAmount = exec.fund_allocations?.find((f) => f.source === '적정규모화')?.amount || 0;

                  return (
                    <tr
                      key={exec.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        exec.flag === 'red'
                          ? 'bg-rose-50/30'
                          : exec.flag === 'orange'
                          ? 'bg-amber-50/20'
                          : idx % 2 === 1
                          ? 'bg-slate-50/30'
                          : 'bg-white'
                      }`}
                    >
                      {/* 연번 */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 집행일자 */}
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                        {isEditing ? (
                          <input
                            type="date"
                            value={inlineDraft.date || exec.date}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, date: e.target.value })}
                            className="w-28 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs font-mono"
                          />
                        ) : (
                          exec.date
                        )}
                      </td>

                      {/* 영역별 관리연번 (IA001 등) */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono font-extrabold shadow-2xs border ${domainTheme.badge}`}
                          title={`등록순 영역 관리연번: ${manageNo}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${domainTheme.dot}`} />
                          {manageNo}
                        </span>
                      </td>

                      {/* 영역 / 세부과제 (수정 가능) */}
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <select
                            value={inlineDraft.task_code || exec.task_code}
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
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold border ${domainTheme.badge}`}>
                              {exec.task_code}
                            </span>
                            <span className="truncate max-w-[130px] font-medium text-slate-800" title={task?.name}>
                              {task?.name || exec.task_code}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 주요추진항목 (수정 가능) */}
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <select
                            value={inlineDraft.item_code || exec.item_code}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, item_code: e.target.value })}
                            className="w-32 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs font-mono"
                          >
                            {(
                              Object.values(
                                tasks[inlineDraft.task_code || exec.task_code]?.items || {}
                              ) as TaskItem[]
                            ).map((it) => (
                              <option key={it.code} value={it.code}>
                                {it.code} - {it.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-slate-500 font-bold text-[11px]">{exec.item_code}</span>
                            <span className="truncate max-w-[130px] text-slate-700" title={item?.name}>
                              {item?.name || '-'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 담당부서 */}
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <select
                            value={inlineDraft.department || exec.department}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, department: e.target.value })}
                            className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.name}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-700">{exec.department || '-'}</span>
                        )}
                      </td>

                      {/* 적요 (사용목적) */}
                      <td className="py-2.5 px-3 font-medium text-slate-900 max-w-xs truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            value={inlineDraft.content || ''}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, content: e.target.value })}
                            className="w-full rounded-md border border-slate-300 px-2 py-0.5 text-xs"
                          />
                        ) : (
                          <span title={exec.content}>{exec.content}</span>
                        )}
                      </td>

                      {/* 비목 */}
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <select
                            value={inlineDraft.category || exec.category}
                            onChange={(e) =>
                              setInlineDraft({ ...inlineDraft, category: e.target.value as ExpenseCategory })
                            }
                            className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
                          >
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {exec.category}
                          </span>
                        )}
                      </td>

                      {/* 세목 */}
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <div className="flex flex-col gap-1 w-32">
                            <select
                              value={
                                SUB_CATEGORY_OPTIONS.includes(inlineDraft.sub_category ?? exec.sub_category ?? '')
                                  ? inlineDraft.sub_category ?? exec.sub_category
                                  : '직접입력'
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineDraft({
                                  ...inlineDraft,
                                  sub_category: val === '직접입력' ? '' : val,
                                });
                              }}
                              className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
                            >
                              {SUB_CATEGORY_OPTIONS.map((sc) => (
                                <option key={sc} value={sc}>
                                  {sc}
                                </option>
                              ))}
                              <option value="직접입력">직접입력</option>
                            </select>
                            {!SUB_CATEGORY_OPTIONS.includes(inlineDraft.sub_category ?? exec.sub_category ?? '') && (
                              <input
                                type="text"
                                placeholder="세목 직접입력"
                                value={inlineDraft.sub_category ?? exec.sub_category ?? ''}
                                onChange={(e) => setInlineDraft({ ...inlineDraft, sub_category: e.target.value })}
                                className="w-full rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600">{exec.sub_category || '-'}</span>
                        )}
                      </td>

                      {/* 집행액 */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {isEditing ? (
                          <input
                            type="number"
                            value={inlineDraft.amount ?? exec.amount}
                            onChange={(e) =>
                              setInlineDraft({ ...inlineDraft, amount: Number(e.target.value) })
                            }
                            className="w-24 text-right rounded-md border border-slate-300 px-1.5 py-0.5 text-xs font-mono font-bold"
                          />
                        ) : (
                          `₩${exec.amount.toLocaleString()}`
                        )}
                      </td>

                      {/* 재원 자동 배분 결과 */}
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <div className="flex flex-col gap-0.5">
                          {carryAmount > 0 && (
                            <span className="text-amber-800">
                              이월: ₩{carryAmount.toLocaleString()}
                            </span>
                          )}
                          {basicAmount > 0 && (
                            <span className="text-indigo-800">
                              기본: ₩{basicAmount.toLocaleString()}
                            </span>
                          )}
                          {adjustAmount > 0 && (
                            <span className="text-purple-800">
                              적정: ₩{adjustAmount.toLocaleString()}
                            </span>
                          )}
                          {carryAmount === 0 && basicAmount === 0 && adjustAmount === 0 && (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* 결제방식/카드 */}
                      <td className="py-2.5 px-3 text-slate-700">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <select
                              value={inlineDraft.payment_method || exec.payment_method}
                              onChange={(e) =>
                                setInlineDraft({
                                  ...inlineDraft,
                                  payment_method: e.target.value as '계좌이체' | '법인카드',
                                  card_id:
                                    e.target.value === '법인카드'
                                      ? inlineDraft.card_id || exec.card_id || corporateCards[0]?.id
                                      : undefined,
                                })
                              }
                              className="rounded-md border border-slate-300 px-1 py-0.5 text-xs"
                            >
                              <option value="법인카드">법인카드</option>
                              <option value="계좌이체">계좌이체</option>
                            </select>
                            {(inlineDraft.payment_method || exec.payment_method) === '법인카드' && (
                              <select
                                value={inlineDraft.card_id || exec.card_id || ''}
                                onChange={(e) => setInlineDraft({ ...inlineDraft, card_id: e.target.value })}
                                className="rounded-md border border-blue-300 px-1 py-0.5 text-xs"
                              >
                                {corporateCards.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}({c.last4})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {exec.payment_method === '법인카드' ? (
                              <span className="inline-flex items-center gap-1 rounded-sm bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                                <CreditCard className="h-3 w-3" />
                                {(() => {
                                  const c = corporateCards.find((c) => c.id === exec.card_id);
                                  return c ? `${c.label}(${c.last4})` : '카드';
                                })()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                계좌이체
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 지출처 */}
                      <td className="py-2.5 px-3 text-slate-800 max-w-[120px] truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            value={inlineDraft.payee || ''}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, payee: e.target.value })}
                            className="w-24 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
                          />
                        ) : (
                          <span title={exec.payee}>{exec.payee || '-'}</span>
                        )}
                      </td>

                      {/* 내부결재문서번호 */}
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={inlineDraft.internal_approval_doc_number || ''}
                            onChange={(e) =>
                              setInlineDraft({
                                ...inlineDraft,
                                internal_approval_doc_number: e.target.value,
                              })
                            }
                            className="w-28 rounded-md border border-indigo-300 px-1.5 py-0.5 text-xs font-mono font-bold"
                          />
                        ) : (
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50/70 px-1.5 py-0.5 rounded-sm border border-indigo-100">
                            {exec.internal_approval_doc_number || '-'}
                          </span>
                        )}
                      </td>

                      {/* 지급청구서번호 */}
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={inlineDraft.invoice_doc_number || ''}
                            onChange={(e) =>
                              setInlineDraft({
                                ...inlineDraft,
                                invoice_doc_number: e.target.value,
                              })
                            }
                            className="w-24 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs font-mono"
                          />
                        ) : (
                          exec.invoice_doc_number || '-'
                        )}
                      </td>

                      {/* 전표승인번호 */}
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={inlineDraft.voucher_approval_number || ''}
                            onChange={(e) =>
                              setInlineDraft({
                                ...inlineDraft,
                                voucher_approval_number: e.target.value,
                              })
                            }
                            className="w-24 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs font-mono"
                          />
                        ) : (
                          exec.voucher_approval_number || '-'
                        )}
                      </td>

                      {/* 점검 (클릭하여 상태 즉시 변경) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleFlagQuickToggle(exec, 'green')}
                            className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                              exec.flag === 'green'
                                ? 'bg-emerald-500 ring-2 ring-emerald-300 ring-offset-1 scale-110 shadow-xs'
                                : 'bg-slate-100 hover:bg-emerald-100'
                            }`}
                            title="정상"
                          >
                            <span className={`h-2 w-2 rounded-full ${exec.flag === 'green' ? 'bg-white' : 'bg-emerald-400'}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFlagQuickToggle(exec, 'orange')}
                            className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                              exec.flag === 'orange'
                                ? 'bg-amber-500 ring-2 ring-amber-300 ring-offset-1 scale-110 shadow-xs'
                                : 'bg-slate-100 hover:bg-amber-100'
                            }`}
                            title="확인 필요"
                          >
                            <span className={`h-2 w-2 rounded-full ${exec.flag === 'orange' ? 'bg-white' : 'bg-amber-400'}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFlagQuickToggle(exec, 'red')}
                            className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                              exec.flag === 'red'
                                ? 'bg-rose-500 ring-2 ring-rose-300 ring-offset-1 scale-110 shadow-xs'
                                : 'bg-slate-100 hover:bg-rose-100'
                            }`}
                            title="시정 필요"
                          >
                            <span className={`h-2 w-2 rounded-full ${exec.flag === 'red' ? 'bg-white' : 'bg-rose-400'}`} />
                          </button>
                        </div>
                      </td>

                      {/* 점검 메모 */}
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="점검 내용, 보완사항..."
                            value={inlineDraft.flag_note || ''}
                            onChange={(e) => setInlineDraft({ ...inlineDraft, flag_note: e.target.value })}
                            className="w-full rounded-md border border-slate-300 px-2 py-0.5 text-xs"
                          />
                        ) : (
                          <span title={exec.flag_note} className="italic text-slate-600">
                            {exec.flag_note || '-'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center sticky right-0 bg-white shadow-xs border-l border-slate-100">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveInlineEdit(exec.id)}
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
                                onClick={() => startInlineEdit(exec)}
                                className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition-colors"
                                title="인라인 수정"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteTarget(exec)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                title="집행내역 삭제"
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

        {/* Footer Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
          <div>
            <span>표시 중: </span>
            <span className="font-bold text-slate-900">{processedExecutions.length}</span>
            <span>건 (총 </span>
            <span className="font-bold text-slate-900">{executions.length}</span>
            <span>건)</span>
          </div>
          <div className="flex items-center gap-4 font-mono font-bold">
            <span className="text-slate-500">집행액 합계:</span>
            <span className="text-indigo-700 text-sm">
              ₩{processedExecutions.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Custom Delete Confirm Dialog (Resolves iframe confirm() failure) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">집행내역 삭제 확인</h3>
                <p className="text-xs text-slate-500">
                  {currentUser.role === 'assistant_admin'
                    ? '보조관리자 권한: 삭제 요청이 생성됩니다.'
                    : '해당 집행내역을 삭제하시겠습니까?'}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-2 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">관리연번:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {manageNoMap.get(deleteTarget.id) || 'IA001'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">집행일자:</span>
                <span className="font-medium text-slate-800">{deleteTarget.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">적요:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">
                  {deleteTarget.content}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">집행금액:</span>
                <span className="font-mono font-extrabold text-rose-600">
                  ₩{deleteTarget.amount.toLocaleString()}
                </span>
              </div>
              {deleteTarget.internal_approval_doc_number && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">결재문서번호:</span>
                  <span className="font-mono text-slate-700">{deleteTarget.internal_approval_doc_number}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
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
                {currentUser.role === 'assistant_admin' ? '삭제 요청 생성' : '삭제 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Bulk Import Preview Modal */}
      {isImportModalOpen && importResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">엑셀 업로드 미리보기</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  전체 {importResults.length}건 중{' '}
                  <span className="font-bold text-emerald-700">
                    등록 가능 {importResults.filter((r) => r.errors.length === 0).length}건
                  </span>
                  {importResults.some((r) => r.errors.length > 0) && (
                    <>
                      {' '}
                      /{' '}
                      <span className="font-bold text-rose-600">
                        오류 {importResults.filter((r) => r.errors.length > 0).length}건 (제외됨)
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportResults(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {importResults.map((row) => (
                <div
                  key={row.rowIndex}
                  className={`rounded-lg border p-2.5 text-xs ${
                    row.errors.length > 0
                      ? 'border-rose-200 bg-rose-50/60'
                      : 'border-emerald-200 bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">{row.rowIndex}행</span>
                    {row.errors.length === 0 && row.data ? (
                      <span className="text-slate-800">
                        {row.data.date} · {row.data.task_code} · {row.data.content} ·{' '}
                        <span className="font-mono font-bold">₩{row.data.amount.toLocaleString()}</span>
                      </span>
                    ) : (
                      <span className="text-rose-700 font-semibold">등록 제외</span>
                    )}
                  </div>
                  {row.errors.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-rose-600">
                      {row.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportResults(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isImporting || importResults.every((r) => r.errors.length > 0)}
                onClick={handleConfirmImport}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4" />
                <span>{isImporting ? '등록 중...' : `등록 가능한 ${importResults.filter((r) => r.errors.length === 0).length}건 일괄등록`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. New Execution Registration Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">집행내역 신규 등록</h3>
                  <p className="text-xs text-slate-500">
                    재원 자동 소진 (이월금 → 기본사업비 → 적정규모화)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-4">
              {/* Row 1: Task and Item selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    세부과제 선택 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedTaskCode}
                    onChange={(e) => handleTaskChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    {taskList.map((t) => {
                      const theme = getDomainColorTheme(t.code);
                      return (
                        <option key={t.code} value={t.code}>
                          [{t.code}] {t.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    주요추진항목 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedItemCode}
                    onChange={(e) => {
                      setSelectedItemCode(e.target.value);
                      const targetItem = currentTask?.items[e.target.value];
                      if (targetItem?.department) setDepartment(targetItem.department);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    {itemsForCurrentTask.map((item) => (
                      <option key={item.code} value={item.code}>
                        [{item.code}] {item.name} ({item.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Date, Department, Category, Sub-category */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    집행일자 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    담당부서 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    비목 선택 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">세목</label>
                  <select
                    value={subCategoryCustom ? '직접입력' : subCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '직접입력') {
                        setSubCategoryCustom(true);
                        setSubCategory('');
                      } else {
                        setSubCategoryCustom(false);
                        setSubCategory(val);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">- 선택 안 함 -</option>
                    {SUB_CATEGORY_OPTIONS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                    <option value="직접입력">직접입력</option>
                  </select>
                  {subCategoryCustom && (
                    <input
                      type="text"
                      placeholder="세목을 직접 입력하세요"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </div>

              {/* Row 3: Content (적요) & Amount (집행액) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    적요 (사용목적) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 2026학년도 신입생 오리엔테이션 인쇄물 제작"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    집행 금액 (₩) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 재원 자동 소진 프리뷰 박스 */}
              <div className="rounded-lg bg-indigo-50/70 p-3.5 border border-indigo-200 text-xs">
                <div className="flex items-center justify-between font-bold text-indigo-950 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    재원 자동 소진 계산 결과:
                  </span>
                  {allocationPreview?.isExceeded && (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      예산 한도 초과 (초과액: ₩{allocationPreview.exceedAmount.toLocaleString()})
                    </span>
                  )}
                </div>
                {allocationPreview && allocationPreview.allocations.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {allocationPreview.allocations.map((alloc) => (
                      <div
                        key={alloc.source}
                        className="flex flex-col bg-white p-2 rounded border border-indigo-100 shadow-2xs"
                      >
                        <span className="text-[10px] text-slate-500 font-semibold">{alloc.source} 소진</span>
                        <span className="text-xs font-mono font-extrabold text-indigo-900 mt-0.5">
                          ₩{alloc.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px]">
                    금액을 입력하면 이월금 → 기본사업비 → 적정규모화 순차 배분액이 자동 산출됩니다.
                  </p>
                )}
              </div>

              {/* Row 4: Payment Method, Card, Payee */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">지출/결제방법</label>
                  <div className="flex items-center gap-2">
                    <label
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold cursor-pointer transition-colors ${
                        paymentMethod === '법인카드'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pm"
                        value="법인카드"
                        checked={paymentMethod === '법인카드'}
                        onChange={() => setPaymentMethod('법인카드')}
                        className="hidden"
                      />
                      <CreditCard className="h-3.5 w-3.5" />
                      법인카드
                    </label>
                    <label
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold cursor-pointer transition-colors ${
                        paymentMethod === '계좌이체'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pm"
                        value="계좌이체"
                        checked={paymentMethod === '계좌이체'}
                        onChange={() => setPaymentMethod('계좌이체')}
                        className="hidden"
                      />
                      계좌이체
                    </label>
                  </div>
                </div>

                {paymentMethod === '법인카드' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">법인카드 선택</label>
                    <select
                      value={cardId}
                      onChange={(e) => setCardId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      {corporateCards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} ({c.last4})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">지출처 (상호/성명)</label>
                    <input
                      type="text"
                      placeholder="예: (주)한국학술정보"
                      value={payee}
                      onChange={(e) => setPayee(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {paymentMethod === '법인카드' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">지출처 (가맹점명)</label>
                    <input
                      type="text"
                      placeholder="예: 모닝글로리 대학본부점"
                      value={payee}
                      onChange={(e) => setPayee(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Row 5: 3종 문서번호 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>3종 연계 문서번호 (ERP/전자결재)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                      1) 내부결재문서번호 ★ (성과연동)
                    </label>
                    <input
                      type="text"
                      placeholder="예: 2026-기획-0142"
                      value={internalApprovalDocNumber}
                      onChange={(e) => setInternalApprovalDocNumber(e.target.value)}
                      className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-mono font-bold text-indigo-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      2) 지급청구서번호
                    </label>
                    <input
                      type="text"
                      placeholder="예: PAY-2026-0311"
                      value={invoiceDocNumber}
                      onChange={(e) => setInvoiceDocNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      3) 전표승인번호 (지출부)
                    </label>
                    <input
                      type="text"
                      placeholder="예: VOUCH-0891"
                      value={voucherApprovalNumber}
                      onChange={(e) => setVoucherApprovalNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Inspection Status & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">점검 상태</label>
                  <div className="flex items-center gap-1.5">
                    <label
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold border cursor-pointer transition-all ${
                        flag === 'green'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="flag"
                        value="green"
                        checked={flag === 'green'}
                        onChange={() => setFlag('green')}
                        className="hidden"
                      />
                      <span className={`h-2 w-2 rounded-full ${flag === 'green' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      정상
                    </label>
                    <label
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold border cursor-pointer transition-all ${
                        flag === 'orange'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="flag"
                        value="orange"
                        checked={flag === 'orange'}
                        onChange={() => setFlag('orange')}
                        className="hidden"
                      />
                      <span className={`h-2 w-2 rounded-full ${flag === 'orange' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                      확인
                    </label>
                    <label
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold border cursor-pointer transition-all ${
                        flag === 'red'
                          ? 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="flag"
                        value="red"
                        checked={flag === 'red'}
                        onChange={() => setFlag('red')}
                        className="hidden"
                      />
                      <span className={`h-2 w-2 rounded-full ${flag === 'red' ? 'bg-rose-500' : 'bg-slate-300'}`} />
                      시정
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">점검 메모 / 비고</label>
                  <input
                    type="text"
                    placeholder="예: 회의록 및 참석자 명부 증빙 첨부 완료"
                    value={flagNote}
                    onChange={(e) => setFlagNote(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
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
                  disabled={allocationPreview?.isExceeded}
                  className={`rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-xs ${
                    allocationPreview?.isExceeded
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  집행내역 등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

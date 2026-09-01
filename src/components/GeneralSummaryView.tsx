import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { EXPENSE_CATEGORIES, FUND_SOURCES } from '../data/constants';
import { ExpenseCategory, FundSource, Task } from '../types';
import { getDomainCode, getDomainColorTheme, getFundColorTheme } from '../utils/domainColors';
import { exportSummaryGridToExcel } from '../services/excelExport';
import {
  Table,
  Filter,
  Calendar,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  CheckCircle2,
  TrendingUp,
  Layers,
  Search,
} from 'lucide-react';

export const GeneralSummaryView: React.FC = () => {
  const { currentYear, tasks, executions, departments } = useApp();

  // Filters
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [periodType, setPeriodType] = useState<string>('ALL'); // ALL, 1H, 2H, Q1, Q2, Q3, Q4, M03~M02, CUSTOM
  const [customStartMonth, setCustomStartMonth] = useState<number>(3); // 3
  const [customEndMonth, setCustomEndMonth] = useState<number>(2); // 2
  const [displayMode, setDisplayMode] = useState<'detailed' | 'compact'>('detailed'); // detailed: 4행(이월,기본,적정,계), compact: 1행(계)
  const [viewGranularity, setViewGranularity] = useState<'detail' | 'domain'>('detail'); // detail: 영역별×세부과제별, domain: 영역별 요약(세부과제 통합)
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 가로 스크롤 동기화 (상단 고정 스크롤바 + 실제 표 스크롤 영역)
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(0);
  const isSyncingScroll = React.useRef(false);

  React.useEffect(() => {
    const el = bottomScrollRef.current;
    if (!el) return;
    const update = () => setTableScrollWidth(el.scrollWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  });

  const handleTopScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    isSyncingScroll.current = false;
  };
  const handleBottomScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (bottomScrollRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
    isSyncingScroll.current = false;
  };

  // 전문대학 회계연도 12개월 (3월 ~ 익년 2월)
  const academicMonths = useMemo(() => {
    return [
      { num: 3, label: '3월', valueStr: `${currentYear}-03`, isNextYear: false },
      { num: 4, label: '4월', valueStr: `${currentYear}-04`, isNextYear: false },
      { num: 5, label: '5월', valueStr: `${currentYear}-05`, isNextYear: false },
      { num: 6, label: '6월', valueStr: `${currentYear}-06`, isNextYear: false },
      { num: 7, label: '7월', valueStr: `${currentYear}-07`, isNextYear: false },
      { num: 8, label: '8월', valueStr: `${currentYear}-08`, isNextYear: false },
      { num: 9, label: '9월', valueStr: `${currentYear}-09`, isNextYear: false },
      { num: 10, label: '10월', valueStr: `${currentYear}-10`, isNextYear: false },
      { num: 11, label: '11월', valueStr: `${currentYear}-11`, isNextYear: false },
      { num: 12, label: '12월', valueStr: `${currentYear}-12`, isNextYear: false },
      { num: 1, label: '1월', valueStr: `${currentYear + 1}-01`, altValueStr: `${currentYear}-01`, isNextYear: true },
      { num: 2, label: '2월', valueStr: `${currentYear + 1}-02`, altValueStr: `${currentYear}-02`, isNextYear: true },
    ];
  }, [currentYear]);

  // 기간 라벨 및 검사 함수
  const { periodLabel, isDateInPeriod } = useMemo(() => {
    if (periodType === 'ALL') {
      return {
        periodLabel: `전체 사업기간 (3월~익년2월)`,
        isDateInPeriod: (_dateStr: string) => true,
      };
    }
    if (periodType === '1H') {
      return {
        periodLabel: `1학기/상반기 (3월~8월)`,
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m >= 3 && m <= 8;
        },
      };
    }
    if (periodType === '2H') {
      return {
        periodLabel: `2학기/하반기 (9월~익년2월)`,
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m >= 9 || m === 1 || m === 2;
        },
      };
    }
    if (periodType === 'Q1') {
      return {
        periodLabel: `1분기 (3월~5월)`,
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m >= 3 && m <= 5;
        },
      };
    }
    if (periodType === 'Q2') {
      return {
        periodLabel: `2분기 (6월~8월)`,
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m >= 6 && m <= 8;
        },
      };
    }
    if (periodType === 'Q3') {
      return {
        periodLabel: `3분기 (9월~11월)`,
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m >= 9 && m <= 11;
        },
      };
    }
    if (periodType === 'Q4') {
      return {
        periodLabel: `4분기 (12월~익년2월)`,
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m === 12 || m === 1 || m === 2;
        },
      };
    }
    if (periodType.startsWith('M')) {
      const monthNum = parseInt(periodType.replace('M', ''), 10);
      return {
        periodLabel: `${monthNum}월`,
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m === monthNum;
        },
      };
    }
    if (periodType === 'CUSTOM') {
      const start = customStartMonth;
      const end = customEndMonth;
      return {
        periodLabel: `${start}월 ~ ${end}월`,
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          // 회계연도 순서: 3,4,5,6,7,8,9,10,11,12,1,2
          const order = (month: number) => (month >= 3 ? month - 2 : month + 10);
          const mOrder = order(m);
          const sOrder = order(start);
          const eOrder = order(end);
          if (sOrder <= eOrder) {
            return mOrder >= sOrder && mOrder <= eOrder;
          } else {
            return mOrder >= sOrder || mOrder <= eOrder;
          }
        },
      };
    }

    return {
      periodLabel: `전체 사업기간`,
      isDateInPeriod: () => true,
    };
  }, [periodType, customStartMonth, customEndMonth]);

  // 기간 내 유효한 집행내역
  const periodExecutions = useMemo(() => {
    return executions.filter((e) => isDateInPeriod(e.date));
  }, [executions, isDateInPeriod]);

  // 과제 목록 필터링
  const taskList = useMemo(() => {
    return (Object.values(tasks) as Task[]).filter((t) => {
      const matchDomain = selectedDomain === 'ALL' || t.code.startsWith(selectedDomain);
      const matchSearch =
        searchQuery.trim() === '' ||
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDomain && matchSearch;
    });
  }, [tasks, selectedDomain, searchQuery]);

  // 영역 목록 및 각 영역별 과제 매핑
  const domainGroups = useMemo(() => {
    const domains = [
      { code: 'IA', name: '교육혁신 (IA)' },
      { code: 'IB', name: '고등직업교육혁신 (IB)' },
      { code: 'IC', name: '산학혁신 (IC)' },
      { code: 'ID', name: '지역협력혁신 (ID)' },
      { code: 'IE', name: '자율혁신 (IE)' },
      { code: 'IZ', name: '사업관리 (IZ)' },
    ];

    return domains
      .map((d) => {
        const dTasks = taskList.filter((t) => t.code.startsWith(d.code));
        return {
          domainCode: d.code,
          domainName: d.name,
          tasks: dTasks,
        };
      })
      .filter((g) => selectedDomain === 'ALL' || g.domainCode === selectedDomain);
  }, [taskList, selectedDomain]);

  /**
   * 단일 과제의 특정 비목 & 재원별 [예산, 집행, 잔액] 계산
   */
  const getTaskCellData = (task: Task, category: ExpenseCategory, source?: FundSource) => {
    const mat = task.budget_matrix?.[category] || (task as any).budget_categories?.[category] || {};
    
    let budget = 0;
    if (source) {
      budget = Number(mat[source] || 0);
    } else {
      budget = Number(mat.이월금 || 0) + Number(mat.기본사업비 || 0) + Number(mat.적정규모화 || 0);
    }

    let executed = 0;
    const taskExecs = periodExecutions.filter(
      (e) => e.task_code === task.code && e.category === category
    );

    taskExecs.forEach((e) => {
      if (source) {
        const alloc = (e.fund_allocations || []).find((a) => a.source === source);
        if (alloc) executed += alloc.amount;
      } else {
        executed += e.amount;
      }
    });

    const remaining = budget - executed;
    const rate = budget > 0 ? (executed / budget) * 100 : 0;

    return { budget, executed, remaining, rate };
  };

  /**
   * 단일 과제의 전체 [총 예산, 총 집행, 총 잔액, 집행률]
   */
  const getTaskTotalData = (task: Task, source?: FundSource) => {
    let totalBudget = 0;
    let totalExecuted = 0;

    EXPENSE_CATEGORIES.forEach((cat) => {
      const cell = getTaskCellData(task, cat, source);
      totalBudget += cell.budget;
      totalExecuted += cell.executed;
    });

    const remaining = totalBudget - totalExecuted;
    const rate = totalBudget > 0 ? (totalExecuted / totalBudget) * 100 : 0;

    return { totalBudget, totalExecuted, remaining, rate };
  };

  /**
   * 영역 요약 보기용: 해당 영역(그룹)에 속한 모든 세부과제를 합친 [예산,실적,잔액,집행률]
   */
  const getDomainCellData = (
    groupTasks: Task[],
    category: ExpenseCategory,
    source?: FundSource
  ) => {
    let budget = 0;
    let executed = 0;
    groupTasks.forEach((t) => {
      const c = getTaskCellData(t, category, source);
      budget += c.budget;
      executed += c.executed;
    });
    const remaining = budget - executed;
    const rate = budget > 0 ? (executed / budget) * 100 : 0;
    return { budget, executed, remaining, rate };
  };

  const getDomainTotalData = (groupTasks: Task[], source?: FundSource) => {
    let totalBudget = 0;
    let totalExecuted = 0;
    groupTasks.forEach((t) => {
      const tot = getTaskTotalData(t, source);
      totalBudget += tot.totalBudget;
      totalExecuted += tot.totalExecuted;
    });
    const remaining = totalBudget - totalExecuted;
    const rate = totalBudget > 0 ? (totalExecuted / totalBudget) * 100 : 0;
    return { totalBudget, totalExecuted, remaining, rate };
  };

  // 전체 그랜드 토탈 (Grand Total) - 재원별로도 별도 계산
  const computeGrandTotal = (source?: FundSource) => {
    const categoryTotals: { [key: string]: { budget: number; executed: number; remaining: number } } = {};
    EXPENSE_CATEGORIES.forEach((cat) => {
      categoryTotals[cat] = { budget: 0, executed: 0, remaining: 0 };
    });

    let overallBudget = 0;
    let overallExecuted = 0;

    taskList.forEach((task) => {
      EXPENSE_CATEGORIES.forEach((cat) => {
        const cell = getTaskCellData(task, cat, source);
        categoryTotals[cat].budget += cell.budget;
        categoryTotals[cat].executed += cell.executed;
        categoryTotals[cat].remaining += cell.remaining;
      });
      const tTot = getTaskTotalData(task, source);
      overallBudget += tTot.totalBudget;
      overallExecuted += tTot.totalExecuted;
    });

    return {
      categoryTotals,
      overallBudget,
      overallExecuted,
      overallRemaining: overallBudget - overallExecuted,
      overallRate: overallBudget > 0 ? (overallExecuted / overallBudget) * 100 : 0,
    };
  };

  const grandTotalsBySource = useMemo(() => {
    const sources: (FundSource | '합계')[] = ['이월금', '기본사업비', '적정규모화', '합계'];
    const result: { [key: string]: ReturnType<typeof computeGrandTotal> } = {};
    sources.forEach((src) => {
      result[src] = computeGrandTotal(src === '합계' ? undefined : src);
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskList, periodExecutions]);

  const grandTotal = grandTotalsBySource['합계'];

  // 엑셀 다운로드 핸들러
  const handleExportExcel = () => {
    const rows: any[] = [];

    taskList.forEach((task) => {
      const domainCode = getDomainCode(task.code);
      const sources: (FundSource | '합계')[] =
        displayMode === 'detailed' ? ['이월금', '기본사업비', '적정규모화', '합계'] : ['합계'];

      sources.forEach((src) => {
        const isTotal = src === '합계';
        const fundSrc = isTotal ? undefined : src;
        const taskTot = getTaskTotalData(task, fundSrc);

        const rowData: any = {
          영역코드: domainCode,
          세부과제코드: task.code,
          재원구분: src,
        };

        EXPENSE_CATEGORIES.forEach((cat) => {
          const cData = getTaskCellData(task, cat, fundSrc);
          rowData[`${cat}_예산`] = cData.budget;
          rowData[`${cat}_실적`] = cData.executed;
          rowData[`${cat}_잔액`] = cData.remaining;
          rowData[`${cat}_집행률`] =
            cData.budget > 0 ? `${((cData.executed / cData.budget) * 100).toFixed(1)}%` : '-';
        });

        rowData['총예산'] = taskTot.totalBudget;
        rowData['총실적'] = taskTot.totalExecuted;
        rowData['총잔액'] = taskTot.remaining;
        rowData['집행률(%)'] = taskTot.rate.toFixed(1) + '%';

        rows.push(rowData);
      });
    });

    exportSummaryGridToExcel(rows, EXPENSE_CATEGORIES, currentYear, periodLabel.replace(/[\s\/\(\)]/g, '_'));
  };

  // 영역별 요약본 엑셀 다운로드 (세부과제 통합, 영역 6개 × 재원 4행)
  const handleExportDomainSummaryExcel = () => {
    const rows: any[] = [];

    domainGroups.forEach((group) => {
      const sources: (FundSource | '합계')[] =
        displayMode === 'detailed' ? ['이월금', '기본사업비', '적정규모화', '합계'] : ['합계'];

      sources.forEach((src) => {
        const isTotal = src === '합계';
        const fundSrc = isTotal ? undefined : src;
        const tot = getDomainTotalData(group.tasks, fundSrc);

        const rowData: any = {
          영역코드: group.domainCode,
          세부과제코드: group.domainName,
          재원구분: src,
        };

        EXPENSE_CATEGORIES.forEach((cat) => {
          const cData = getDomainCellData(group.tasks, cat, fundSrc);
          rowData[`${cat}_예산`] = cData.budget;
          rowData[`${cat}_실적`] = cData.executed;
          rowData[`${cat}_잔액`] = cData.remaining;
          rowData[`${cat}_집행률`] =
            cData.budget > 0 ? `${((cData.executed / cData.budget) * 100).toFixed(1)}%` : '-';
        });

        rowData['총예산'] = tot.totalBudget;
        rowData['총실적'] = tot.totalExecuted;
        rowData['총잔액'] = tot.remaining;
        rowData['집행률(%)'] = tot.rate.toFixed(1) + '%';

        rows.push(rowData);
      });
    });

    exportSummaryGridToExcel(
      rows,
      EXPENSE_CATEGORIES,
      currentYear,
      periodLabel.replace(/[\s\/\(\)]/g, '_'),
      '영역별요약'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls Bar (Print Hidden) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">대학혁신지원사업비 총괄표</h2>
            <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white shadow-2xs">
              영역·세부과제 × 7비목 × 3재원 종합 매트릭스
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            세로: 영역 및 세부과제 / 가로: 7개 비목(인건비~간접비) 및 3대 재원(이월금·기본사업비·적정규모화) 예산·실적·잔액·집행률
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            title="총괄표 엑셀 파일(.xlsx)로 내보내기"
          >
            <Download className="h-4 w-4 text-emerald-700" />
            <span>총괄표 엑셀 다운로드 (세부과제별)</span>
          </button>

          <button
            onClick={handleExportDomainSummaryExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-600 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition-colors shadow-2xs"
            title="세부과제를 합쳐서 영역 단위로만 요약한 엑셀 다운로드"
          >
            <Download className="h-4 w-4 text-teal-700" />
            <span>영역별 요약 다운로드</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-2xs"
            title="인쇄 및 PDF 저장"
          >
            <Printer className="h-4 w-4" />
            <span>총괄표 인쇄 / PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Advanced Multi-Filters Bar (Print Hidden) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3.5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Domain Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">영역 선택:</span>
            <div className="flex flex-wrap gap-1">
              {[
                { code: 'ALL', label: '전체 영역' },
                { code: 'IA', label: '교육(IA)' },
                { code: 'IB', label: '고등직업(IB)' },
                { code: 'IC', label: '산학(IC)' },
                { code: 'ID', label: '지역협력(ID)' },
                { code: 'IE', label: '자율(IE)' },
                { code: 'IZ', label: '사업관리(IZ)' },
              ].map((d) => (
                <button
                  key={d.code}
                  onClick={() => setSelectedDomain(d.code)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    selectedDomain === d.code
                      ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* View Density Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">표시 방식:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => setDisplayMode('detailed')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  displayMode === 'detailed'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3재원 상세 (4행)
              </button>
              <button
                onClick={() => setDisplayMode('compact')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  displayMode === 'compact'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                합계 요약 (1행)
              </button>
            </div>
          </div>

          {/* Aggregation Granularity Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">집계 단위:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => setViewGranularity('detail')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewGranularity === 'detail'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="영역 안에서 세부과제 하나하나를 각각 보여줌"
              >
                영역별 × 세부과제별
              </button>
              <button
                onClick={() => setViewGranularity('domain')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewGranularity === 'domain'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="세부과제를 합쳐서 영역 단위로만 요약해서 보여줌"
              >
                영역별 요약
              </button>
            </div>
          </div>
        </div>

        {/* Period Selector (전문대학 회계연도: 3월 ~ 익년 2월) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700">집행 실적 집계 기간:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setPeriodType('ALL')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                periodType === 'ALL'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              전체 (3월~익년2월)
            </button>
            <button
              onClick={() => setPeriodType('1H')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                periodType === '1H'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              1학기/상반기 (3~8월)
            </button>
            <button
              onClick={() => setPeriodType('2H')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                periodType === '2H'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              2학기/하반기 (9~익년2월)
            </button>

            {/* Quick Month Selector */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[11px] text-slate-400 font-semibold">월별:</span>
              <select
                value={periodType.startsWith('M') ? periodType : ''}
                onChange={(e) => {
                  if (e.target.value) setPeriodType(e.target.value);
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-hidden"
              >
                <option value="">개별 월 선택...</option>
                {academicMonths.map((m) => (
                  <option key={m.num} value={`M${String(m.num).padStart(2, '0')}`}>
                    {m.label} ({m.isNextYear ? `${currentYear + 1}년` : `${currentYear}년`})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Range */}
            <button
              onClick={() => setPeriodType('CUSTOM')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ml-1 ${
                periodType === 'CUSTOM'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              직접 기간 지정
            </button>

            {periodType === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md">
                <select
                  value={customStartMonth}
                  onChange={(e) => setCustomStartMonth(Number(e.target.value))}
                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-bold"
                >
                  {academicMonths.map((m) => (
                    <option key={m.num} value={m.num}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-indigo-900 font-bold">~</span>
                <select
                  value={customEndMonth}
                  onChange={(e) => setCustomEndMonth(Number(e.target.value))}
                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-bold"
                >
                  {academicMonths.map((m) => (
                    <option key={m.num} value={m.num}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="ml-auto relative w-48">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="과제 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 py-1 text-xs text-slate-800 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* 3. Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs min-w-0 text-center">
          <span className="text-[11px] font-semibold text-slate-500">총 편성 예산</span>
          <div
            className="text-base font-extrabold text-slate-900 font-mono mt-0.5 truncate"
            title={`₩${grandTotal.overallBudget.toLocaleString()}`}
          >
            ₩{grandTotal.overallBudget.toLocaleString()}
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1 border-t border-slate-100 pt-1.5">
            {(['이월금', '기본사업비', '적정규모화'] as const).map((src) => {
              const fundColor = getFundColorTheme(src);
              return (
                <div key={src} className="text-center min-w-0">
                  <span className={`inline-block rounded px-1 py-0.5 text-[9px] font-bold ${fundColor.badge}`}>
                    {src}
                  </span>
                  <div
                    className="text-[10px] font-bold text-slate-700 font-mono mt-0.5 truncate"
                    title={`₩${grandTotalsBySource[src].overallBudget.toLocaleString()}`}
                  >
                    ₩{grandTotalsBySource[src].overallBudget.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs min-w-0 text-center">
          <span className="text-[11px] font-semibold text-emerald-700">
            {periodLabel} 실적(집행액)
          </span>
          <div
            className="text-base font-extrabold text-emerald-700 font-mono mt-0.5 truncate"
            title={`₩${grandTotal.overallExecuted.toLocaleString()}`}
          >
            ₩{grandTotal.overallExecuted.toLocaleString()}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs min-w-0 text-center">
          <span className="text-[11px] font-semibold text-blue-700">집행 잔액</span>
          <div
            className="text-base font-extrabold text-blue-700 font-mono mt-0.5 truncate"
            title={`₩${grandTotal.overallRemaining.toLocaleString()}`}
          >
            ₩{grandTotal.overallRemaining.toLocaleString()}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs text-center">
          <span className="text-[11px] font-semibold text-indigo-700">누적 집행률</span>
          <div className="text-base font-black text-indigo-900 mt-0.5">
            {grandTotal.overallRate.toFixed(1)}%
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                grandTotal.overallRate >= 80
                  ? 'bg-emerald-500'
                  : grandTotal.overallRate >= 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, grandTotal.overallRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Main Scrollable Matrix Grid Canvas */}
      <div className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden print:border-none print:shadow-none font-sans">
        {/* Document Printable Title (Visible only in print / top) */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {currentYear}학년도 대학혁신지원사업 사업비 총괄표 ({periodLabel})
            </h3>
            <span className="text-xs text-slate-500">
              기준: 7개 비목(인건비, 장학금 등) 및 3대 재원(이월금, 기본사업비, 적정규모화)
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono text-right">
            단위: 원 (KRW) / 비율: %
          </div>
        </div>

        {/* 상단 고정 보조 스크롤바 (맨 아래까지 안 내려가도 가로 스크롤 가능) */}
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="sticky top-16 z-30 overflow-x-auto overflow-y-hidden bg-slate-100 border-b border-slate-300 app-no-print"
          style={{ height: '14px' }}
        >
          <div style={{ width: tableScrollWidth, height: '1px' }} />
        </div>

        {/* Wide Responsive Scrollable Table */}
        <div
          ref={bottomScrollRef}
          onScroll={handleBottomScroll}
          className="overflow-x-auto app-print-area"
        >
          <table
            className="summary-print-table text-xs text-left border-collapse border border-slate-300 table-fixed print:w-full"
            style={{ width: '2654px' }}
          >
            {/* 컬럼 폭을 고정해서 가로 스크롤 시에도 비목별 간격이 흔들리지 않게 함 */}
            <colgroup>
              <col style={{ width: '46px' }} />
              <col style={{ width: '78px' }} />
              <col style={{ width: '78px' }} />
              {/* 과제별 총계 컬럼 (맨 왼쪽, 인건비 앞으로 이동) */}
              <col style={{ width: '116px' }} />
              <col style={{ width: '116px' }} />
              <col style={{ width: '116px' }} />
              <col style={{ width: '60px' }} />
              {EXPENSE_CATEGORIES.map((cat) => (
                <React.Fragment key={`colgrp_${cat}`}>
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '52px' }} />
                </React.Fragment>
              ))}
            </colgroup>

            {/* Table Header Level 1 & 2 */}
            <thead className="bg-slate-100 text-slate-800 text-center font-bold">
              {/* Header Row 1 */}
              <tr>
                <th
                  rowSpan={2}
                  className="border border-slate-300 p-2 sticky left-0 bg-slate-100 z-20"
                >
                  영역
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 p-2 sticky left-[46px] bg-slate-100 z-20"
                >
                  세부과제
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 p-2 sticky left-[124px] bg-slate-100 z-20"
                >
                  재원구분
                </th>

                {/* 과제별 총계 (맨 왼쪽 고정 영역) */}
                <th
                  colSpan={4}
                  className="border border-slate-300 border-r-2 border-r-slate-400 p-1.5 bg-indigo-100 text-indigo-950 font-extrabold"
                >
                  과제별 총계 (Total)
                </th>

                {/* 7 Expense Categories */}
                {EXPENSE_CATEGORIES.map((cat, ci) => (
                  <th
                    key={cat}
                    colSpan={4}
                    className={`border border-slate-300 border-r-2 border-r-slate-400 p-1.5 text-[11px] truncate ${
                      ci % 2 === 0 ? 'bg-slate-200' : 'bg-slate-200/70'
                    }`}
                    title={cat}
                  >
                    {cat}
                  </th>
                ))}
              </tr>

              {/* Header Row 2 (Sub columns) */}
              <tr className="bg-slate-50 text-[10px] text-slate-600">
                {/* Total Sub columns */}
                <th className="border border-slate-300 p-1 text-right font-bold text-slate-900 bg-indigo-50">
                  총 예산
                </th>
                <th className="border border-slate-300 p-1 text-right font-extrabold text-emerald-800 bg-indigo-50">
                  총 실적
                </th>
                <th className="border border-slate-300 p-1 text-right font-bold text-blue-800 bg-indigo-50">
                  총 잔액
                </th>
                <th className="border border-slate-300 border-r-2 border-r-slate-400 p-1 text-center font-extrabold text-indigo-900 bg-indigo-50">
                  집행률
                </th>

                {EXPENSE_CATEGORIES.map((cat, ci) => (
                  <React.Fragment key={`${cat}_sub`}>
                    <th
                      className={`border border-slate-300 p-1 text-right font-medium ${
                        ci % 2 === 0 ? 'bg-slate-50' : 'bg-slate-100'
                      }`}
                    >
                      예산
                    </th>
                    <th
                      className={`border border-slate-300 p-1 text-right font-bold text-emerald-800 ${
                        ci % 2 === 0 ? 'bg-slate-50' : 'bg-slate-100'
                      }`}
                    >
                      실적
                    </th>
                    <th
                      className={`border border-slate-300 p-1 text-right font-medium text-blue-800 ${
                        ci % 2 === 0 ? 'bg-slate-50' : 'bg-slate-100'
                      }`}
                    >
                      잔액
                    </th>
                    <th
                      className={`border border-slate-300 border-r-2 border-r-slate-400 p-1 text-center font-bold text-indigo-800 ${
                        ci % 2 === 0 ? 'bg-slate-50' : 'bg-slate-100'
                      }`}
                    >
                      집행률
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {/* 1. Grand Total Rows (재원별 + 합계, 맨 상단 총계 하이라이트) */}
              {(['이월금', '기본사업비', '적정규모화', '합계'] as const).map((src, gIdx) => {
                const isTotal = src === '합계';
                const gTot = grandTotalsBySource[src];
                const fundColor = getFundColorTheme(src);
                const rowBg = isTotal ? 'bg-amber-100' : 'bg-amber-50';

                return (
                  <tr key={`grand_${src}`} className={`font-bold text-slate-900 ${isTotal ? 'border-b-2 border-slate-400' : ''}`}>
                    {gIdx === 0 && (
                      <td
                        colSpan={2}
                        rowSpan={4}
                        className="border border-slate-300 p-2 text-center font-extrabold bg-amber-100 sticky left-0 z-20"
                      >
                        【 전 체 총 계 】
                      </td>
                    )}
                    <td
                      className={`border border-slate-300 p-1 text-center sticky left-[124px] z-20 ${rowBg}`}
                    >
                      <span className={`inline-block w-full rounded px-1 py-0.5 text-[10px] font-semibold ${fundColor.badge}`}>
                        {src}
                      </span>
                    </td>
                    <td className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-xs font-extrabold ${rowBg}`}>
                      ₩{gTot.overallBudget.toLocaleString()}
                    </td>
                    <td className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-xs font-black text-emerald-800 ${rowBg}`}>
                      ₩{gTot.overallExecuted.toLocaleString()}
                    </td>
                    <td className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-xs font-bold text-blue-800 ${rowBg}`}>
                      ₩{gTot.overallRemaining.toLocaleString()}
                    </td>
                    <td className={`border border-slate-300 border-r-2 border-r-slate-400 p-1 text-center font-mono overflow-hidden text-ellipsis whitespace-nowrap text-xs font-black text-indigo-900 ${rowBg}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{gTot.overallRate.toFixed(1)}%</span>
                        <div className="h-1 w-9 rounded-full bg-slate-200/70 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              gTot.overallRate >= 80 ? 'bg-emerald-500' : gTot.overallRate >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, gTot.overallRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const catTot = gTot.categoryTotals[cat];
                      const catRate = catTot.budget > 0 ? (catTot.executed / catTot.budget) * 100 : 0;
                      return (
                        <React.Fragment key={`grand_${src}_${cat}`}>
                          <td className="border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px]">
                            ₩{catTot.budget.toLocaleString()}
                          </td>
                          <td className="border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-bold text-emerald-800">
                            ₩{catTot.executed.toLocaleString()}
                          </td>
                          <td className="border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-blue-800">
                            ₩{catTot.remaining.toLocaleString()}
                          </td>
                          <td className="border border-slate-300 border-r-2 border-r-slate-400 p-1 text-center font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-indigo-800">
                            {catTot.budget > 0 ? `${catRate.toFixed(1)}%` : '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}

              {/* 2. Group by Domain (+ 세부과제, viewGranularity==='detail'일 때만) */}
              {domainGroups.map((group) => {
                const domainColor = getDomainColorTheme(group.domainCode);

                return (
                  <React.Fragment key={group.domainCode}>
                    {/* Domain Header / Subtotal Divider (요약보기에서는 이 행이 곧 데이터 행) */}
                    {viewGranularity === 'detail' && (
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <td
                          colSpan={3}
                          className="border border-slate-300 p-2 text-left sticky left-0 z-20 bg-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap font-bold ${domainColor.badge}`}
                            >
                              {group.domainCode}
                            </span>
                            <span className="text-slate-900 font-bold">{group.domainName}</span>
                          </div>
                        </td>
                        {(() => {
                          const tot = getDomainTotalData(group.tasks);
                          return (
                            <>
                              <td className="border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-xs font-bold text-slate-900 bg-slate-200">
                                ₩{tot.totalBudget.toLocaleString()}
                              </td>
                              <td className="border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-xs font-extrabold text-emerald-800 bg-slate-200">
                                ₩{tot.totalExecuted.toLocaleString()}
                              </td>
                              <td className="border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-xs font-bold text-blue-800 bg-slate-200">
                                ₩{tot.remaining.toLocaleString()}
                              </td>
                              <td className="border border-slate-300 border-r-2 border-r-slate-400 p-1 text-center font-mono overflow-hidden text-ellipsis whitespace-nowrap text-xs font-bold text-indigo-900 bg-slate-200">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span>{tot.rate.toFixed(1)}%</span>
                                  <div className="h-1 w-9 rounded-full bg-slate-200/70 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        tot.rate >= 80 ? 'bg-emerald-500' : tot.rate >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${Math.min(100, tot.rate)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </>
                          );
                        })()}
                        {EXPENSE_CATEGORIES.map((cat) => {
                          const c = getDomainCellData(group.tasks, cat);
                          const cRate = c.budget > 0 ? (c.executed / c.budget) * 100 : 0;
                          return (
                            <React.Fragment key={`d_${group.domainCode}_${cat}`}>
                              <td className="border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold text-slate-700">
                                ₩{c.budget.toLocaleString()}
                              </td>
                              <td className="border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-bold text-emerald-800">
                                ₩{c.executed.toLocaleString()}
                              </td>
                              <td className="border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-blue-800">
                                ₩{c.remaining.toLocaleString()}
                              </td>
                              <td className="border border-slate-300 border-r-2 border-r-slate-400 p-1 text-center font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-indigo-800">
                                {c.budget > 0 ? `${cRate.toFixed(1)}%` : '-'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    )}

                    {/* 영역별 요약 모드: 재원별 행으로 펼쳐서 보여줌 (표시방식: 3재원 상세/합계 요약 반영) */}
                    {viewGranularity === 'domain' &&
                      (() => {
                        const domainSources: (FundSource | '합계')[] =
                          displayMode === 'detailed'
                            ? ['이월금', '기본사업비', '적정규모화', '합계']
                            : ['합계'];
                        const domainRowSpanCount = domainSources.length;

                        return domainSources.map((src, sIdx) => {
                        const isTotal = src === '합계';
                        const fundSrc = isTotal ? undefined : src;
                        const fundColor = getFundColorTheme(src);
                        const tot = getDomainTotalData(group.tasks, fundSrc);
                        const rowBg = isTotal ? 'bg-slate-100 font-bold border-b-2 border-slate-300' : 'bg-white hover:bg-indigo-50';

                        return (
                          <tr key={`${group.domainCode}_${src}`} className={rowBg}>
                            {sIdx === 0 && (
                              <>
                                <td
                                  rowSpan={domainRowSpanCount}
                                  className="border border-slate-300 p-1 text-center sticky left-0 z-20 bg-white"
                                >
                                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-mono overflow-hidden text-ellipsis whitespace-nowrap font-bold ${domainColor.badge}`}>
                                    {group.domainCode}
                                  </span>
                                </td>
                                <td
                                  rowSpan={domainRowSpanCount}
                                  className={`border border-slate-300 p-1.5 text-center text-xs font-bold text-slate-900 sticky left-[46px] z-20 ${domainColor.bg}`}
                                >
                                  {group.domainName.replace(/\s*\(.*\)$/, '')}
                                </td>
                              </>
                            )}
                            <td className={`border border-slate-300 p-1 text-center sticky left-[124px] z-20 ${isTotal ? 'bg-slate-100' : 'bg-white'}`}>
                              <span className={`inline-block w-full rounded px-1 py-0.5 text-[10px] font-semibold ${fundColor.badge}`}>
                                {src}
                              </span>
                            </td>
                            <td className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold text-slate-900 ${isTotal ? 'bg-indigo-50' : 'bg-white'}`}>
                              ₩{tot.totalBudget.toLocaleString()}
                            </td>
                            <td className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold text-emerald-800 ${isTotal ? 'bg-indigo-50' : 'bg-white'}`}>
                              ₩{tot.totalExecuted.toLocaleString()}
                            </td>
                            <td className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold text-blue-800 ${isTotal ? 'bg-indigo-50' : 'bg-white'}`}>
                              ₩{tot.remaining.toLocaleString()}
                            </td>
                            <td className={`border border-slate-300 border-r-2 border-r-slate-400 p-1 text-center font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-extrabold text-indigo-900 ${isTotal ? 'bg-indigo-50' : 'bg-white'}`}>
                              <div className="flex flex-col items-center gap-0.5">
                                <span>{tot.rate.toFixed(1)}%</span>
                                <div className="h-1 w-9 rounded-full bg-slate-200/70 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      tot.rate >= 80 ? 'bg-emerald-500' : tot.rate >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, tot.rate)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            {EXPENSE_CATEGORIES.map((cat) => {
                              const c = getDomainCellData(group.tasks, cat, fundSrc);
                              const hasValue = c.budget > 0 || c.executed > 0;
                              const cRate = c.budget > 0 ? (c.executed / c.budget) * 100 : 0;
                              return (
                                <React.Fragment key={`${group.domainCode}_${src}_${cat}`}>
                                  <td className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] ${hasValue ? 'text-slate-800' : 'text-slate-300'}`}>
                                    {c.budget > 0 ? `₩${c.budget.toLocaleString()}` : '-'}
                                  </td>
                                  <td className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] ${c.executed > 0 ? 'font-bold text-emerald-700' : 'text-slate-300'}`}>
                                    {c.executed > 0 ? `₩${c.executed.toLocaleString()}` : '-'}
                                  </td>
                                  <td
                                    className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] ${
                                      c.remaining > 0 ? 'text-blue-700 font-medium' : c.remaining < 0 ? 'text-rose-600 font-bold' : 'text-slate-300'
                                    }`}
                                  >
                                    {c.budget > 0 || c.executed > 0 ? `₩${c.remaining.toLocaleString()}` : '-'}
                                  </td>
                                  <td className={`border border-slate-300 border-r-2 border-r-slate-400 p-1 text-center font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] ${hasValue ? 'text-indigo-700 font-semibold' : 'text-slate-300'}`}>
                                    {c.budget > 0 ? `${cRate.toFixed(1)}%` : '-'}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        );
                      });
                      })()}

                    {/* Task Rows inside domain (viewGranularity==='detail'일 때만) */}
                    {viewGranularity === 'detail' &&
                      group.tasks.map((task) => {
                      const sources: (FundSource | '합계')[] =
                        displayMode === 'detailed'
                          ? ['이월금', '기본사업비', '적정규모화', '합계']
                          : ['합계'];

                      const rowSpanCount = sources.length;

                      return (
                        <React.Fragment key={task.code}>
                          {sources.map((src, sIdx) => {
                            const isTotal = src === '합계';
                            const fundSrc = isTotal ? undefined : src;
                            const taskTot = getTaskTotalData(task, fundSrc);
                            const fundColor = getFundColorTheme(src);

                            const rowBg = isTotal
                              ? 'bg-slate-50 font-bold border-b border-slate-300'
                              : 'bg-white hover:bg-indigo-50';
                            const stickyBg = isTotal ? 'bg-slate-50' : 'bg-white';

                            return (
                              <tr key={`${task.code}_${src}`} className={rowBg}>
                                {/* First row gets rowspan for task headers */}
                                {sIdx === 0 && (
                                  <>
                                    <td
                                      rowSpan={rowSpanCount}
                                      className="border border-slate-300 p-1 text-center sticky left-0 z-20 bg-white"
                                    >
                                      <span
                                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-mono overflow-hidden text-ellipsis whitespace-nowrap font-bold ${domainColor.badge}`}
                                      >
                                        {group.domainCode}
                                      </span>
                                    </td>
                                    <td
                                      rowSpan={rowSpanCount}
                                      className={`border border-slate-300 p-1.5 font-mono overflow-hidden text-ellipsis whitespace-nowrap text-center text-xs font-bold text-slate-900 sticky left-[46px] z-20 ${domainColor.bg}`}
                                      title={task.name}
                                    >
                                      {task.code}
                                    </td>
                                  </>
                                )}

                                {/* Source Cell */}
                                <td
                                  className={`border border-slate-300 p-1 text-center sticky left-[124px] z-20 ${stickyBg}`}
                                >
                                  <span
                                    className={`inline-block w-full rounded px-1 py-0.5 text-[10px] font-semibold ${fundColor.badge}`}
                                  >
                                    {src}
                                  </span>
                                </td>

                                {/* Total Columns (맨 왼쪽으로 이동) */}
                                <td
                                  className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold ${
                                    isTotal ? 'text-slate-900 bg-indigo-50' : 'text-slate-700 bg-white'
                                  }`}
                                >
                                  ₩{taskTot.totalBudget.toLocaleString()}
                                </td>
                                <td
                                  className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold ${
                                    isTotal ? 'text-emerald-800 bg-indigo-50' : 'text-emerald-700 bg-white'
                                  }`}
                                >
                                  ₩{taskTot.totalExecuted.toLocaleString()}
                                </td>
                                <td
                                  className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold ${
                                    isTotal ? 'text-blue-800 bg-indigo-50' : 'text-blue-700 bg-white'
                                  }`}
                                >
                                  ₩{taskTot.remaining.toLocaleString()}
                                </td>
                                <td
                                  className={`border border-slate-300 border-r-2 border-r-slate-400 p-1 text-center font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-extrabold ${
                                    isTotal ? 'text-indigo-900 bg-indigo-50' : 'text-slate-700 bg-white'
                                  }`}
                                >
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span>{taskTot.rate.toFixed(1)}%</span>
                                    <div className="h-1 w-9 rounded-full bg-slate-200/70 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          taskTot.rate >= 80 ? 'bg-emerald-500' : taskTot.rate >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, taskTot.rate)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                {/* 7 Categories Cells */}
                                {EXPENSE_CATEGORIES.map((cat) => {
                                  const cellData = getTaskCellData(task, cat, fundSrc);
                                  const hasValue = cellData.budget > 0 || cellData.executed > 0;
                                  const cellRate =
                                    cellData.budget > 0
                                      ? (cellData.executed / cellData.budget) * 100
                                      : 0;

                                  return (
                                    <React.Fragment key={`${task.code}_${src}_${cat}`}>
                                      <td
                                        className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] ${
                                          hasValue ? 'text-slate-800' : 'text-slate-300'
                                        }`}
                                      >
                                        {cellData.budget > 0
                                          ? `₩${cellData.budget.toLocaleString()}`
                                          : '-'}
                                      </td>
                                      <td
                                        className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] ${
                                          cellData.executed > 0
                                            ? 'font-bold text-emerald-700'
                                            : 'text-slate-300'
                                        }`}
                                      >
                                        {cellData.executed > 0
                                          ? `₩${cellData.executed.toLocaleString()}`
                                          : '-'}
                                      </td>
                                      <td
                                        className={`border border-slate-300 p-1 text-right font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] ${
                                          cellData.remaining > 0
                                            ? 'text-blue-700 font-medium'
                                            : cellData.remaining < 0
                                            ? 'text-rose-600 font-bold'
                                            : 'text-slate-300'
                                        }`}
                                      >
                                        {cellData.budget > 0 || cellData.executed > 0
                                          ? `₩${cellData.remaining.toLocaleString()}`
                                          : '-'}
                                      </td>
                                      <td
                                        className={`border border-slate-300 border-r-2 border-r-slate-400 p-1 text-center font-mono overflow-hidden text-ellipsis whitespace-nowrap text-[10px] ${
                                          hasValue ? 'text-indigo-700 font-semibold' : 'text-slate-300'
                                        }`}
                                      >
                                        {cellData.budget > 0 ? `${cellRate.toFixed(1)}%` : '-'}
                                      </td>
                                    </React.Fragment>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ACHIEVEMENT_CATEGORIES, EXPENSE_CATEGORIES } from '../data/constants';
import { getTaskBudgetSummary } from '../services/budgetEngine';
import { Task, TaskItem } from '../types';
import { getDomainCode, getDomainColorTheme, getExecutionManageNoMap } from '../utils/domainColors';
import {
  Printer,
  Layers,
  Target,
  Filter,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Calendar,
  Building,
  Users,
  Star,
  FileText,
  FileSpreadsheet,
  Eye,
  EyeOff,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { currentYear, tasks, executions, programs, achievements, kpis } = useApp();

  const [reportType, setReportType] = useState<'budget' | 'performance'>('budget');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');

  // 기간 필터 (전문대학 회계연도: 3월 ~ 익년 2월)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [customStartMonth, setCustomStartMonth] = useState<number>(3);
  const [customEndMonth, setCustomEndMonth] = useState<number>(2);

  // 실적 없는 달 생략 토글
  const [hideEmptyMonths, setHideEmptyMonths] = useState<boolean>(false);

  const domainOptions = [
    { code: 'ALL', label: '전체 사업단 영역' },
    { code: 'IA', label: '교육혁신 (IA)' },
    { code: 'IB', label: '고등직업교육혁신 (IB)' },
    { code: 'IC', label: '산학혁신 (IC)' },
    { code: 'ID', label: '지역협력혁신 (ID)' },
    { code: 'IE', label: '자율혁신 (IE)' },
    { code: 'IZ', label: '사업관리 (IZ)' },
  ];

  // 전문대학 회계연도 12개월 (3월 ~ 익년 2월)
  const academicMonths = useMemo(() => {
    return [
      { num: 3, label: '3월', valuePrefix: `${currentYear}-03`, isNextYear: false },
      { num: 4, label: '4월', valuePrefix: `${currentYear}-04`, isNextYear: false },
      { num: 5, label: '5월', valuePrefix: `${currentYear}-05`, isNextYear: false },
      { num: 6, label: '6월', valuePrefix: `${currentYear}-06`, isNextYear: false },
      { num: 7, label: '7월', valuePrefix: `${currentYear}-07`, isNextYear: false },
      { num: 8, label: '8월', valuePrefix: `${currentYear}-08`, isNextYear: false },
      { num: 9, label: '9월', valuePrefix: `${currentYear}-09`, isNextYear: false },
      { num: 10, label: '10월', valuePrefix: `${currentYear}-10`, isNextYear: false },
      { num: 11, label: '11월', valuePrefix: `${currentYear}-11`, isNextYear: false },
      { num: 12, label: '12월', valuePrefix: `${currentYear}-12`, isNextYear: false },
      { num: 1, label: '1월', valuePrefix: `${currentYear + 1}-01`, altPrefix: `${currentYear}-01`, isNextYear: true },
      { num: 2, label: '2월', valuePrefix: `${currentYear + 1}-02`, altPrefix: `${currentYear}-02`, isNextYear: true },
    ];
  }, [currentYear]);

  // 기간 검사 로직
  const { periodLabelText, isDateInPeriod } = useMemo(() => {
    if (selectedPeriod === 'ALL') {
      return {
        periodLabelText: '전체 사업기간 (3월~익년2월)',
        isDateInPeriod: (_d: string) => true,
      };
    }
    if (selectedPeriod === '1H') {
      return {
        periodLabelText: '1학기/상반기 (3월~8월)',
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m >= 3 && m <= 8;
        },
      };
    }
    if (selectedPeriod === '2H') {
      return {
        periodLabelText: '2학기/하반기 (9월~익년2월)',
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m >= 9 || m === 1 || m === 2;
        },
      };
    }
    if (selectedPeriod === 'Q1') {
      return {
        periodLabelText: '1분기 (3월~5월)',
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m >= 3 && m <= 5;
        },
      };
    }
    if (selectedPeriod === 'Q2') {
      return {
        periodLabelText: '2분기 (6월~8월)',
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m >= 6 && m <= 8;
        },
      };
    }
    if (selectedPeriod === 'Q3') {
      return {
        periodLabelText: '3분기 (9월~11월)',
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m >= 9 && m <= 11;
        },
      };
    }
    if (selectedPeriod === 'Q4') {
      return {
        periodLabelText: '4분기 (12월~익년2월)',
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m === 12 || m === 1 || m === 2;
        },
      };
    }
    if (selectedPeriod.startsWith('M')) {
      const monthNum = parseInt(selectedPeriod.replace('M', ''), 10);
      return {
        periodLabelText: `${monthNum}월`,
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          return m === monthNum;
        },
      };
    }
    if (selectedPeriod === 'CUSTOM') {
      return {
        periodLabelText: `${customStartMonth}월 ~ ${customEndMonth}월`,
        isDateInPeriod: (d: string) => {
          const m = parseInt(d.split('-')[1], 10);
          const order = (month: number) => (month >= 3 ? month - 2 : month + 10);
          const mOrder = order(m);
          const sOrder = order(customStartMonth);
          const eOrder = order(customEndMonth);
          if (sOrder <= eOrder) {
            return mOrder >= sOrder && mOrder <= eOrder;
          } else {
            return mOrder >= sOrder || mOrder <= eOrder;
          }
        },
      };
    }

    return {
      periodLabelText: '전체 사업기간',
      isDateInPeriod: () => true,
    };
  }, [selectedPeriod, customStartMonth, customEndMonth]);

  // 등록순 기준 영역별 관리연번(IA001 등) 맵
  const manageNoMap = useMemo(() => getExecutionManageNoMap(executions), [executions]);

  const filteredTasks = useMemo(() => {
    return (Object.values(tasks) as Task[]).filter((t) => {
      if (selectedDomain === 'ALL') return true;
      return t.code.startsWith(selectedDomain);
    });
  }, [tasks, selectedDomain]);

  // 전체 누적 집행 내역 (영역 필터만 적용)
  const domainExecutions = useMemo(() => {
    return executions.filter((e) => {
      if (selectedDomain === 'ALL') return true;
      return e.task_code.startsWith(selectedDomain);
    });
  }, [executions, selectedDomain]);

  // 기간 필터까지 적용된 집행 내역
  const filteredExecutions = useMemo(() => {
    const list = domainExecutions.filter((e) => isDateInPeriod(e.date));
    return [...list].sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [domainExecutions, isDateInPeriod]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const matchDomain = selectedDomain === 'ALL' || p.task_code.startsWith(selectedDomain);
      const progDate = p.period?.start || p.created_at || '';
      const matchPeriod = isDateInPeriod(progDate);
      return matchDomain && matchPeriod;
    });
  }, [programs, selectedDomain, isDateInPeriod]);

  const filteredAchievements = useMemo(() => {
    return achievements.filter((a) => {
      const aDate = a.period?.start || a.created_at || '';
      return isDateInPeriod(aDate);
    });
  }, [achievements, isDateInPeriod]);

  // Overall totals for report header
  const reportTotals = useMemo(() => {
    let totalBudget = 0;
    let totalExecuted = 0;

    filteredTasks.forEach((t) => {
      const s = getTaskBudgetSummary(t, filteredExecutions);
      totalBudget += s.total_budget;
      totalExecuted += s.total_executed;
    });

    return {
      totalBudget,
      totalExecuted,
      remaining: totalBudget - totalExecuted,
      rate: totalBudget > 0 ? (totalExecuted / totalBudget) * 100 : 0,
    };
  }, [filteredTasks, filteredExecutions]);

  // 월별 집행액 및 누적 집행 현황 계산 (전문대학 기준: 3월 ~ 익년 2월)
  const monthlyExecutionStats = useMemo(() => {
    let runningCumulative = 0;

    const stats = academicMonths.map((mObj, idx) => {
      const monthExecs = domainExecutions.filter((e) => {
        if (e.date.startsWith(mObj.valuePrefix)) return true;
        if (mObj.altPrefix && e.date.startsWith(mObj.altPrefix)) return true;
        return false;
      });

      const monthAmount = monthExecs.reduce((sum, e) => sum + e.amount, 0);
      runningCumulative += monthAmount;
      const cumulativeRate =
        reportTotals.totalBudget > 0 ? (runningCumulative / reportTotals.totalBudget) * 100 : 0;

      return {
        monthOrder: idx + 1,
        monthLabel: mObj.label,
        yearLabel: mObj.isNextYear ? `${currentYear + 1}년` : `${currentYear}년`,
        count: monthExecs.length,
        monthAmount,
        cumulativeAmount: runningCumulative,
        cumulativeRate,
        isCurrentFiltered: isDateInPeriod(mObj.valuePrefix + '-15'),
      };
    });

    if (hideEmptyMonths) {
      return stats.filter((s) => s.monthAmount > 0);
    }
    return stats;
  }, [academicMonths, domainExecutions, reportTotals.totalBudget, currentYear, hideEmptyMonths, isDateInPeriod]);

  // 7개 비목별 예산/집행 현황 통계 (오류 완전 수정: budget_matrix 사용)
  const categoryStats = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => {
      let budget = 0;
      let executed = 0;

      filteredTasks.forEach((t) => {
        const mat = t.budget_matrix?.[cat] || (t as any).budget_categories?.[cat] || {};
        budget += Number(mat.이월금 || 0) + Number(mat.기본사업비 || 0) + Number(mat.적정규모화 || 0);
      });

      filteredExecutions
        .filter((e) => e.category === cat)
        .forEach((e) => {
          executed += e.amount;
        });

      return {
        category: cat,
        budget,
        executed,
        remaining: budget - executed,
        rate: budget > 0 ? (executed / budget) * 100 : 0,
      };
    });
  }, [filteredTasks, filteredExecutions]);

  // 영역별(IA~IZ) 예산/집행 현황 통계
  const domainStats = useMemo(() => {
    const domainMeta = [
      { code: 'IA', name: '교육혁신(IA)' },
      { code: 'IB', name: '고등직업교육혁신(IB)' },
      { code: 'IC', name: '산학혁신(IC)' },
      { code: 'ID', name: '지역협력혁신(ID)' },
      { code: 'IE', name: '자율혁신(IE)' },
      { code: 'IZ', name: '사업관리(IZ)' },
    ];
    return domainMeta
      .map((d) => {
        const domainTasks = filteredTasks.filter((t) => t.code.startsWith(d.code));
        let budget = 0;
        domainTasks.forEach((t) => {
          budget += t.budget_total || 0;
        });
        const taskCodeSet = new Set(domainTasks.map((t) => t.code));
        const executed = filteredExecutions
          .filter((e) => taskCodeSet.has(e.task_code))
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          domainCode: d.code,
          domainName: d.name,
          taskCount: domainTasks.length,
          budget,
          executed,
          remaining: budget - executed,
          rate: budget > 0 ? (executed / budget) * 100 : 0,
        };
      })
      .filter((d) => d.taskCount > 0);
  }, [filteredTasks, filteredExecutions]);

  // 월별 실적(프로그램) 참여자 및 누적 통계 (3월 ~ 익년 2월)
  const monthlyProgramStats = useMemo(() => {
    let cumulativeParticipants = 0;

    const stats = academicMonths.map((mObj) => {
      const monthPrograms = domainExecutions
        ? programs.filter((p) => {
            const matchDomain = selectedDomain === 'ALL' || p.task_code.startsWith(selectedDomain);
            if (!matchDomain) return false;
            const date = p.period?.start || p.created_at || '';
            return date.startsWith(mObj.valuePrefix) || (mObj.altPrefix && date.startsWith(mObj.altPrefix));
          })
        : [];

      const monthParticipants = monthPrograms.reduce(
        (sum, p) => sum + (p.performance?.participants || 0),
        0
      );
      cumulativeParticipants += monthParticipants;

      const scoredPrograms = monthPrograms.filter((p) => p.performance?.satisfaction_score);
      const avgScore =
        scoredPrograms.length > 0
          ? scoredPrograms.reduce((sum, p) => sum + (p.performance?.satisfaction_score || 0), 0) /
            scoredPrograms.length
          : null;

      return {
        monthLabel: mObj.label,
        programCount: monthPrograms.length,
        participants: monthParticipants,
        cumulativeParticipants,
        avgScore: avgScore !== null ? avgScore.toFixed(1) : '-',
      };
    });

    if (hideEmptyMonths) {
      return stats.filter((s) => s.programCount > 0 || s.participants > 0);
    }
    return stats;
  }, [academicMonths, domainExecutions, programs, selectedDomain, hideEmptyMonths]);

  const handlePrint = () => {
    window.print();
  };

  // 인쇄/PDF 항목 선택 (체크 해제한 항목은 아예 렌더링에서 빠져서 인쇄 시 빈 여백이 남지 않음)
  const BUDGET_SECTIONS = [
    { key: 'budget-1', label: '1. 총괄 사업비 예산 및 집행 현황' },
    { key: 'budget-2', label: '2. 월별 및 누적 사업비 집행 현황' },
    { key: 'budget-3', label: '3. 영역별 예산 및 집행 현황' },
    { key: 'budget-4', label: '4. 비목별 예산 및 집행 현황' },
    { key: 'budget-5', label: '5. 세부과제별 예산 및 주요추진항목 현황' },
    { key: 'budget-6', label: '6. 대학혁신지원사업 지출부' },
  ];
  const PERF_SECTIONS = [
    { key: 'perf-1', label: '1. 5대 자율성과지표(KPI) 종합 달성 현황' },
    { key: 'perf-2', label: '2. 세부프로그램 총괄 운영 및 성과 요약' },
    { key: 'perf-3', label: '3. 월별 및 누적 프로그램 운영·참여 실적' },
    { key: 'perf-4', label: '4. 세부프로그램별 실적 및 성과 상세 내역' },
    { key: 'perf-5', label: '5. 프로그램 외 성과 실적' },
  ];
  const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>({});
  const isSectionOn = (key: string) => enabledSections[key] !== false;
  const toggleSection = (key: string) => {
    setEnabledSections((prev) => ({ ...prev, [key]: !isSectionOn(key) }));
  };
  const currentSectionList = reportType === 'budget' ? BUDGET_SECTIONS : PERF_SECTIONS;

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls (Hidden during print) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">보고서 및 지출부 출력</h2>
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
              전문대학 회계연도 (3월~익년2월) 적용
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            영역/비목/월별/누적 사업비 보고서 · 지출 집행 상세부 · 월별/누적 성과 및 KPI 보고서 출력
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
        >
          <Printer className="h-4 w-4" />
          <span>보고서 인쇄 / PDF 저장</span>
        </button>
      </div>

      {/* 1-B. 인쇄 항목 선택 (체크 해제한 항목은 인쇄물에서 완전히 빠져서 빈 여백이 남지 않습니다) */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs print:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">인쇄에 포함할 항목 선택</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setEnabledSections((prev) => {
                  const next = { ...prev };
                  currentSectionList.forEach((s) => (next[s.key] = true));
                  return next;
                })
              }
              className="text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              전체 선택
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() =>
                setEnabledSections((prev) => {
                  const next = { ...prev };
                  currentSectionList.forEach((s) => (next[s.key] = false));
                  return next;
                })
              }
              className="text-[11px] font-semibold text-slate-500 hover:underline"
            >
              전체 해제
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {currentSectionList.map((s) => (
            <label
              key={s.key}
              className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={isSectionOn(s.key)}
                onChange={() => toggleSection(s.key)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      {/* 2. Mode Selector & Domain / Period Filter (Hidden during print) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 print:hidden">
        {/* Sub-tabs for 2 Report Types */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportType('budget')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                reportType === 'budget'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>1. 사업비 보고서 & 지출부 (영역/비목/월별/누적)</span>
            </button>

            <button
              onClick={() => setReportType('performance')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                reportType === 'performance'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Target className="h-4 w-4" />
              <span>2. 성과관리 보고서 (월별/누적 실적 & KPI)</span>
            </button>
          </div>

          {/* Domain Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">영역 선택:</span>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-hidden"
            >
              {domainOptions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Period & Empty Month Toggle Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span className="font-bold text-slate-700">보고서 집계 기간:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setSelectedPeriod('ALL')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  selectedPeriod === 'ALL'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                전체 (3월~익년2월)
              </button>
              <button
                onClick={() => setSelectedPeriod('1H')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  selectedPeriod === '1H'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                1학기/상반기 (3~8월)
              </button>
              <button
                onClick={() => setSelectedPeriod('2H')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  selectedPeriod === '2H'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                2학기/하반기 (9~익년2월)
              </button>

              {/* Month Dropdown */}
              <select
                value={selectedPeriod.startsWith('M') ? selectedPeriod : ''}
                onChange={(e) => {
                  if (e.target.value) setSelectedPeriod(e.target.value);
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-hidden ml-1"
              >
                <option value="">개별 월 선택...</option>
                {academicMonths.map((m) => (
                  <option key={m.num} value={`M${String(m.num).padStart(2, '0')}`}>
                    {m.label} ({m.isNextYear ? `${currentYear + 1}년` : `${currentYear}년`})
                  </option>
                ))}
              </select>

              {/* Custom Period Button */}
              <button
                onClick={() => setSelectedPeriod('CUSTOM')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ml-1 ${
                  selectedPeriod === 'CUSTOM'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                직접 기간 지정
              </button>

              {selectedPeriod === 'CUSTOM' && (
                <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
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
          </div>

          {/* Option: Hide Empty Months */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <input
              type="checkbox"
              checked={hideEmptyMonths}
              onChange={(e) => setHideEmptyMonths(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span>실적 없는 달 표에서 생략</span>
          </label>
        </div>
      </div>

      {/* 3. Printable Report Document Canvas */}
      <div className="rounded-2xl border border-slate-300 bg-white p-8 shadow-sm print:border-none print:p-0 print:shadow-none font-sans text-slate-900">
        {/* Report Official Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center">
          <p className="text-xs font-bold tracking-widest text-indigo-700 uppercase">
            대학혁신지원사업단 공식 정기보고서
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            {currentYear}학년도 대학혁신지원사업{' '}
            {reportType === 'budget'
              ? '사업비 집행 및 지출부 상세 보고서'
              : '세부프로그램 성과 및 KPI 달성도 보고서'}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 mt-2">
            <span>출력일시: {new Date().toLocaleDateString('ko-KR')}</span>
            <span>·</span>
            <span>영역: {domainOptions.find((d) => d.code === selectedDomain)?.label}</span>
            <span>·</span>
            <span className="font-bold text-indigo-800">기간: {periodLabelText}</span>
            <span>·</span>
            <span>사업기간: {currentYear}년 3월 ~ {currentYear + 1}년 2월</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* REPORT TYPE 1: 사업비 보고서 (영역/비목/월별/누적 + 지출부) */}
        {/* ========================================================= */}
        {reportType === 'budget' && (
          <div className="space-y-8">
            {/* 1) Overall Executive Summary Table */}
            {isSectionOn('budget-1') && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                1. 총괄 사업비 예산 및 집행 현황
              </h3>
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800 text-center">
                  <tr>
                    <th className="border border-slate-300 p-2">총 편성 예산 (A)</th>
                    <th className="border border-slate-300 p-2">집행액 (B)</th>
                    <th className="border border-slate-300 p-2">집행 잔액 (A - B)</th>
                    <th className="border border-slate-300 p-2">집행률 (B / A)</th>
                    <th className="border border-slate-300 p-2">대상 과제수</th>
                    <th className="border border-slate-300 p-2">지출 집행건수</th>
                  </tr>
                </thead>
                <tbody className="text-center font-semibold">
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-bold">
                      ₩{reportTotals.totalBudget.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-emerald-700 font-bold font-mono">
                      ₩{reportTotals.totalExecuted.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-blue-700 font-bold font-mono">
                      ₩{reportTotals.remaining.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-indigo-900 font-extrabold text-sm">
                      {reportTotals.rate.toFixed(1)}%
                    </td>
                    <td className="border border-slate-300 p-2.5">{filteredTasks.length}개</td>
                    <td className="border border-slate-300 p-2.5">{filteredExecutions.length}건</td>
                  </tr>
                </tbody>
              </table>
            </div>
            )}

            {/* 2) Monthly & Cumulative Execution Report (전문대학: 3월 ~ 익년 2월) */}
            {isSectionOn('budget-2') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                  2. 월별 및 누적 사업비 집행 현황 (3월 ~ 익년 2월 회계연도 기준)
                </h3>
                {hideEmptyMonths && (
                  <span className="text-[11px] text-indigo-700 font-semibold">
                    * 실적이 없는 달은 생략됨
                  </span>
                )}
              </div>
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800 text-center">
                  <tr>
                    <th className="border border-slate-300 p-1.5 w-14">순서</th>
                    <th className="border border-slate-300 p-1.5 w-24">월별 (연도)</th>
                    <th className="border border-slate-300 p-1.5 w-20">집행 건수</th>
                    <th className="border border-slate-300 p-1.5 text-right">월간 집행액 (₩)</th>
                    <th className="border border-slate-300 p-1.5 text-right">누적 집행액 (₩)</th>
                    <th className="border border-slate-300 p-1.5 text-center w-24">누적 집행률</th>
                    <th className="border border-slate-300 p-1.5 text-right">잔여 예산 (₩)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyExecutionStats.map((stat) => (
                    <tr
                      key={stat.monthLabel}
                      className={
                        stat.monthAmount > 0
                          ? stat.isCurrentFiltered
                            ? 'bg-indigo-50/40'
                            : 'bg-white'
                          : 'bg-slate-50/50 text-slate-400'
                      }
                    >
                      <td className="border border-slate-300 p-1.5 text-center font-mono font-semibold">
                        {stat.monthOrder}차월
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">
                        {stat.monthLabel} <span className="text-[10px] font-normal text-slate-500">({stat.yearLabel})</span>
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center">{stat.count}건</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-semibold">
                        ₩{stat.monthAmount.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-emerald-800">
                        ₩{stat.cumulativeAmount.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-indigo-900">
                        {stat.cumulativeRate.toFixed(1)}%
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-600">
                        ₩{(reportTotals.totalBudget - stat.cumulativeAmount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="border border-slate-300 p-1.5 text-center" colSpan={2}>
                      합계
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center">
                      {domainExecutions.length}건
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">
                      ₩{monthlyExecutionStats.reduce((sum, s) => sum + s.monthAmount, 0).toLocaleString()}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono text-emerald-800">
                      ₩{monthlyExecutionStats.length > 0 ? monthlyExecutionStats[monthlyExecutionStats.length - 1].cumulativeAmount.toLocaleString() : '0'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center text-indigo-900">
                      {reportTotals.totalBudget > 0
                        ? ((monthlyExecutionStats.reduce((sum, s) => sum + s.monthAmount, 0) / reportTotals.totalBudget) * 100).toFixed(1)
                        : '0.0'}
                      %
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">
                      ₩{(reportTotals.totalBudget - monthlyExecutionStats.reduce((sum, s) => sum + s.monthAmount, 0)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            )}

            {/* 3) 영역별 집행 현황 (신규) */}
            {isSectionOn('budget-3') && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                3. 영역별 예산 및 집행 현황
              </h3>
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800 text-center">
                  <tr>
                    <th className="border border-slate-300 p-2">영역</th>
                    <th className="border border-slate-300 p-2">세부과제 수</th>
                    <th className="border border-slate-300 p-2 text-right">편성예산 (₩)</th>
                    <th className="border border-slate-300 p-2 text-right">집행액 (₩)</th>
                    <th className="border border-slate-300 p-2 text-right">잔액 (₩)</th>
                    <th className="border border-slate-300 p-2">집행률</th>
                  </tr>
                </thead>
                <tbody>
                  {domainStats.map((d) => (
                    <tr key={d.domainCode}>
                      <td className="border border-slate-300 p-2 font-bold text-slate-900">{d.domainName}</td>
                      <td className="border border-slate-300 p-2 text-center">{d.taskCount}개</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">
                        ₩{d.budget.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono text-emerald-800 font-bold">
                        ₩{d.executed.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono text-blue-800">
                        ₩{d.remaining.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold text-indigo-900">
                        {d.rate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* 4) 7 Expense Categories Breakdown (배정예산 오류 완전 수정) */}
            {isSectionOn('budget-4') && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                4. 비목별 예산 및 집행 현황 (7개 비목)
              </h3>
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800 text-center">
                  <tr>
                    <th className="border border-slate-300 p-1.5">비목명</th>
                    <th className="border border-slate-300 p-1.5 text-right">배정 예산 (₩)</th>
                    <th className="border border-slate-300 p-1.5 text-right">집행액 (₩)</th>
                    <th className="border border-slate-300 p-1.5 text-right">집행 잔액 (₩)</th>
                    <th className="border border-slate-300 p-1.5 text-center w-24">집행률 (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((c) => (
                    <tr key={c.category}>
                      <td className="border border-slate-300 p-1.5 font-bold">{c.category}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono">
                        ₩{c.budget.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-emerald-800">
                        ₩{c.executed.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-700">
                        ₩{c.remaining.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">
                        {c.rate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="border border-slate-300 p-1.5 text-center">합계</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">
                      ₩{reportTotals.totalBudget.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono text-emerald-800">
                      ₩{reportTotals.totalExecuted.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">
                      ₩{reportTotals.remaining.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center">
                      {reportTotals.rate.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            )}

            {/* 4) 세부과제별 7비목 × 3재원 예산 및 주요추진항목 현황 */}
            <div className={isSectionOn('budget-5') ? '' : 'hidden'}>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                5. 세부과제별 7비목 × 3재원 예산 및 주요추진항목 현황
              </h3>

              <div className="space-y-6">
                {filteredTasks.map((task) => {
                  const summary = getTaskBudgetSummary(task, filteredExecutions);
                  const itemsList = Object.values(task.items || {}) as TaskItem[];

                  return (
                    <div
                      key={task.code}
                      className="border border-slate-300 rounded-lg p-4 bg-slate-50/30 break-inside-avoid space-y-3"
                    >
                      <div className="flex flex-col gap-2 border-b border-slate-200 pb-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-800 text-white font-mono px-2 py-0.5 text-xs font-bold">
                            {task.code}
                          </span>
                          <span className="font-bold text-xs text-slate-900">{task.name}</span>
                          <span className="text-xs text-slate-500">[{task.domain}]</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-800">
                          <div className="w-28 text-right">
                            <span className="block text-[9px] font-semibold text-slate-400">총예산</span>
                            <span className="font-mono tabular-nums">₩{summary.total_budget.toLocaleString()}</span>
                          </div>
                          <div className="w-28 text-right">
                            <span className="block text-[9px] font-semibold text-slate-400">집행</span>
                            <span className="font-mono tabular-nums text-emerald-700">
                              ₩{summary.total_executed.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-28 text-right">
                            <span className="block text-[9px] font-semibold text-slate-400">잔액</span>
                            <span className="font-mono tabular-nums text-blue-700">
                              ₩{summary.total_remaining.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-24">
                            <span className="block text-[9px] font-semibold text-slate-400 text-right">집행률</span>
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
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
                              <span className="font-mono tabular-nums text-indigo-900 w-9 text-right">
                                {summary.execution_rate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 7비목 매트릭스 */}
                      <table className="w-full text-[11px] text-left border-collapse border border-slate-200 bg-white">
                        <thead className="bg-slate-100 text-slate-700 font-semibold">
                          <tr>
                            <th className="border border-slate-200 p-1.5">비목</th>
                            <th className="border border-slate-200 p-1.5 text-right">
                              이월금 (편성/집행/잔액)
                            </th>
                            <th className="border border-slate-200 p-1.5 text-right">
                              기본사업비 (편성/집행/잔액)
                            </th>
                            <th className="border border-slate-200 p-1.5 text-right">
                              적정규모화 (편성/집행/잔액)
                            </th>
                            <th className="border border-slate-200 p-1.5 text-right font-bold">
                              비목 합계 (잔액)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.categories.map((c) => (
                            <tr key={c.category}>
                              <td className="border border-slate-200 p-1.5 font-medium">{c.category}</td>
                              <td className="border border-slate-200 p-1.5 text-right font-mono">
                                ₩{c.budget.이월금.toLocaleString()} / ₩{c.executed.이월금.toLocaleString()} / ₩
                                {c.remaining.이월금.toLocaleString()}
                              </td>
                              <td className="border border-slate-200 p-1.5 text-right font-mono">
                                ₩{c.budget.기본사업비.toLocaleString()} / ₩
                                {c.executed.기본사업비.toLocaleString()} / ₩
                                {c.remaining.기본사업비.toLocaleString()}
                              </td>
                              <td className="border border-slate-200 p-1.5 text-right font-mono">
                                ₩{c.budget.적정규모화.toLocaleString()} / ₩
                                {c.executed.적정규모화.toLocaleString()} / ₩
                                {c.remaining.적정규모화.toLocaleString()}
                              </td>
                              <td className="border border-slate-200 p-1.5 text-right font-bold font-mono">
                                ₩{c.remaining.total.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* 추진항목 현황 */}
                      <div className="text-[11px] text-slate-700 pt-1">
                        <span className="font-bold text-slate-900 mr-2">
                          주요추진항목 ({itemsList.length}건):
                        </span>
                        {itemsList.map((item) => (
                          <span
                            key={item.code}
                            className="inline-block mr-3 rounded-sm bg-white border border-slate-200 px-1.5 py-0.5"
                          >
                            [{item.code}] {item.name} ({item.department}) —{' '}
                            <strong>{item.status}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5) Detailed Expenditure Register (지출부 출력 양식) */}
            {isSectionOn('budget-6') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                  6. 대학혁신지원사업 지출부 (지출 집행 상세 — {filteredExecutions.length}건)
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  * 영역 코드, 주요추진항목 코드 및 맨 우측 영역별 관리연번 수록
                </span>
              </div>

              <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800 text-center">
                  <tr>
                    <th className="border border-slate-300 p-1.5 w-10">연번</th>
                    <th className="border border-slate-300 p-1.5 w-20">집행일자</th>
                    <th className="border border-slate-300 p-1.5 w-12">영역</th>
                    <th className="border border-slate-300 p-1.5 w-16">세부과제</th>
                    <th className="border border-slate-300 p-1.5 w-18">추진항목</th>
                    <th className="border border-slate-300 p-1.5 w-20">담당부서</th>
                    <th className="border border-slate-300 p-1.5 min-w-[140px] text-left">
                      적요 (사용목적)
                    </th>
                    <th className="border border-slate-300 p-1.5 w-20">비목</th>
                    <th className="border border-slate-300 p-1.5 text-right w-24">집행액 (₩)</th>
                    <th className="border border-slate-300 p-1.5 w-24">지출처/결제</th>
                    <th className="border border-slate-300 p-1.5 w-24">내부결재문서번호</th>
                    <th className="border border-slate-300 p-1.5 w-16">점검</th>
                    {/* 사용자 요청: 맨오른쪽에 영역별 관리연번 */}
                    <th className="border border-slate-300 p-1.5 w-20 bg-amber-50 text-amber-900 font-bold">
                      관리연번
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExecutions.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="border border-slate-300 p-6 text-center text-slate-400">
                        해당 기간 및 영역에 등록된 집행 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredExecutions.map((exec, idx) => {
                      const domainCode = getDomainCode(exec.task_code);
                      const manageNo = manageNoMap.get(exec.id) || `${domainCode}001`;

                      return (
                        <tr key={exec.id} className="hover:bg-slate-50/60">
                          <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 p-1.5 font-mono text-center">
                            {exec.date}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">
                            {domainCode}
                          </td>
                          <td className="border border-slate-300 p-1.5 font-mono text-center">
                            {exec.task_code}
                          </td>
                          <td className="border border-slate-300 p-1.5 font-mono text-center">
                            {exec.item_code}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center">{exec.department}</td>
                          <td className="border border-slate-300 p-1.5 font-medium" title={exec.content}>
                            {exec.content}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center">{exec.category}</td>
                          <td className="border border-slate-300 p-1.5 text-right font-bold font-mono">
                            ₩{exec.amount.toLocaleString()}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center">
                            {exec.payee} ({exec.payment_method})
                          </td>
                          <td className="border border-slate-300 p-1.5 font-mono text-center">
                            {exec.internal_approval_doc_number || '-'}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center font-bold">
                            {exec.flag === 'green' ? '🟢 정상' : exec.flag === 'orange' ? '🟠 확인' : '🔴 시정'}
                          </td>
                          {/* 맨 오른쪽: 영역별 관리연번 (IA001 등) */}
                          <td className="border border-slate-300 p-1.5 text-center font-mono font-bold bg-amber-50/50 text-indigo-900">
                            {manageNo}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* REPORT TYPE 2: 성과관리 보고서 (월별/누적 실적 & KPI) */}
        {/* ========================================================= */}
        {reportType === 'performance' && (
          <div className="space-y-8">
            {/* 1) 5대 자율성과지표(KPI) 종합 달성 현황 — 보고서 형태로 깔끔하게 정리 */}
            {isSectionOn('perf-1') && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                1. 대학혁신 5대 자율성과지표(KPI) 종합 달성 현황
              </h3>

              {/* 지표 → 세부지표 → 측정지표 → 세부측정지표 4단계를 엑셀 대장처럼 숫자 위주로 정리.
                  목표값 칸은 있는 값(세부지표는 목표값, 없으면 권장값)을 그대로 보여주고, 달성도는 최상위 지표에만 표시 */}
              <table className="w-full text-[11px] text-left border-collapse border border-slate-400 table-fixed">
                <colgroup>
                  <col style={{ width: '42%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>
                <thead className="bg-slate-200 font-bold text-slate-800 text-center">
                  <tr>
                    <th className="border border-slate-400 p-1.5 text-left">지표 체계</th>
                    <th className="border border-slate-400 p-1.5">기준값</th>
                    <th className="border border-slate-400 p-1.5">목표값</th>
                    <th className="border border-slate-400 p-1.5">실적값</th>
                    <th className="border border-slate-400 p-1.5">달성도</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((kpi, kIdx) => {
                    const achRate = kpi.achievement * 100;
                    return (
                      <React.Fragment key={kpi.id}>
                        {/* Level 0: 자율성과지표 */}
                        <tr className="bg-slate-100 font-bold">
                          <td className="border border-slate-400 p-1.5 text-slate-900">
                            {kIdx + 1}. {kpi.name}
                          </td>
                          <td className="border border-slate-400 p-1.5 text-center font-mono">{kpi.baseline}</td>
                          <td className="border border-slate-400 p-1.5 text-center font-mono">{kpi.target}</td>
                          <td className="border border-slate-400 p-1.5 text-center font-mono">{kpi.actual}</td>
                          <td className="border border-slate-400 p-1.5 text-center font-mono text-emerald-800">
                            {achRate.toFixed(1)}%
                          </td>
                        </tr>

                        {/* Level 1: 세부지표 */}
                        {kpi.details.map((d, dIdx) => {
                          const detailTarget = d.target ?? d.recommended_value ?? null;
                          return (
                          <React.Fragment key={d.id}>
                            <tr className="bg-white">
                              <td className="border border-slate-400 py-1 pr-2 pl-6 font-semibold text-slate-800">
                                {kIdx + 1}-{dIdx + 1}. {d.name}
                              </td>
                              <td className="border border-slate-400 p-1 text-center font-mono text-slate-600">
                                {d.baseline}
                              </td>
                              <td className="border border-slate-400 p-1 text-center font-mono text-slate-600">
                                {detailTarget ?? '-'}
                              </td>
                              <td className="border border-slate-400 p-1 text-center font-mono font-semibold text-slate-800">
                                {d.actual}
                              </td>
                              <td className="border border-slate-400 p-1 text-center text-slate-300">-</td>
                            </tr>

                            {/* Level 2: 측정지표 */}
                            {d.measures.map((m, mIdx) => (
                              <React.Fragment key={m.id}>
                                <tr className="bg-slate-50">
                                  <td className="border border-slate-400 py-1 pr-2 pl-10 text-slate-700">
                                    {kIdx + 1}-{dIdx + 1}-{mIdx + 1}) {m.name}
                                  </td>
                                  <td className="border border-slate-400 p-1 text-center font-mono text-slate-500">
                                    {m.baseline}
                                  </td>
                                  <td className="border border-slate-400 p-1 text-center text-slate-300">-</td>
                                  <td className="border border-slate-400 p-1 text-center font-mono text-slate-700">
                                    {m.actual}
                                  </td>
                                  <td className="border border-slate-400 p-1 text-center text-slate-300">-</td>
                                </tr>

                                {/* Level 3: 세부측정지표 */}
                                {m.sub_measures.map((sm) => (
                                  <tr key={sm.id} className="bg-white">
                                    <td className="border border-slate-400 py-1 pr-2 pl-14 text-[10px] text-slate-600">
                                      · {sm.name}
                                    </td>
                                    <td className="border border-slate-400 p-1 text-center font-mono text-[10px] text-slate-400">
                                      {sm.baseline ?? '-'}
                                    </td>
                                    <td className="border border-slate-400 p-1 text-center font-mono text-[10px] text-slate-400">
                                      {sm.recommended_value ?? '-'}
                                    </td>
                                    <td className="border border-slate-400 p-1 text-center font-mono text-[10px] font-semibold text-slate-700">
                                      {sm.actual ?? '-'}
                                    </td>
                                    <td className="border border-slate-400 p-1 text-center text-slate-300">-</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-slate-400 mt-1.5">
                ※ 목표값은 세부지표까지만 존재합니다(측정지표·세부측정지표는 성과지표 관리대장 원본에 목표값 항목이
                없음). 세부지표에 목표값이 없는 경우 참고용 권장값을 대신 표시했습니다. 달성도는 목표 대비 실적
                개념이 있는 최상위 자율성과지표에만 표시됩니다.
              </p>
            </div>
            )}

            {/* 2) Overall Performance Summary */}
            {isSectionOn('perf-2') && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                2. 세부프로그램 총괄 운영 및 성과 요약
              </h3>
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800 text-center">
                  <tr>
                    <th className="border border-slate-300 p-2">총 프로그램 수</th>
                    <th className="border border-slate-300 p-2">완료 프로그램</th>
                    <th className="border border-slate-300 p-2">진행중 프로그램</th>
                    <th className="border border-slate-300 p-2">총 배정예산 (₩)</th>
                    <th className="border border-slate-300 p-2">총 집행액 (₩)</th>
                    <th className="border border-slate-300 p-2">총 참여인원</th>
                    <th className="border border-slate-300 p-2">평균 만족도</th>
                  </tr>
                </thead>
                <tbody className="text-center font-semibold">
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-bold">
                      {filteredPrograms.length}개
                    </td>
                    <td className="border border-slate-300 p-2.5 text-emerald-700 font-bold">
                      {filteredPrograms.filter((p) => p.status === '완료').length}개
                    </td>
                    <td className="border border-slate-300 p-2.5 text-blue-700 font-bold">
                      {filteredPrograms.filter((p) => p.status === '진행중').length}개
                    </td>
                    <td className="border border-slate-300 p-2.5 font-mono font-bold">
                      ₩
                      {filteredPrograms
                        .reduce((sum, p) => sum + (p.budget || 0), 0)
                        .toLocaleString()}
                    </td>
                    <td className="border border-slate-300 p-2.5 font-mono font-bold text-emerald-800">
                      ₩
                      {filteredPrograms
                        .reduce((sum, p) => sum + (p.execution_amount_allocated || 0), 0)
                        .toLocaleString()}
                    </td>
                    <td className="border border-slate-300 p-2.5 font-bold text-indigo-900">
                      {filteredPrograms
                        .reduce((sum, p) => sum + (p.performance?.participants || 0), 0)
                        .toLocaleString()}
                      명
                    </td>
                    <td className="border border-slate-300 p-2.5 font-bold text-amber-700">
                      {(
                        filteredPrograms.reduce(
                          (sum, p) => sum + (p.performance?.satisfaction_score || 0),
                          0
                        ) /
                        (filteredPrograms.filter((p) => p.performance?.satisfaction_score).length || 1)
                      ).toFixed(1)}
                      점 / 5.0
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            )}

            {/* 2) Monthly & Cumulative Performance Table (3월 ~ 익년 2월) */}
            {isSectionOn('perf-3') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                  3. 월별 및 누적 프로그램 운영 및 참여 실적 (3월 ~ 익년 2월)
                </h3>
                {hideEmptyMonths && (
                  <span className="text-[11px] text-indigo-700 font-semibold">
                    * 실적이 없는 달은 생략됨
                  </span>
                )}
              </div>
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800 text-center">
                  <tr>
                    <th className="border border-slate-300 p-1.5 w-20">월별</th>
                    <th className="border border-slate-300 p-1.5 w-24">운영 프로그램 수</th>
                    <th className="border border-slate-300 p-1.5 text-right w-28">월 참여인원 (명)</th>
                    <th className="border border-slate-300 p-1.5 text-right w-28">누적 참여인원 (명)</th>
                    <th className="border border-slate-300 p-1.5 text-center w-24">평균 만족도 (5점)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyProgramStats.map((stat) => (
                    <tr
                      key={stat.monthLabel}
                      className={stat.programCount > 0 ? 'bg-white' : 'bg-slate-50/50 text-slate-400'}
                    >
                      <td className="border border-slate-300 p-1.5 text-center font-bold">
                        {stat.monthLabel}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center">
                        {stat.programCount}개
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-semibold">
                        {stat.participants.toLocaleString()}명
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-indigo-900">
                        {stat.cumulativeParticipants.toLocaleString()}명
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-amber-700">
                        {stat.avgScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* 3) Programs Performance List */}
            {isSectionOn('perf-4') && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                4. 세부프로그램별 실적 및 성과 상세 내역 ({filteredPrograms.length}개)
              </h3>
              <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800 text-center">
                  <tr>
                    <th className="border border-slate-300 p-1.5 w-8">No</th>
                    <th className="border border-slate-300 p-1.5 w-10">영역</th>
                    <th className="border border-slate-300 p-1.5 w-16">세부과제</th>
                    <th className="border border-slate-300 p-1.5 w-18">추진항목</th>
                    <th className="border border-slate-300 p-1.5 w-24">내부결재문서번호</th>
                    <th className="border border-slate-300 p-1.5 min-w-[140px] text-left">
                      세부프로그램명 (차수)
                    </th>
                    <th className="border border-slate-300 p-1.5 w-20">부서 / 담당자</th>
                    <th className="border border-slate-300 p-1.5 w-24">운영일정</th>
                    <th className="border border-slate-300 p-1.5 text-right w-20">배정예산</th>
                    <th className="border border-slate-300 p-1.5 text-right w-20">실집행액</th>
                    <th className="border border-slate-300 p-1.5 w-12">집행률</th>
                    <th className="border border-slate-300 p-1.5 w-14">상태</th>
                    <th className="border border-slate-300 p-1.5 w-16">참여인원</th>
                    <th className="border border-slate-300 p-1.5 w-14">만족도</th>
                    <th className="border border-slate-300 p-1.5 w-20">결과보고서</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.map((prog, idx) => {
                    const domainCode = getDomainCode(prog.task_code);
                    const execAmt = prog.execution_amount_allocated || 0;
                    const rate = prog.budget > 0 ? (execAmt / prog.budget) * 100 : 0;

                    return (
                      <tr key={prog.id} className="hover:bg-slate-50/60">
                        <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5 font-mono text-center font-bold">
                          {domainCode}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-mono text-center">
                          {prog.task_code}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-mono text-center">
                          {prog.item_code}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-mono text-center font-bold text-indigo-900">
                          {prog.internal_approval_doc_number || '-'}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-semibold" title={prog.name}>
                          {prog.name} {prog.round_label && `(${prog.round_label})`}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center">
                          {prog.department} / {prog.manager || '-'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono text-[10px]">
                          {prog.period?.start || ''} ~ {prog.period?.end ? prog.period.end.slice(5) : ''}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono">
                          ₩{prog.budget.toLocaleString()}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right font-bold text-emerald-800 font-mono">
                          ₩{execAmt.toLocaleString()}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold">
                          {rate.toFixed(1)}%
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold">
                          {prog.status}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">
                          {prog.performance?.participants
                            ? `${prog.performance.participants.toLocaleString()}명`
                            : '-'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold text-amber-700">
                          {prog.performance?.satisfaction_score
                            ? `${prog.performance.satisfaction_score.toFixed(1)}점`
                            : '-'}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-mono text-center text-[10px]">
                          {prog.result_report_doc_number || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            {/* 4) 5대 자율성과지표(KPI) 종합 달성 현황은 1번 섹션으로 이동됨 */}

            {/* 5) 프로그램 외 성과 실적 (위원회 운영 · 규정정비 · 구성원참여 · 성과확산 · 업무협약) */}
            {filteredAchievements.length > 0 && isSectionOn('perf-5') && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-4 bg-indigo-600 rounded-xs" />
                  5. 프로그램 외 성과 실적 (위원회 운영 · 규정정비 · 구성원참여 · 성과확산 · 업무협약)
                </h3>
                <div className="space-y-2.5">
                  {ACHIEVEMENT_CATEGORIES.map((cat) => {
                    const catItems = filteredAchievements.filter((a) => a.category === cat);
                    if (catItems.length === 0) return null;

                    const bySub = new Map<string, typeof catItems>();
                    catItems.forEach((a) => {
                      if (!bySub.has(a.subcategory)) bySub.set(a.subcategory, []);
                      bySub.get(a.subcategory)!.push(a);
                    });

                    // 카테고리 전체 합계: metric_value가 있는 항목은 값을 더하고, 없는 항목은 1건으로 집계
                    const catTotal = catItems.reduce((sum, a) => sum + (a.metric_value ?? 1), 0);
                    const catUnit = catItems.find((a) => a.metric_unit)?.metric_unit || '건';

                    return (
                      <div key={cat} className="rounded-lg border border-slate-200 p-3">
                        <div className="text-xs font-bold text-slate-900 mb-1.5">
                          {cat} 실적 {catTotal}{catUnit}
                        </div>
                        <div className="space-y-2">
                          {Array.from(bySub.entries()).map(([sub, items]) => {
                            const subTotal = items.reduce((sum, a) => sum + (a.metric_value ?? 1), 0);
                            const subUnit = items.find((a) => a.metric_unit)?.metric_unit || '건';
                            return (
                              <div key={sub} className="text-[11px]">
                                <div className="font-semibold text-slate-800">
                                  · {sub} {subTotal}{subUnit}
                                </div>
                                <ul className="mt-0.5 pl-4 space-y-0.5">
                                  {items.map((it) => {
                                    const meta = [];
                                    if (it.internal_approval_doc_number) meta.push(it.internal_approval_doc_number);
                                    if (it.metric_value != null) meta.push(`${it.metric_value}${it.metric_unit || ''}`);
                                    meta.push(it.period?.start || '일자 미정');
                                    return (
                                      <li key={it.id} className="text-slate-700">
                                        {it.content}{' '}
                                        <span className="text-slate-400">({meta.join(', ')})</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

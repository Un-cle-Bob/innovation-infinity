import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getTaskBudgetSummary } from '../services/budgetEngine';
import { Task, TaskItem, ItemStatus } from '../types';
import {
  Wallet,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  PieChart,
  ArrowUpRight,
  ArrowRight,
  ShieldAlert,
  Clock,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { currentYear, tasks, executions, kpis } = useApp();

  // Summary Metrics
  const summary = useMemo(() => {
    const taskList = Object.values(tasks) as Task[];
    let totalBudget = 0;
    let totalExecuted = 0;

    const domainStats: {
      [domainCode: string]: {
        name: string;
        budget: number;
        executed: number;
        taskCount: number;
        fundBreakdown: { 이월금: number; 기본사업비: number; 적정규모화: number };
      };
    } = {
      'IA': { name: '교육혁신(IA)', budget: 0, executed: 0, taskCount: 0, fundBreakdown: { 이월금: 0, 기본사업비: 0, 적정규모화: 0 } },
      'IB': { name: '고등직업교육혁신(IB)', budget: 0, executed: 0, taskCount: 0, fundBreakdown: { 이월금: 0, 기본사업비: 0, 적정규모화: 0 } },
      'IC': { name: '산학혁신(IC)', budget: 0, executed: 0, taskCount: 0, fundBreakdown: { 이월금: 0, 기본사업비: 0, 적정규모화: 0 } },
      'ID': { name: '지역협력혁신(ID)', budget: 0, executed: 0, taskCount: 0, fundBreakdown: { 이월금: 0, 기본사업비: 0, 적정규모화: 0 } },
      'IE': { name: '자율혁신(IE)', budget: 0, executed: 0, taskCount: 0, fundBreakdown: { 이월금: 0, 기본사업비: 0, 적정규모화: 0 } },
      'IZ': { name: '사업관리 및 운영(IZ)', budget: 0, executed: 0, taskCount: 0, fundBreakdown: { 이월금: 0, 기본사업비: 0, 적정규모화: 0 } },
    };

    const fundTotals = {
      이월금: { budget: 0, executed: 0 },
      기본사업비: { budget: 0, executed: 0 },
      적정규모화: { budget: 0, executed: 0 },
    };

    taskList.forEach((t) => {
      const taskSummary = getTaskBudgetSummary(t, executions);
      totalBudget += taskSummary.total_budget;
      totalExecuted += taskSummary.total_executed;

      const codePrefix = t.code.split('-')[0];
      if (domainStats[codePrefix]) {
        domainStats[codePrefix].budget += taskSummary.total_budget;
        domainStats[codePrefix].executed += taskSummary.total_executed;
        domainStats[codePrefix].taskCount += 1;
        domainStats[codePrefix].fundBreakdown.이월금 += taskSummary.fund_summary.이월금.budget;
        domainStats[codePrefix].fundBreakdown.기본사업비 += taskSummary.fund_summary.기본사업비.budget;
        domainStats[codePrefix].fundBreakdown.적정규모화 += taskSummary.fund_summary.적정규모화.budget;
      }

      fundTotals.이월금.budget += taskSummary.fund_summary.이월금.budget;
      fundTotals.이월금.executed += taskSummary.fund_summary.이월금.executed;

      fundTotals.기본사업비.budget += taskSummary.fund_summary.기본사업비.budget;
      fundTotals.기본사업비.executed += taskSummary.fund_summary.기본사업비.executed;

      fundTotals.적정규모화.budget += taskSummary.fund_summary.적정규모화.budget;
      fundTotals.적정규모화.executed += taskSummary.fund_summary.적정규모화.executed;
    });

    // Item Statuses
    let totalItems = 0;
    const itemStatusCounts: Record<ItemStatus, number> = {
      예정: 0,
      진행중: 0,
      완료: 0,
      보류: 0,
    };

    taskList.forEach((t) => {
      (Object.values(t.items || {}) as TaskItem[]).forEach((item) => {
        totalItems++;
        if (itemStatusCounts[item.status] !== undefined) {
          itemStatusCounts[item.status]++;
        }
      });
    });

    // Signal lights
    const signalCounts = {
      green: executions.filter((e) => e.flag === 'green').length,
      orange: executions.filter((e) => e.flag === 'orange').length,
      red: executions.filter((e) => e.flag === 'red').length,
    };

    const overallRate = totalBudget > 0 ? (totalExecuted / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalExecuted,
      totalRemaining: totalBudget - totalExecuted,
      overallRate,
      domainStats,
      fundTotals,
      totalItems,
      itemStatusCounts,
      signalCounts,
    };
  }, [tasks, executions]);

  const recentExecutions = useMemo(() => {
    return [...executions]
      .sort((a, b) => (a.date > b.date ? -1 : 1))
      .slice(0, 5);
  }, [executions]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Hero Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              {currentYear}학년도 사업 현황 종합
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
            경북과학대학교 혁신지원사업 운영 대시보드
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            총 {Object.keys(tasks).length}개 세부과제 · {summary.totalItems}개 주요추진항목 · {executions.length}건 집행 관리 중
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-2 sm:pt-0">
          <button
            onClick={() => onNavigate('executions')}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-xs"
          >
            <span>집행내역 등록/조회</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
          >
            <span>보고서 인쇄</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 총 사업비 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">총 사업 예산 (34개 과제)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              ₩{summary.totalBudget.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              이월금 + 기본사업비 + 적정규모화
            </p>
          </div>
        </div>

        {/* 총 집행액 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">누적 집행 총액</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-600">
              ₩{summary.totalExecuted.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>집행률: <strong className="text-slate-800">{summary.overallRate.toFixed(1)}%</strong></span>
              <span>{executions.length}건 지출</span>
            </div>
          </div>
        </div>

        {/* 잔여 예산 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">집행 잔액 (잔여 예산)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <PieChart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-blue-600">
              ₩{summary.totalRemaining.toLocaleString()}
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${Math.min(100, summary.overallRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 점검 신호등 & 주요 추진 항목 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">집행 점검 현황</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <div className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 px-2 py-1.5 text-center border border-emerald-200">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>정상</span>
              </div>
              <span className="mt-0.5 text-xs font-extrabold text-emerald-950 whitespace-nowrap">
                {summary.signalCounts.green}건
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-amber-50 px-2 py-1.5 text-center border border-amber-200">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                <span>확인</span>
              </div>
              <span className="mt-0.5 text-xs font-extrabold text-amber-950 whitespace-nowrap">
                {summary.signalCounts.orange}건
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-rose-50 px-2 py-1.5 text-center border border-rose-200">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-800 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />
                <span>시정</span>
              </div>
              <span className="mt-0.5 text-xs font-extrabold text-rose-950 whitespace-nowrap">
                {summary.signalCounts.red}건
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Grid: 6대 영역별 집행현황 & 재원별 자동소진 현황 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* 6대 영역별 예산 & 집행률 (2 cols) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">6대 영역별 예산 대비 집행 현황</h3>
              <p className="text-xs text-slate-500">영역(IA ~ IZ) 단위 편성 예산 및 누적 집행률</p>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>세부과제 전체보기</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            {Object.entries(summary.domainStats).map(
              ([code, dom]: [
                string,
                {
                  name: string;
                  budget: number;
                  executed: number;
                  taskCount: number;
                  fundBreakdown: { 이월금: number; 기본사업비: number; 적정규모화: number };
                }
              ]) => {
              const rate = dom.budget > 0 ? (dom.executed / dom.budget) * 100 : 0;
              return (
                <div key={code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 border border-slate-200">
                        {code}
                      </span>
                      <span className="font-semibold text-slate-800">{dom.name}</span>
                      <span className="text-slate-400">({dom.taskCount}개 과제)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">₩{dom.executed.toLocaleString()}</span>
                      <span className="text-slate-400"> / ₩{dom.budget.toLocaleString()} </span>
                      <strong className="text-indigo-600 ml-1.5">({rate.toFixed(1)}%)</strong>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all duration-500 ${
                        code === 'IA'
                          ? 'bg-blue-600'
                          : code === 'IB'
                          ? 'bg-indigo-600'
                          : code === 'IC'
                          ? 'bg-cyan-600'
                          : code === 'ID'
                          ? 'bg-teal-600'
                          : code === 'IE'
                          ? 'bg-violet-600'
                          : 'bg-slate-700'
                      }`}
                      style={{ width: `${Math.min(100, rate)}%` }}
                    />
                  </div>
                  {/* 재원별(이월금/기본사업비/적정규모화) 미니 브레이크다운 */}
                  {dom.budget > 0 && (
                    <div className="flex items-center gap-2.5 pl-0.5 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        이월금 ₩{dom.fundBreakdown.이월금.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        기본사업비 ₩{dom.fundBreakdown.기본사업비.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                        적정규모화 ₩{dom.fundBreakdown.적정규모화.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3대 재원별 자동소진 현황 (5절) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">3대 재원별 소진 현황</h3>
            <p className="text-xs text-slate-500">이월금 → 기본사업비 → 적정규모화 순차 소진</p>
          </div>

          <div className="mt-4 space-y-4">
            {(['이월금', '기본사업비', '적정규모화'] as const).map((source, idx) => {
              const data = summary.fundTotals[source];
              const rate = data.budget > 0 ? (data.executed / data.budget) * 100 : 0;
              const remain = data.budget - data.executed;
              return (
                <div key={source} className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{source}</span>
                    </div>
                    <span className="font-bold text-indigo-700">{rate.toFixed(1)}% 소진</span>
                  </div>

                  <div className="mt-2 text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>편성 예산:</span>
                      <span className="font-medium text-slate-900">₩{data.budget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>집행(소진):</span>
                      <span className="font-medium text-emerald-700">₩{data.executed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>잔여액:</span>
                      <span className="font-semibold text-blue-700">₩{remain.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, rate)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. Bottom Grid: 추진항목 진행상황 & KPI 종합 달성도 & 최근 집행내역 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* 추진항목 진행상황 파이프라인 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">주요추진항목 진행 현황</h3>
              <p className="text-xs text-slate-500">총 {summary.totalItems}개 항목 파이프라인</p>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              항목 관리
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
              <span className="text-xs font-semibold text-slate-500">예정</span>
              <div className="text-xl font-bold text-slate-700 mt-1">
                {summary.itemStatusCounts.예정}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  ({Math.round((summary.itemStatusCounts.예정 / (summary.totalItems || 1)) * 100)}%)
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-center">
              <span className="text-xs font-semibold text-blue-700">진행중</span>
              <div className="text-xl font-bold text-blue-800 mt-1">
                {summary.itemStatusCounts.진행중}
                <span className="text-xs font-normal text-blue-500 ml-1">
                  ({Math.round((summary.itemStatusCounts.진행중 / (summary.totalItems || 1)) * 100)}%)
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-center">
              <span className="text-xs font-semibold text-emerald-700">완료</span>
              <div className="text-xl font-bold text-emerald-800 mt-1">
                {summary.itemStatusCounts.완료}
                <span className="text-xs font-normal text-emerald-500 ml-1">
                  ({Math.round((summary.itemStatusCounts.완료 / (summary.totalItems || 1)) * 100)}%)
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-center">
              <span className="text-xs font-semibold text-amber-700">보류</span>
              <div className="text-xl font-bold text-amber-800 mt-1">
                {summary.itemStatusCounts.보류}
                <span className="text-xs font-normal text-amber-500 ml-1">
                  ({Math.round((summary.itemStatusCounts.보류 / (summary.totalItems || 1)) * 100)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>완료율:</span>
            <strong className="text-emerald-700 font-bold">
              {Math.round((summary.itemStatusCounts.완료 / (summary.totalItems || 1)) * 100)}%
            </strong>
          </div>
        </div>

        {/* 8절 성과지표 (KPI) 요약 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">5대 성과지표 (KPI) 달성도</h3>
              <p className="text-xs text-slate-500">목표 대비 가중합 실시간 달성률</p>
            </div>
            <button
              onClick={() => onNavigate('kpi')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>KPI 상세</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {kpis.map((k) => {
              const achPercent = Math.round(k.achievement * 100);
              const isOver100 = achPercent >= 100;
              return (
                <div key={k.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 truncate max-w-[150px]">{k.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">
                        {k.actual} / 목표 {k.target}
                      </span>
                      <span
                        className={`rounded-xs px-1.5 py-0.2 text-[10px] font-bold ${
                          isOver100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {achPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isOver100 ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, achPercent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 최근 집행내역 5건 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">최근 집행 내역</h3>
              <p className="text-xs text-slate-500">최신 등록된 지출 5건</p>
            </div>
            <button
              onClick={() => onNavigate('executions')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              전체 목록
            </button>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {recentExecutions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">등록된 집행 내역이 없습니다.</div>
            ) : (
              recentExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          exec.flag === 'green'
                            ? 'bg-emerald-500'
                            : exec.flag === 'orange'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      <span className="font-bold text-slate-800 truncate">{exec.content}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {exec.date} · {exec.department} · {exec.task_code}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-900">₩{exec.amount.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500">{exec.payment_method}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  KpiDetail,
  KpiIndicator,
  Measure,
  SubMeasure,
} from '../types';
import {
  LineChart,
  ChevronDown,
  ChevronRight,
  Sliders,
  Check,
  X,
  Award,
  Building,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const KpiView: React.FC = () => {
  const {
    kpis,
    departments,
    updateKpiSubMeasure,
    updateKpiWeights,
    updateKpiSubMeasureRecommendedValue,
    canEditTab,
  } = useApp();

  const canEdit = canEditTab('kpi');

  const [expandedIndicators, setExpandedIndicators] = useState<{ [id: string]: boolean }>({
    'kpi-2026-1': true,
  });
  const [expandedDetails, setExpandedDetails] = useState<{ [id: string]: boolean }>({
    'det-2026-1-1': true,
  });

  // Weights Modal State
  const [weightsModalKpi, setWeightsModalKpi] = useState<KpiIndicator | null>(null);
  const [editingWeights, setEditingWeights] = useState<number[]>([]);

  const toggleIndicator = (id: string) => {
    setExpandedIndicators((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDetail = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openWeightsModal = (kpi: KpiIndicator) => {
    setWeightsModalKpi(kpi);
    setEditingWeights([...(kpi.weights || [])]);
  };

  const saveWeights = () => {
    if (!weightsModalKpi) return;
    const sum = editingWeights.reduce((a, b) => a + b, 0);
    if (sum !== 100 && sum !== 1.0) {
      if (!confirm(`가중치 합계가 ${sum}입니다 (일반적으로 100 또는 1.0 권장). 계속 저장하시겠습니까?`)) {
        return;
      }
    }
    updateKpiWeights(weightsModalKpi.id, 'indicator', null, editingWeights);
    setWeightsModalKpi(null);
  };

  const getCheckResultBadge = (res: 'O' | '-' | 'X') => {
    switch (res) {
      case 'O':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'X':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case '-':
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">성과지표 (KPI) 관리 및 가중계산</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            4계층 (자율성과지표 → 세부지표 → 측정지표 → 세부측정지표) 가중합 자동 상향 계산 & 권장값 3단계 달성 관리
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>실시간 가중합 엔진 가동중</span>
          </div>
        </div>
      </div>

      {/* 2. Top Level KPI Overview Cards (5대 자율성과지표) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi, idx) => {
          const achPercent = Math.round(kpi.achievement * 100);
          const isOver100 = achPercent >= 100;

          return (
            <div
              key={kpi.id}
              onClick={() => toggleIndicator(kpi.id)}
              className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                expandedIndicators[kpi.id]
                  ? 'border-indigo-500 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-300'
                  : 'border-slate-200 bg-white shadow-2xs hover:border-indigo-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>지표 #{idx + 1}</span>
                <span
                  className={`rounded-xs px-1.5 py-0.2 text-[10px] font-bold border ${
                    isOver100
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  {achPercent}% 달성
                </span>
              </div>

              <h4 className="mt-1.5 text-xs font-bold text-slate-900 line-clamp-1" title={kpi.name}>{kpi.name}</h4>

              <div className="mt-2.5 flex items-baseline justify-between text-xs">
                <span className="text-slate-500">
                  실적 <strong className="text-slate-900 font-bold">{kpi.actual}</strong>
                </span>
                <span className="text-[11px] text-slate-400">목표: {kpi.target}</span>
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

      {/* 3. 4-Tier KPI Tree & Table Container */}
      <div className="space-y-4">
        {kpis.map((kpi, kIdx) => {
          const isKpiExpanded = expandedIndicators[kpi.id];
          const achPercent = Math.round(kpi.achievement * 100);

          return (
            <div
              key={kpi.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
            >
              {/* 자율성과지표 Header */}
              <div
                onClick={() => toggleIndicator(kpi.id)}
                className="flex flex-col gap-3 bg-slate-900 p-4 text-white sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                    {isKpiExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-indigo-500/30 px-2 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-400/30">
                        자율성과지표 #{kIdx + 1}
                      </span>
                      <span className="text-xs text-slate-400">
                        {kpi.details.length}개 세부지표 산하
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1">{kpi.name}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400">기준값 / 목표값</span>
                    <span className="font-semibold text-slate-200">
                      {kpi.baseline} / {kpi.target}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400">가중합 실적 (달성도)</span>
                    <span className="font-bold text-emerald-400">
                      {kpi.actual} ({achPercent}%)
                    </span>
                  </div>

                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openWeightsModal(kpi);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                      title="세부지표별 가중치(weights) 설정"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>가중치 설정</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tree Body */}
              {isKpiExpanded && (
                <div className="divide-y divide-slate-200 bg-slate-50/50 p-4 space-y-4">
                  {kpi.details.map((detail, dIdx) => {
                    const isDetailExpanded = expandedDetails[detail.id];
                    const weightVal = kpi.weights && kpi.weights[dIdx] !== undefined ? kpi.weights[dIdx] : 0;

                    return (
                      <div
                        key={detail.id}
                        className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
                      >
                        {/* 세부지표 Row: 좌측 제목과 우측 가중치/기준/실적 고정 그리드 프레임 */}
                        <div
                          onClick={() => toggleDetail(detail.id)}
                          className="flex items-center justify-between bg-slate-100/80 p-3.5 cursor-pointer hover:bg-slate-200/60 transition-colors border-b border-slate-200"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-4">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-slate-700 font-bold text-xs border border-slate-300">
                              {isDetailExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-slate-800 border border-slate-200 shrink-0">
                              세부지표 {kIdx + 1}.{dIdx + 1}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 truncate" title={detail.name}>
                              {detail.name}
                            </h4>
                          </div>

                          {/* 규격화된 가중치 / 기준 / 실적 고정 그리드 프레임 (텍스트 길이에 무관하게 동일한 틀) */}
                          <div className="grid grid-cols-3 gap-2 w-72 sm:w-80 shrink-0 text-center select-none">
                            <div className="rounded-lg bg-indigo-50 border border-indigo-200 py-1 px-2">
                              <span className="text-[10px] font-medium text-indigo-600 block leading-tight">가중치</span>
                              <span className="text-xs font-extrabold text-indigo-900 leading-tight">{weightVal}%</span>
                            </div>
                            <div className="rounded-lg bg-slate-50 border border-slate-200 py-1 px-2">
                              <span className="text-[10px] font-medium text-slate-500 block leading-tight">기준값</span>
                              <span className="text-xs font-bold text-slate-800 leading-tight">{detail.baseline}</span>
                            </div>
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 py-1 px-2">
                              <span className="text-[10px] font-medium text-emerald-700 block leading-tight">가중합 실적</span>
                              <span className="text-xs font-extrabold text-emerald-800 leading-tight">{detail.actual}</span>
                            </div>
                          </div>
                        </div>

                        {/* 측정지표 & 세부측정지표 Table */}
                        {isDetailExpanded && (
                          <div className="p-3 bg-white space-y-3">
                            {detail.measures.map((measure, mIdx) => (
                              <div
                                key={measure.id}
                                className="rounded-lg border border-slate-100 bg-slate-50/40 p-3 space-y-2"
                              >
                                {/* 측정지표 Title */}
                                <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-xs bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-800 font-mono">
                                      측정지표 {kIdx + 1}.{dIdx + 1}.{mIdx + 1}
                                    </span>
                                    <span className="font-bold text-slate-800">{measure.name}</span>
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    측정 소계 실적: <strong className="text-indigo-900">{measure.actual}</strong>
                                  </div>
                                </div>

                                {/* 세부측정지표 Table (직접 실적 및 권장값 입력란) */}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                        <th className="py-2 px-3 min-w-[200px]">
                                          세부측정내역
                                        </th>
                                        <th className="py-2 px-3 text-right w-20">기준값</th>
                                        <th className="py-2 px-3 text-center w-20">
                                          권장값 ★
                                        </th>
                                        <th className="py-2 px-3 text-right w-24">실적값 (입력)</th>
                                        <th className="py-2 px-3 w-28">담당부서</th>
                                        <th className="py-2 px-3 text-center w-20">점검결과</th>
                                        <th className="py-2 px-3 w-24">증빙번호</th>
                                        <th className="py-2 px-3 min-w-[150px]">증빙자료내역</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {measure.sub_measures.map((sub) => {
                                        const isRecomMet =
                                          sub.recommended_value !== undefined &&
                                          sub.recommended_value !== null &&
                                          (sub.actual || 0) >= sub.recommended_value;

                                        return (
                                          <tr key={sub.id} className="hover:bg-slate-50/80">
                                            {/* 세부측정내역 */}
                                            <td className="py-2.5 px-3 font-medium text-slate-800">
                                              <div>{sub.name}</div>
                                              {sub.detail_note && (
                                                <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                                                  {sub.detail_note}
                                                </div>
                                              )}
                                            </td>

                                            {/* 기준값 */}
                                            <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                                              {sub.baseline === null || sub.baseline === undefined
                                                ? '-'
                                                : sub.baseline}
                                            </td>

                                            {/* 권장값 (8절 핵심) - 직접 수정 가능 */}
                                            <td className="py-2.5 px-3 text-center">
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={
                                                  sub.recommended_value === null ||
                                                  sub.recommended_value === undefined
                                                    ? ''
                                                    : sub.recommended_value
                                                }
                                                onChange={(e) =>
                                                  updateKpiSubMeasureRecommendedValue(
                                                    kpi.id,
                                                    detail.id,
                                                    measure.id,
                                                    sub.id,
                                                    e.target.value === '' ? null : Number(e.target.value)
                                                  )
                                                }
                                                placeholder="-"
                                                disabled={!canEdit}
                                                className={`w-16 rounded-xs border px-1.5 py-0.5 text-[11px] text-center font-bold focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                                                  sub.recommended_value === null || sub.recommended_value === undefined
                                                    ? 'bg-white text-slate-500 border-slate-300 focus:border-indigo-400'
                                                    : isRecomMet
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:border-emerald-500'
                                                    : 'bg-amber-50 text-amber-800 border-amber-300 focus:border-amber-500'
                                                }`}
                                              />
                                            </td>

                                            {/* 실적값 (인라인 직접 수정 시 상향 가중합 실시간 재계산) */}
                                            <td className="py-2.5 px-3 text-right">
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={sub.actual === null || sub.actual === undefined ? '' : sub.actual}
                                                onChange={(e) => {
                                                  const val =
                                                    e.target.value === '' ? null : Number(e.target.value);
                                                  updateKpiSubMeasure(
                                                    kpi.id,
                                                    detail.id,
                                                    measure.id,
                                                    sub.id,
                                                    val,
                                                    sub.check_result,
                                                    sub.evidence_no || '',
                                                    sub.evidence_desc || ''
                                                  );
                                                }}
                                                disabled={!canEdit}
                                                className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs text-right font-bold text-indigo-950 focus:border-indigo-500 focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                              />
                                            </td>

                                            {/* 담당부서 */}
                                            <td className="py-2.5 px-3 text-slate-700">
                                              <span className="rounded-xs bg-slate-100 px-1.5 py-0.5 text-[11px]">
                                                {sub.department}
                                              </span>
                                            </td>

                                            {/* 점검결과 (O / - / X 원클릭 변경) */}
                                            <td className="py-2.5 px-3 text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                {(['O', '-', 'X'] as const).map((r) => (
                                                  <button
                                                    key={r}
                                                    disabled={!canEdit}
                                                    onClick={() =>
                                                      updateKpiSubMeasure(
                                                        kpi.id,
                                                        detail.id,
                                                        measure.id,
                                                        sub.id,
                                                        sub.actual,
                                                        r,
                                                        sub.evidence_no || '',
                                                        sub.evidence_desc || ''
                                                      )
                                                    }
                                                    className={`h-5 w-5 rounded-md text-[10px] font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                      sub.check_result === r
                                                        ? getCheckResultBadge(r) + ' shadow-2xs font-extrabold ring-1 ring-slate-400'
                                                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                  >
                                                    {r}
                                                  </button>
                                                ))}
                                              </div>
                                            </td>

                                            {/* 증빙번호 */}
                                            <td className="py-2.5 px-3 font-mono text-slate-700">
                                              <input
                                                type="text"
                                                value={sub.evidence_no || ''}
                                                onChange={(e) =>
                                                  updateKpiSubMeasure(
                                                    kpi.id,
                                                    detail.id,
                                                    measure.id,
                                                    sub.id,
                                                    sub.actual,
                                                    sub.check_result,
                                                    e.target.value,
                                                    sub.evidence_desc || ''
                                                  )
                                                }
                                                disabled={!canEdit}
                                                className="w-20 rounded-md border border-slate-300 px-1.5 py-1 text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                                              />
                                            </td>

                                            {/* 증빙자료내역 */}
                                            <td className="py-2.5 px-3 text-slate-600">
                                              <input
                                                type="text"
                                                placeholder="예: 교육과정위원회 심의 회의록 및 결과보고서"
                                                value={sub.evidence_desc || ''}
                                                onChange={(e) =>
                                                  updateKpiSubMeasure(
                                                    kpi.id,
                                                    detail.id,
                                                    measure.id,
                                                    sub.id,
                                                    sub.actual,
                                                    sub.check_result,
                                                    sub.evidence_no || '',
                                                    e.target.value
                                                  )
                                                }
                                                disabled={!canEdit}
                                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. KPI Weights Configuration Modal */}
      {weightsModalKpi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {weightsModalKpi.name} — 세부지표 가중치(weights) 설정
                </h3>
                <p className="text-xs text-slate-500">
                  산하 {weightsModalKpi.details.length}개 세부지표의 반영 가중치를 설정합니다.
                </p>
              </div>
              <button
                onClick={() => setWeightsModalKpi(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {weightsModalKpi.details.map((det, dIdx) => (
                <div key={det.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-800 truncate flex-1">
                    {dIdx + 1}. {det.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={editingWeights[dIdx] !== undefined ? editingWeights[dIdx] : 0}
                      onChange={(e) => {
                        const nextW = [...editingWeights];
                        nextW[dIdx] = Number(e.target.value);
                        setEditingWeights(nextW);
                      }}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-xs font-bold text-indigo-900"
                    />
                    <span className="text-slate-500 font-bold">%</span>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">가중치 합계:</span>
                <span
                  className={`font-bold ${
                    editingWeights.reduce((a, b) => a + b, 0) === 100
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {editingWeights.reduce((a, b) => a + b, 0)}%
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWeightsModalKpi(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveWeights}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>가중치 저장 및 재계산</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

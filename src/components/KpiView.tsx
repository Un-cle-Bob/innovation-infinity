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
  Pencil,
} from 'lucide-react';

export const KpiView: React.FC = () => {
  const {
    kpis,
    departments,
    updateKpiSubMeasure,
    updateKpiWeights,
    updateKpiSubMeasureRecommendedValue,
    updateKpiDetailInfo,
    updateKpiMeasureInfo,
    updateKpiSubMeasureInfo,
    canEditTab,
  } = useApp();

  const canEdit = canEditTab('kpi');

  const [expandedIndicators, setExpandedIndicators] = useState<{ [id: string]: boolean }>({
    'kpi-2026-1': true,
  });
  const [expandedDetails, setExpandedDetails] = useState<{ [id: string]: boolean }>({
    'det-2026-1-1': true,
  });

  // 측정지표/세부측정지표 명칭·내역 인라인 수정 상태
  const [editingMeasureId, setEditingMeasureId] = useState<string | null>(null);
  const [editMeasureName, setEditMeasureName] = useState('');
  const [editingSubMeasureId, setEditingSubMeasureId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubNote, setEditSubNote] = useState('');

  // Weights Modal State (자율성과지표 / 세부지표 / 측정지표 3단계 공용)
  const [weightsModalCtx, setWeightsModalCtx] = useState<null | {
    kpi: KpiIndicator;
    type: 'indicator' | 'detail' | 'measure';
    detail?: KpiDetail;
    measure?: Measure;
    title: string;
    labels: string[];
  }>(null);
  const [editingWeights, setEditingWeights] = useState<number[]>([]);

  const toggleIndicator = (id: string) => {
    setExpandedIndicators((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDetail = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 해당 자율성과지표 하위의 모든 세부지표를 한 번에 펼치기/접기
  const expandAllUnderIndicator = (kpi: KpiIndicator, e: React.MouseEvent) => {
    e.stopPropagation();
    const allDetailIds = kpi.details.map((d) => d.id);
    const allOpen = allDetailIds.every((id) => expandedDetails[id]);
    setExpandedIndicators((prev) => ({ ...prev, [kpi.id]: true }));
    setExpandedDetails((prev) => {
      const next = { ...prev };
      allDetailIds.forEach((id) => {
        next[id] = !allOpen;
      });
      return next;
    });
  };

  const openWeightsModal = (
    kpi: KpiIndicator,
    type: 'indicator' | 'detail' | 'measure',
    detail?: KpiDetail,
    measure?: Measure
  ) => {
    let current: number[] = [];
    let labels: string[] = [];
    let title = '';
    if (type === 'indicator') {
      current = kpi.weights || [];
      labels = kpi.details.map((d) => d.name);
      title = `${kpi.name} — 세부지표 가중치 설정`;
    } else if (type === 'detail' && detail) {
      current = detail.weights || [];
      labels = detail.measures.map((m) => m.name);
      title = `${detail.name} — 측정지표 가중치 설정`;
    } else if (type === 'measure' && measure) {
      current = measure.weights || [];
      labels = measure.sub_measures.map((s) => s.name);
      title = `${measure.name} — 세부측정지표 가중치 설정`;
    }
    // 내부 저장은 0~1 소수, 편집 화면에서는 %(0~100)로 보여줌
    const initial =
      current.length === labels.length
        ? current.map((w) => Math.round(w * 10000) / 100)
        : labels.map(() => Math.round((100 / labels.length) * 100) / 100);
    setWeightsModalCtx({ kpi, type, detail, measure, title, labels });
    setEditingWeights(initial);
  };

  const saveWeights = () => {
    if (!weightsModalCtx) return;
    const sum = editingWeights.reduce((a, b) => a + b, 0);
    if (Math.round(sum) !== 100) {
      if (!confirm(`가중치 합계가 ${sum}%입니다 (보통 100%를 권장). 계속 저장하시겠습니까?`)) {
        return;
      }
    }
    const { kpi, type, detail, measure } = weightsModalCtx;
    // %(0~100) → 소수(0~1)로 변환해서 저장 (엔진은 합계 기준 자동 정규화도 해줌)
    const fractionWeights = editingWeights.map((w) => w / 100);
    updateKpiWeights(kpi.id, type, detail?.id ?? null, fractionWeights, measure?.id ?? null);
    setWeightsModalCtx(null);
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
                  <div className="w-32 text-right shrink-0">
                    <span className="block text-[10px] text-slate-400">기준값 / 목표값</span>
                    <span className="font-semibold text-slate-200 font-mono tabular-nums block truncate" title={`${kpi.baseline} / ${kpi.target}`}>
                      {kpi.baseline} / {kpi.target}
                    </span>
                  </div>

                  <div className="w-32 text-right shrink-0">
                    <span className="block text-[10px] text-slate-400">가중합 실적 (달성도)</span>
                    <span className="font-bold text-emerald-400 font-mono tabular-nums block truncate" title={`${kpi.actual} (${achPercent}%)`}>
                      {kpi.actual} ({achPercent}%)
                    </span>
                  </div>

                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openWeightsModal(kpi, 'indicator');
                      }}
                      className="flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                      title="세부지표별 가중치(weights) 설정"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>가중치 설정</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => expandAllUnderIndicator(kpi, e)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 border border-indigo-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                    title="이 지표 산하 세부지표를 한 번에 모두 펼치기/접기"
                  >
                    {kpi.details.every((d) => expandedDetails[d.id]) ? (
                      <>
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span>전체 접기</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        <span>전체 펼치기</span>
                      </>
                    )}
                  </button>
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

                          {/* 규격화된 가중치 / 기준 / 목표 / 권장 / 실적 고정 그리드 프레임 (텍스트 길이에 무관하게 동일한 틀) */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="grid grid-cols-5 gap-1.5 w-full max-w-xl sm:w-[30rem] shrink-0 text-center select-none"
                          >
                            <div className="rounded-lg bg-indigo-50 border border-indigo-200 py-1 px-1.5">
                              <span className="text-[10px] font-medium text-indigo-600 block leading-tight">가중치</span>
                              <span className="text-xs font-extrabold text-indigo-900 leading-tight">{weightVal}%</span>
                            </div>
                            <div className="rounded-lg bg-slate-50 border border-slate-200 py-1 px-1.5">
                              <span className="text-[10px] font-medium text-slate-500 block leading-tight">기준값</span>
                              <span className="text-xs font-bold text-slate-800 leading-tight">{detail.baseline}</span>
                            </div>
                            <div className="rounded-lg bg-blue-50 border border-blue-200 py-1 px-1.5">
                              <span className="text-[10px] font-medium text-blue-600 block leading-tight">목표값</span>
                              {canEdit ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={detail.target ?? ''}
                                  onChange={(e) =>
                                    updateKpiDetailInfo(kpi.id, detail.id, {
                                      target: e.target.value === '' ? null : Number(e.target.value),
                                    })
                                  }
                                  placeholder="-"
                                  className="w-full bg-transparent text-xs font-bold text-blue-900 leading-tight text-center focus:outline-hidden"
                                />
                              ) : (
                                <span className="text-xs font-bold text-blue-900 leading-tight">
                                  {detail.target ?? '-'}
                                </span>
                              )}
                            </div>
                            <div className="rounded-lg bg-amber-50 border border-amber-200 py-1 px-1.5">
                              <span className="text-[10px] font-medium text-amber-700 block leading-tight">권장값</span>
                              {canEdit ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={detail.recommended_value ?? ''}
                                  onChange={(e) =>
                                    updateKpiDetailInfo(kpi.id, detail.id, {
                                      recommended_value: e.target.value === '' ? null : Number(e.target.value),
                                    })
                                  }
                                  placeholder="-"
                                  className="w-full bg-transparent text-xs font-bold text-amber-900 leading-tight text-center focus:outline-hidden"
                                />
                              ) : (
                                <span className="text-xs font-bold text-amber-900 leading-tight">
                                  {detail.recommended_value ?? '-'}
                                </span>
                              )}
                            </div>
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 py-1 px-1.5">
                              <span className="text-[10px] font-medium text-emerald-700 block leading-tight">가중합 실적</span>
                              <span className="text-xs font-extrabold text-emerald-800 leading-tight">{detail.actual}</span>
                            </div>
                          </div>
                        </div>

                        {/* 측정지표 & 세부측정지표 Table */}
                        {isDetailExpanded && (
                          <div className="p-3 bg-white space-y-3">
                            {detail.measures.map((measure, mIdx) => {
                              const isEditingMeasureName = editingMeasureId === measure.id;
                              return (
                              <div
                                key={measure.id}
                                className="rounded-lg border border-slate-100 bg-slate-50/40 p-3 space-y-2"
                              >
                                {/* 측정지표 Title */}
                                <div className="flex items-center justify-between gap-3 text-xs border-b border-slate-200 pb-1.5">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="rounded-xs bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-800 font-mono shrink-0">
                                      측정지표 {kIdx + 1}.{dIdx + 1}.{mIdx + 1}
                                    </span>
                                    {isEditingMeasureName ? (
                                      <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <input
                                          type="text"
                                          value={editMeasureName}
                                          onChange={(e) => setEditMeasureName(e.target.value)}
                                          autoFocus
                                          className="flex-1 min-w-0 rounded-md border border-indigo-300 px-1.5 py-0.5 text-xs font-bold"
                                        />
                                        <button
                                          onClick={() => {
                                            updateKpiMeasureInfo(kpi.id, detail.id, measure.id, {
                                              name: editMeasureName.trim() || measure.name,
                                            });
                                            setEditingMeasureId(null);
                                          }}
                                          className="shrink-0 rounded bg-emerald-600 p-0.5 text-white"
                                        >
                                          <Check className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => setEditingMeasureId(null)}
                                          className="shrink-0 rounded bg-slate-200 p-0.5 text-slate-600"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-slate-800 truncate">{measure.name}</span>
                                    )}
                                    {canEdit && !isEditingMeasureName && (
                                      <button
                                        onClick={() => {
                                          setEditingMeasureId(measure.id);
                                          setEditMeasureName(measure.name);
                                        }}
                                        className="shrink-0 text-slate-300 hover:text-indigo-600"
                                        title="측정지표명 수정"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>

                                  {/* 측정지표 기준값/실적값 강조 표시 */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 text-center">
                                      <span className="block text-[9px] font-medium text-slate-500 leading-tight">기준값</span>
                                      <span className="text-xs font-bold text-slate-800 leading-tight">{measure.baseline}</span>
                                    </div>
                                    <div className="rounded-md bg-indigo-100 border border-indigo-300 px-2 py-1 text-center">
                                      <span className="block text-[9px] font-bold text-indigo-600 leading-tight">실적값</span>
                                      <span className="text-xs font-extrabold text-indigo-900 leading-tight">{measure.actual}</span>
                                    </div>
                                    {canEdit && (
                                      <button
                                        onClick={() => openWeightsModal(kpi, 'measure', detail, measure)}
                                        className="rounded-md bg-slate-800 border border-slate-700 p-1.5 text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                                        title="세부측정지표 가중치 설정"
                                      >
                                        <Sliders className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* 세부측정지표 Table (직접 실적 및 권장값 입력란) */}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                        <th className="py-2 px-3 min-w-[200px]">
                                          세부측정지표
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
                                        const isEditingSub = editingSubMeasureId === sub.id;

                                        return (
                                          <tr key={sub.id} className="hover:bg-slate-50/80">
                                            {/* 세부측정지표 (명칭 + 내역, 수정 가능) */}
                                            <td className="py-2.5 px-3 font-medium text-slate-800">
                                              {isEditingSub ? (
                                                <div className="space-y-1">
                                                  <input
                                                    type="text"
                                                    value={editSubName}
                                                    onChange={(e) => setEditSubName(e.target.value)}
                                                    className="w-full rounded-md border border-indigo-300 px-1.5 py-0.5 text-xs font-bold"
                                                    autoFocus
                                                  />
                                                  <input
                                                    type="text"
                                                    value={editSubNote}
                                                    onChange={(e) => setEditSubNote(e.target.value)}
                                                    placeholder="내역 (선택)"
                                                    className="w-full rounded-md border border-slate-300 px-1.5 py-0.5 text-[11px]"
                                                  />
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      onClick={() => {
                                                        updateKpiSubMeasureInfo(kpi.id, detail.id, measure.id, sub.id, {
                                                          name: editSubName.trim() || sub.name,
                                                          detail_note: editSubNote.trim(),
                                                        });
                                                        setEditingSubMeasureId(null);
                                                      }}
                                                      className="rounded bg-emerald-600 p-0.5 text-white"
                                                    >
                                                      <Check className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                      onClick={() => setEditingSubMeasureId(null)}
                                                      className="rounded bg-slate-200 p-0.5 text-slate-600"
                                                    >
                                                      <X className="h-3 w-3" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="flex items-start gap-1 group">
                                                  <div className="flex-1 min-w-0">
                                                    <div>{sub.name}</div>
                                                    {sub.detail_note && (
                                                      <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                                                        {sub.detail_note}
                                                      </div>
                                                    )}
                                                  </div>
                                                  {canEdit && (
                                                    <button
                                                      onClick={() => {
                                                        setEditingSubMeasureId(sub.id);
                                                        setEditSubName(sub.name);
                                                        setEditSubNote(sub.detail_note || '');
                                                      }}
                                                      className="shrink-0 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition-opacity"
                                                      title="명칭/내역 수정"
                                                    >
                                                      <Pencil className="h-3 w-3" />
                                                    </button>
                                                  )}
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

                                            {/* 담당부서 (자유 텍스트 - 콤마로 복수부서 입력 가능) */}
                                            <td className="py-2.5 px-3 text-slate-700">
                                              <input
                                                type="text"
                                                value={sub.department}
                                                onChange={(e) =>
                                                  updateKpiSubMeasureInfo(kpi.id, detail.id, measure.id, sub.id, {
                                                    department: e.target.value,
                                                  })
                                                }
                                                disabled={!canEdit}
                                                className="w-full rounded-xs border border-transparent bg-slate-100 px-1.5 py-0.5 text-[11px] focus:border-indigo-300 focus:bg-white focus:outline-hidden disabled:opacity-70"
                                              />
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
                              );
                            })}
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

      {/* 4. KPI Weights Configuration Modal (자율성과지표/세부지표/측정지표 3단계 공용) */}
      {weightsModalCtx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{weightsModalCtx.title}</h3>
                <p className="text-xs text-slate-500">
                  산하 {weightsModalCtx.labels.length}개 항목의 반영 가중치를 설정합니다.
                </p>
              </div>
              <button
                onClick={() => setWeightsModalCtx(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {weightsModalCtx.labels.map((label, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-800 truncate flex-1">
                    {idx + 1}. {label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={editingWeights[idx] !== undefined ? editingWeights[idx] : 0}
                      onChange={(e) => {
                        const nextW = [...editingWeights];
                        nextW[idx] = Number(e.target.value);
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
                    Math.round(editingWeights.reduce((a, b) => a + b, 0)) === 100
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {Math.round(editingWeights.reduce((a, b) => a + b, 0) * 100) / 100}%
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWeightsModalCtx(null)}
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

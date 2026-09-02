import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Achievement, AchievementCategory, ItemStatus } from '../types';
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_SUBCATEGORY_OPTIONS } from '../data/constants';
import { Plus, Edit2, Trash2, X, Check, FileText } from 'lucide-react';

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

const emptyForm = {
  category: '위원회 운영' as AchievementCategory,
  subcategory: ACHIEVEMENT_SUBCATEGORY_OPTIONS['위원회 운영'][0],
  subcategoryCustom: '',
  content: '',
  department: '',
  manager: '',
  periodStart: '',
  periodEnd: '',
  internalDoc: '',
  resultDoc: '',
  status: '예정' as ItemStatus,
  metricValue: '',
  metricUnit: '',
  satisfaction: '',
};

export const AchievementSection: React.FC = () => {
  const {
    achievements,
    departments,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    canEditTab,
    canDeleteTab,
  } = useApp();

  const canEdit = canEditTab('programs');
  const canDelete = canDeleteTab('programs');

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AchievementCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ItemStatus>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Achievement | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const filtered = useMemo(() => {
    return achievements
      .filter((a) => categoryFilter === 'ALL' || a.category === categoryFilter)
      .filter((a) => statusFilter === 'ALL' || a.status === statusFilter)
      .sort((a, b) => (b.period?.start || '').localeCompare(a.period?.start || ''));
  }, [achievements, categoryFilter, statusFilter]);

  const openAddModal = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (a: Achievement) => {
    const presetList = ACHIEVEMENT_SUBCATEGORY_OPTIONS[a.category];
    const isCustom = !presetList.includes(a.subcategory) || a.subcategory === '직접입력';
    setForm({
      category: a.category,
      subcategory: isCustom ? '직접입력' : a.subcategory,
      subcategoryCustom: isCustom ? a.subcategory : '',
      content: a.content,
      department: a.department,
      manager: a.manager,
      periodStart: a.period?.start || '',
      periodEnd: a.period?.end || '',
      internalDoc: a.internal_approval_doc_number || '',
      resultDoc: a.result_report_doc_number || '',
      status: a.status,
      metricValue: a.metric_value != null ? String(a.metric_value) : '',
      metricUnit: a.metric_unit || '',
      satisfaction: a.satisfaction_score != null ? String(a.satisfaction_score) : '',
    });
    setEditingId(a.id);
    setIsAddModalOpen(true);
  };

  const handleCategoryChange = (cat: AchievementCategory) => {
    setForm((f) => ({
      ...f,
      category: cat,
      subcategory: ACHIEVEMENT_SUBCATEGORY_OPTIONS[cat][0],
      subcategoryCustom: '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubcategory = form.subcategory === '직접입력' ? form.subcategoryCustom.trim() : form.subcategory;
    if (!finalSubcategory || !form.content.trim() || !form.manager.trim()) return;

    const payload = {
      category: form.category,
      subcategory: finalSubcategory,
      content: form.content.trim(),
      department: form.department,
      manager: form.manager.trim(),
      period: { start: form.periodStart, end: form.periodEnd },
      internal_approval_doc_number: form.internalDoc.trim(),
      result_report_doc_number: form.resultDoc.trim() || undefined,
      status: form.status,
      metric_value: form.metricValue.trim() ? Number(form.metricValue) : undefined,
      metric_unit: form.metricUnit.trim() || undefined,
      satisfaction_score: form.satisfaction.trim() ? Number(form.satisfaction) : undefined,
    };

    if (editingId) {
      updateAchievement(editingId, payload);
    } else {
      addAchievement(payload);
    }
    setIsAddModalOpen(false);
  };

  const subcategoryOptions = ACHIEVEMENT_SUBCATEGORY_OPTIONS[form.category];

  return (
    <div className="space-y-4">
      {/* Filter + Add */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            전체 ({achievements.length})
          </button>
          {ACHIEVEMENT_CATEGORIES.map((cat) => {
            const count = achievements.filter((a) => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
        {canEdit && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>성과 실적 등록</span>
          </button>
        )}
      </div>

      {/* 상태 필터 */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-slate-600">상태:</span>
        {(['ALL', '예정', '진행중', '완료', '보류'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold border transition-colors ${
              statusFilter === st
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {st === 'ALL' ? '전체' : st}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="py-2.5 px-3">구분</th>
              <th className="py-2.5 px-3 min-w-[200px]">실적내용</th>
              <th className="py-2.5 px-3">담당</th>
              <th className="py-2.5 px-3">일정</th>
              <th className="py-2.5 px-3">내부결재 문서번호</th>
              <th className="py-2.5 px-3">결과보고서</th>
              <th className="py-2.5 px-3 text-center">실적값</th>
              <th className="py-2.5 px-3 text-center">상태</th>
              <th className="py-2.5 px-3 w-20 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                  등록된 성과 실적이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 w-fit">
                        {a.category}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700">{a.subcategory}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">{a.content}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    <div>{a.manager}</div>
                    <div className="text-[10px] text-slate-400">{a.department}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {a.period?.start || '-'}
                    {a.period?.end ? ` ~ ${a.period.end}` : ''}
                  </td>
                  <td className="py-2.5 px-3">
                    {a.internal_approval_doc_number ? (
                      <span className="inline-flex items-center gap-1 rounded border border-indigo-300 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-800">
                        <FileText className="h-3 w-3" />
                        {a.internal_approval_doc_number}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {a.result_report_doc_number ? (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                        <FileText className="h-3 w-3" />
                        {a.result_report_doc_number}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {a.metric_value != null ? (
                      <span className="inline-flex items-center gap-1 text-slate-700 font-bold font-mono">
                        {a.metric_value}
                        {a.metric_unit || ''}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${getStatusColor(a.status)}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(a)}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100"
                          title="수정"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? '성과 실적 수정' : '성과 실적 등록'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">구분 *</label>
                  <select
                    value={form.category}
                    onChange={(e) => handleCategoryChange(e.target.value as AchievementCategory)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    {ACHIEVEMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">세부 항목 *</label>
                  <select
                    value={form.subcategory}
                    onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    {subcategoryOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form.subcategory === '직접입력' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">세부 항목 직접입력 *</label>
                  <input
                    type="text"
                    required
                    value={form.subcategoryCustom}
                    onChange={(e) => setForm({ ...form, subcategoryCustom: e.target.value })}
                    placeholder="예: 학칙 제12조 개정"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">실적내용 *</label>
                <textarea
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={2}
                  placeholder="예: 2026년 1차 대학혁신운영위원회 개최 및 사업 추진 실적 심의"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">담당부서</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">- 선택 -</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">담당자 *</label>
                  <input
                    type="text"
                    required
                    value={form.manager}
                    onChange={(e) => setForm({ ...form, manager: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">일정 시작</label>
                  <input
                    type="date"
                    value={form.periodStart}
                    onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">일정 종료</label>
                  <input
                    type="date"
                    value={form.periodEnd}
                    onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">내부결재문서번호</label>
                <input
                  type="text"
                  value={form.internalDoc}
                  onChange={(e) => setForm({ ...form, internalDoc: e.target.value })}
                  placeholder="예: 혁신-2026-0001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">결과보고서 번호</label>
                <input
                  type="text"
                  value={form.resultDoc}
                  onChange={(e) => setForm({ ...form, resultDoc: e.target.value })}
                  placeholder="예: 혁신-2026-0001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">상태</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ItemStatus })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="예정">예정</option>
                    <option value="진행중">진행중</option>
                    <option value="완료">완료</option>
                    <option value="보류">보류</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">값</label>
                  <input
                    type="number"
                    value={form.metricValue}
                    onChange={(e) => setForm({ ...form, metricValue: e.target.value })}
                    placeholder="예: 1, 45"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">단위</label>
                  <input
                    type="text"
                    list="achievement-unit-suggestions"
                    value={form.metricUnit}
                    onChange={(e) => setForm({ ...form, metricUnit: e.target.value })}
                    placeholder="회/건/명"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <datalist id="achievement-unit-suggestions">
                    <option value="회" />
                    <option value="건" />
                    <option value="명" />
                    <option value="편" />
                    <option value="개" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">만족도</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.satisfaction}
                    onChange={(e) => setForm({ ...form, satisfaction: e.target.value })}
                    placeholder="해당 시만"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                ※ "값"과 "단위"를 함께 입력하면(예: 값 1 + 단위 "회") 실적보고서에서 자동으로 합산되어
                "OOO위원회 3회"처럼 표시돼요. 인원수를 나타낼 때도 값에 숫자, 단위에 "명"을 입력하시면 됩니다.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
                >
                  {editingId ? '저장' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">성과 실적 삭제</h3>
            <p className="text-xs text-slate-500 mt-1">
              <strong>{deleteTarget.content}</strong> 실적을 삭제하시겠습니까? 이 작업은 복구할 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  deleteAchievement(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Copy, AlertCircle, X, Check } from 'lucide-react';

interface NewYearModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewYearModal: React.FC<NewYearModalProps> = ({ isOpen, onClose }) => {
  const { currentYear, yearList, createNewYear, showToast } = useApp();
  const [newYear, setNewYear] = useState<number>(currentYear + 1);
  const [sourceYear, setSourceYear] = useState<number>(currentYear);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (yearList.includes(newYear)) {
      showToast(`${newYear}년은 이미 등록되어 있는 연도입니다.`, 'error');
      return;
    }
    if (newYear < 2020 || newYear > 2040) {
      showToast('올바른 연도를 입력해주세요 (2020~2040).', 'error');
      return;
    }
    createNewYear(newYear, sourceYear);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">신규 사업연도 추가</h3>
              <p className="text-xs text-slate-500">기존 연도의 뼈대를 복사하여 새 연도 데이터를 초기화합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              생성할 신규 연도
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                min={2020}
                max={2040}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                required
              />
              <span className="text-sm font-medium text-slate-600 whitespace-nowrap">학년도</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              복사할 원본 연도 (기준 뼈대)
            </label>
            <select
              value={sourceYear}
              onChange={(e) => setSourceYear(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
            >
              {yearList.map((y) => (
                <option key={y} value={y}>
                  {y}학년도 데이터
                </option>
              ))}
            </select>
          </div>

          {/* 2절 복사/초기화 규칙 가이드 박스 */}
          <div className="rounded-lg bg-slate-50 p-4 text-xs space-y-2 border border-slate-200">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Copy className="h-3.5 w-3.5 text-indigo-600" />
              <span>사업연도 생성 시 자동 처리 규칙 (마스터 2절)</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <Check className="h-3 w-3" /> 복사 및 유지 항목:
                </span>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                  <li>영역/세부과제/주요추진항목 구조</li>
                  <li>예산 매트릭스 비목/재원 골조</li>
                  <li>세부프로그램 뼈대(이름/부서/일정)</li>
                  <li>KPI 체계(지표명/가중치/목표값)</li>
                </ul>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-rose-700 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> 초기화되는 항목:
                </span>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                  <li>지출 집행내역 전체 (0건)</li>
                  <li>프로그램 집행액(0원) 및 실적</li>
                  <li>추진항목 진행상황 → [예정]</li>
                  <li>KPI 실적값/증빙자료 리셋</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>{newYear}학년도 생성</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

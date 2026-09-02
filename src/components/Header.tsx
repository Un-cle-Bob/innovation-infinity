import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Calendar,
  Plus,
  ShieldCheck,
  Bell,
  Building2,
  User as UserIcon,
  BookOpen,
} from 'lucide-react';
import { NewYearModal } from './NewYearModal';
import { ManualModal } from './ManualModal';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentYear,
    yearList,
    setYear,
    currentUser,
    pendingApprovalCount,
  } = useApp();

  const [isNewYearModalOpen, setIsNewYearModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return {
          label: '주관리자 (총괄)',
          bg: 'bg-purple-100 text-purple-800 border-purple-300',
          desc: '모든 CRUD + 사용자/연도관리 + 승인처리',
        };
      case 'sub_admin':
        return {
          label: '부관리자 (승인권자)',
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          desc: '직접 수정/삭제 가능 + 보조관리자 요청 승인/반려',
        };
      case 'assistant_admin':
        return {
          label: '보조관리자 (실무자)',
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          desc: '신규등록 즉시반영, 수정/삭제는 요청 후 승인 필요',
        };
    }
  };

  const currentBadge = getRoleBadge(currentUser.role);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            
            {/* 1. App Brand & Title */}
            <div className="flex items-center gap-3 min-w-max">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xs">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-slate-900">
                    경북과학대 혁신지원사업
                  </h1>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                    통합관리 시스템
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  사업 예산·집행·성과 관리통합 플랫폼
                </p>
              </div>
            </div>

            {/* 2. Middle: Year Selector + New Year Button (2절) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50/70 p-1 shadow-2xs">
                <Calendar className="ml-2 h-4 w-4 text-indigo-600 shrink-0" />
                <select
                  value={currentYear}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="bg-transparent pl-2 pr-4 py-1 text-sm font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  {yearList.map((y) => (
                    <option key={y} value={y} className="bg-white text-slate-800">
                      {y}학년도
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsManualModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
                title="시스템 사용 매뉴얼 보기 / 다운로드"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>매뉴얼</span>
              </button>

              <button
                onClick={() => setIsNewYearModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors shadow-2xs"
                title="기존 연도 구조를 복사하여 신규 연도 생성 (마스터 2절)"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>신규 연도 추가</span>
              </button>
            </div>

            {/* 3. Right: Role Switcher & Approvals Badge (4절) */}
            <div className="flex items-center gap-3">
              {/* 승인요청 뱃지 (보조관리자의 수정/삭제 요청 건) */}
              <button
                onClick={() => setActiveTab('approvals')}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
                  activeTab === 'approvals'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : pendingApprovalCount > 0
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 animate-pulse'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="보조관리자 수정/삭제 요청 목록"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>수정요청</span>
                {pendingApprovalCount > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {pendingApprovalCount}
                  </span>
                )}
              </button>

              {/* 현재 로그인 사용자 표시 (읽기 전용) - 실제 로그인 연동 전까지 임시 표시 */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5 pr-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-700 shadow-2xs border border-slate-200">
                  <UserIcon className="h-3.5 w-3.5 text-slate-600" />
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
                    <span
                      className={`inline-block rounded-xs border px-1.5 py-0.2 text-[10px] font-bold ${currentBadge.bg}`}
                    >
                      {currentBadge.label.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{currentUser.department}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      <NewYearModal isOpen={isNewYearModalOpen} onClose={() => setIsNewYearModalOpen(false)} />
      {isManualModalOpen && <ManualModal onClose={() => setIsManualModalOpen(false)} />}
    </>
  );
};

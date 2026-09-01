import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TAB_PERMISSION_OPTIONS } from '../data/constants';
import { AppTabId } from '../types';
import {
  Settings,
  Building,
  CreditCard,
  Users,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    departments,
    corporateCards,
    users,
    addDepartment,
    deleteDepartment,
    addCorporateCard,
    deleteCorporateCard,
    currentUser,
    updateUserTabPermissions,
    canEditTab,
  } = useApp();

  const canEdit = canEditTab('settings');

  const [newDeptName, setNewDeptName] = useState('');
  const [newCardLabel, setNewCardLabel] = useState('');
  const [newCardLast4, setNewCardLast4] = useState('');

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    addDepartment(newDeptName.trim());
    setNewDeptName('');
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardLabel.trim() || !newCardLast4.trim()) return;
    addCorporateCard(newCardLabel.trim(), newCardLast4.trim());
    setNewCardLabel('');
    setNewCardLast4('');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900">기준정보 & 시스템 설정</h2>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          16개 담당부서 고정목록 · 6개 법인카드 관리 · 사용자 계정 및 권한(주/부/보조 관리자) 설정
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* 1. 16개 담당부서 고정 목록 관리 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">담당부서 목록 ({departments.length}개)</h3>
                <p className="text-xs text-slate-500">집행내역 및 세부프로그램에서 선택되는 공식 부서 목록</p>
              </div>
            </div>
          </div>

          {/* Add Dept Form */}
          {canEdit && (
            <form onSubmit={handleAddDept} className="flex gap-2">
              <input
                type="text"
                placeholder="추가할 부서명 입력 (예: 평생교육원)"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>부서 추가</span>
              </button>
            </form>
          )}

          {/* Depts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pt-1">
            {departments.map((dept, idx) => (
              <div
                key={dept.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
              >
                <span className="font-semibold text-slate-800 truncate">
                  {idx + 1}. {dept.name}
                </span>
                {canEdit && (
                  <button
                    onClick={() => {
                      if (confirm(`[${dept.name}] 부서를 삭제하시겠습니까?`)) {
                        deleteDepartment(dept.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 p-0.5"
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. 법인카드 6개 목록 관리 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">법인카드 목록 ({corporateCards.length}개)</h3>
                <p className="text-xs text-slate-500">집행내역에서 선택 가능한 법인카드 고정 목록</p>
              </div>
            </div>
          </div>

          {/* Add Card Form */}
          {canEdit && (
            <form onSubmit={handleAddCard} className="grid grid-cols-5 gap-2">
              <input
                type="text"
                placeholder="카드명 (예: 법인카드 7)"
                value={newCardLabel}
                onChange={(e) => setNewCardLabel(e.target.value)}
                className="col-span-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
              />
              <input
                type="text"
                placeholder="뒷4자리 (예: 9988)"
                value={newCardLast4}
                onChange={(e) => setNewCardLast4(e.target.value)}
                className="col-span-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
              />
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-2xs"
              >
                추가
              </button>
            </form>
          )}

          {/* Cards List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pt-1">
            {corporateCards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">{card.label}</span>
                    <span className="ml-2 font-mono text-indigo-700 font-semibold">
                      (끝자리: {card.last4})
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => {
                      if (confirm(`[${card.label}] 법인카드를 삭제하시겠습니까?`)) {
                        deleteCorporateCard(card.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. 사용자 및 권한 관리 (4절) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">사용자 계정 및 역할 기반 권한 (4절)</h3>
              <p className="text-xs text-slate-500">
                주관리자(Super Admin) · 부관리자(Sub Admin) · 보조관리자(Assistant Admin)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map((u) => {
            const isMe = u.uid === currentUser.uid;
            return (
              <div
                key={u.uid}
                className={`rounded-xl border p-4 transition-all ${
                  isMe
                    ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-300 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                    {isMe && (
                      <span className="rounded-xs bg-indigo-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                        현재 접속중
                      </span>
                    )}
                  </div>
                  <span
                    className={`rounded-xs px-2 py-0.5 text-xs font-bold border ${
                      u.role === 'super_admin'
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : u.role === 'sub_admin'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {u.role === 'super_admin'
                      ? '주관리자 (총괄)'
                      : u.role === 'sub_admin'
                      ? '부관리자 (승인권자)'
                      : '보조관리자 (실무자)'}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  <div>소속부서: {u.department}</div>
                  <div>이메일: {u.email}</div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    {u.role === 'super_admin' && '모든 데이터 CRUD + 연도관리 + 승인결재'}
                    {u.role === 'sub_admin' && '직접 수정/삭제 가능 + 보조관리자 요청 승인/반려'}
                    {u.role === 'assistant_admin' && '신규등록 즉시반영, 수정/삭제는 승인요청 생성'}
                  </div>
                </div>

                {/* 탭별 수정 권한 체크박스 (주관리자는 항상 전체 허용이라 설정 불필요) */}
                {u.role !== 'super_admin' && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5">
                    <div className="text-[11px] font-bold text-slate-600 mb-1.5">메뉴별 수정 권한</div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {TAB_PERMISSION_OPTIONS.map((tab) => {
                        const checked = (u.tab_permissions || []).includes(tab.id);
                        return (
                          <label
                            key={tab.id}
                            className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const current = u.tab_permissions || [];
                                const next: AppTabId[] = e.target.checked
                                  ? [...current, tab.id]
                                  : current.filter((t) => t !== tab.id);
                                updateUserTabPermissions(u.uid, next);
                              }}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            {tab.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

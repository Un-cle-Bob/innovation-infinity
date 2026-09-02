import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TAB_PERMISSION_OPTIONS } from '../data/constants';
import {
  Settings,
  Building,
  CreditCard,
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    departments,
    corporateCards,
    users,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addCorporateCard,
    updateCorporateCard,
    deleteCorporateCard,
    currentUser,
    updateUserTabPermission,
  } = useApp();

  // 시스템 설정(담당부서/법인카드/사용자 권한) 편집은 전부 주관리자만 가능
  const isSuperAdmin = currentUser.role === 'super_admin';
  const canEdit = isSuperAdmin;
  const canDelete = isSuperAdmin;

  const [newDeptName, setNewDeptName] = useState('');
  const [deleteDeptTarget, setDeleteDeptTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteCardTarget, setDeleteCardTarget] = useState<{ id: string; label: string } | null>(null);
  const [newCardLabel, setNewCardLabel] = useState('');
  const [newCardLast4, setNewCardLast4] = useState('');

  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardLabel, setEditCardLabel] = useState('');
  const [editCardLast4, setEditCardLast4] = useState('');

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

  const startEditDept = (id: string, name: string) => {
    setEditingDeptId(id);
    setEditDeptName(name);
  };
  const saveEditDept = (id: string) => {
    if (!editDeptName.trim()) return;
    updateDepartment(id, editDeptName.trim());
    setEditingDeptId(null);
  };

  const startEditCard = (id: string, label: string, last4: string) => {
    setEditingCardId(id);
    setEditCardLabel(label);
    setEditCardLast4(last4);
  };
  const saveEditCard = (id: string) => {
    if (!editCardLabel.trim() || !editCardLast4.trim()) return;
    updateCorporateCard(id, editCardLabel.trim(), editCardLast4.trim());
    setEditingCardId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900">시스템 설정</h2>
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
            {!isSuperAdmin && (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                <ShieldCheck className="h-3 w-3" />
                주관리자만 편집 가능
              </span>
            )}
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
                {editingDeptId === dept.id ? (
                  <div className="flex w-full items-center gap-1">
                    <input
                      type="text"
                      value={editDeptName}
                      onChange={(e) => setEditDeptName(e.target.value)}
                      className="w-full rounded-sm border border-indigo-300 px-1.5 py-0.5 text-xs"
                      autoFocus
                    />
                    <button
                      onClick={() => saveEditDept(dept.id)}
                      className="shrink-0 rounded bg-emerald-600 p-0.5 text-white"
                      title="저장"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setEditingDeptId(null)}
                      className="shrink-0 rounded bg-slate-200 p-0.5 text-slate-600"
                      title="취소"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800 truncate">
                      {idx + 1}. {dept.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <button
                          onClick={() => startEditDept(dept.id, dept.name)}
                          className="text-slate-400 hover:text-indigo-600 p-0.5"
                          title="수정"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteDeptTarget({ id: dept.id, name: dept.name })}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </>
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
            {!isSuperAdmin && (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                <ShieldCheck className="h-3 w-3" />
                주관리자만 편집 가능
              </span>
            )}
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
                {editingCardId === card.id ? (
                  <div className="flex w-full items-center gap-1.5">
                    <input
                      type="text"
                      value={editCardLabel}
                      onChange={(e) => setEditCardLabel(e.target.value)}
                      placeholder="카드명"
                      className="w-24 rounded-sm border border-indigo-300 px-1.5 py-0.5 text-xs"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editCardLast4}
                      onChange={(e) => setEditCardLast4(e.target.value)}
                      placeholder="뒷4자리"
                      className="w-16 rounded-sm border border-indigo-300 px-1.5 py-0.5 text-xs font-mono"
                    />
                    <button
                      onClick={() => saveEditCard(card.id)}
                      className="shrink-0 rounded bg-emerald-600 p-0.5 text-white"
                      title="저장"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingCardId(null)}
                      className="shrink-0 rounded bg-slate-200 p-0.5 text-slate-600"
                      title="취소"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
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
                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <button
                          onClick={() => startEditCard(card.id, card.label, card.last4)}
                          className="text-slate-400 hover:text-indigo-600 p-1"
                          title="수정"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteCardTarget({ id: card.id, label: card.label })}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. 사용자 및 권한 관리 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">사용자 계정 및 역할 기반 권한</h3>
              <p className="text-xs text-slate-500">
                주관리자(Super Admin) · 부관리자(Sub Admin) · 보조관리자(Assistant Admin)
              </p>
            </div>
          </div>
          {!isSuperAdmin && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              권한 편집은 주관리자만 가능
            </span>
          )}
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
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    {u.role === 'super_admin' && '모든 데이터 CRUD + 연도관리 + 승인결재'}
                    {u.role === 'sub_admin' && '직접 수정/삭제 가능 + 보조관리자 요청 승인/반려'}
                    {u.role === 'assistant_admin' && '신규등록 즉시반영, 수정/삭제는 요청 후 승인 필요'}
                  </div>
                </div>

                {/* 탭별 수정/삭제 권한 체크박스 (주관리자만 편집 가능, 주관리자 본인은 항상 전체 허용이라 설정 불필요) */}
                {u.role !== 'super_admin' && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5">
                    <div className="text-[11px] font-bold text-slate-600 mb-1.5">메뉴별 수정/삭제 권한</div>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-slate-400">
                          <th className="text-left font-medium pb-1">메뉴</th>
                          <th className="w-10 font-medium pb-1">수정</th>
                          <th className="w-10 font-medium pb-1">삭제</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TAB_PERMISSION_OPTIONS.map((tab) => {
                          const editChecked = !!u.tab_permissions?.[tab.id]?.edit;
                          const deleteChecked = !!u.tab_permissions?.[tab.id]?.delete;
                          return (
                            <tr key={tab.id} className="border-t border-slate-100">
                              <td className="py-1 text-slate-700">{tab.label}</td>
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  disabled={!isSuperAdmin}
                                  checked={editChecked}
                                  onChange={(e) =>
                                    updateUserTabPermission(u.uid, tab.id, 'edit', e.target.checked)
                                  }
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  disabled={!isSuperAdmin}
                                  checked={deleteChecked}
                                  onChange={(e) =>
                                    updateUserTabPermission(u.uid, tab.id, 'delete', e.target.checked)
                                  }
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 부서/법인카드 삭제 확인 모달 (iframe 환경에서 window.confirm이 안 뜨는 문제를 피하기 위해 커스텀으로 구현) */}
      {deleteDeptTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">담당부서 삭제</h3>
            <p className="text-xs text-slate-500 mt-1">
              <strong>[{deleteDeptTarget.name}]</strong> 부서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setDeleteDeptTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  deleteDepartment(deleteDeptTarget.id);
                  setDeleteDeptTarget(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">법인카드 삭제</h3>
            <p className="text-xs text-slate-500 mt-1">
              <strong>[{deleteCardTarget.label}]</strong> 법인카드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setDeleteCardTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  deleteCorporateCard(deleteCardTarget.id);
                  setDeleteCardTarget(null);
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

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest } from '../types';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Trash2,
  Edit2,
  UserCheck,
  MessageSquare,
} from 'lucide-react';

export const ApprovalsView: React.FC = () => {
  const { approvalRequests, approveRequest, rejectRequest, currentUser } = useApp();

  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>(
    'pending'
  );
  const [rejectModalReq, setRejectModalReq] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const filteredRequests = approvalRequests.filter((req) => {
    if (selectedStatus === 'all') return true;
    return req.status === selectedStatus;
  });

  const handleOpenRejectModal = (req: ApprovalRequest) => {
    setRejectModalReq(req);
    setRejectReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectModalReq) return;
    if (!rejectReason.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    rejectRequest(rejectModalReq.id, rejectReason.trim());
    setRejectModalReq(null);
  };

  const canApprove = currentUser.role === 'super_admin' || currentUser.role === 'sub_admin';

  return (
    <div className="space-y-5">
      
      {/* 1. Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">승인 요청함 (결재 대기 목록)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            보조관리자가 요청한 집행내역 수정 및 삭제 건에 대해 주관리자 및 부관리자가 검토 후 승인/반려합니다.
          </p>
        </div>

        {/* Current User Role Notice */}
        <div className="flex items-center gap-2">
          {canApprove ? (
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span>승인 권한 보유 ({currentUser.role === 'super_admin' ? '주관리자' : '부관리자'})</span>
            </span>
          ) : (
            <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <span>보조관리자 계정 (결재 승인 권한 없음 - 조회 전용)</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3">
        {[
          { id: 'pending', label: '승인 대기중', count: approvalRequests.filter((r) => r.status === 'pending').length },
          { id: 'approved', label: '승인 완료', count: approvalRequests.filter((r) => r.status === 'approved').length },
          { id: 'rejected', label: '반려됨', count: approvalRequests.filter((r) => r.status === 'rejected').length },
          { id: 'all', label: '전체 보기', count: approvalRequests.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id as any)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              selectedStatus === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                selectedStatus === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 3. Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            조회할 승인 요청 건이 없습니다.
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isDelete = req.type === 'delete';
            const orig = req.original_data;
            const updates = req.payload || {};

            return (
              <div
                key={req.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
              >
                {/* Request Header */}
                <div className="flex flex-col gap-2 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isDelete ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isDelete ? <Trash2 className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                            isDelete
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {isDelete ? '집행내역 [삭제 요청]' : '집행내역 [수정 요청]'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">ID: {req.target_exec_id}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-semibold mt-1">
                        요청자: <strong className="text-slate-900">{req.requested_by.name}</strong> (
                        {req.requested_by.department} · {req.requested_by.role}) · 요청일시:{' '}
                        {new Date(req.requested_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2">
                    {req.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-300">
                          <Clock className="h-3.5 w-3.5" />
                          <span>승인 대기중</span>
                        </span>
                        {canApprove && (
                          <>
                            <button
                              onClick={() => approveRequest(req.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>승인 (즉시반영)</span>
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(req)}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-2xs"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>반려</span>
                            </button>
                          </>
                        )}
                      </div>
                    ) : req.status === 'approved' ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>승인 완료</span>
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          처리자: {req.processed_by?.name} ({new Date(req.processed_at || '').toLocaleTimeString()})
                        </div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>반려됨</span>
                        </span>
                        <div className="text-[11px] text-rose-700 mt-0.5 font-medium">
                          사유: {req.reject_reason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Diff View */}
                <div className="p-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs space-y-1.5">
                      <div className="font-bold text-slate-700 border-b border-slate-200 pb-1 flex items-center justify-between">
                        <span>[현재 원본 데이터]</span>
                        <span className="text-[11px] text-slate-500">{orig.date}</span>
                      </div>
                      <div>
                        과제/항목: <strong className="text-slate-900">{orig.task_code}</strong> /{' '}
                        <strong className="text-slate-700">{orig.item_code}</strong> ({orig.department})
                      </div>
                      <div>
                        적요: <span className="font-semibold text-slate-800">{orig.content}</span>
                      </div>
                      <div>
                        비목/금액: <span>{orig.category}</span> /{' '}
                        <strong className="text-slate-900">₩{orig.amount.toLocaleString()}</strong> (
                        {orig.payment_method})
                      </div>
                      <div>
                        문서번호: 결재 [{orig.internal_approval_doc_number || '-'}] · 청구 [
                        {orig.invoice_doc_number || '-'}] · 전표 [{orig.voucher_approval_number || '-'}]
                      </div>
                    </div>

                    {/* Proposed Changes or Deletion */}
                    <div
                      className={`rounded-lg border p-3 text-xs space-y-1.5 ${
                        isDelete
                          ? 'border-rose-200 bg-rose-50/30'
                          : 'border-blue-200 bg-blue-50/30'
                      }`}
                    >
                      <div
                        className={`font-bold border-b pb-1 flex items-center justify-between ${
                          isDelete ? 'text-rose-800 border-rose-200' : 'text-blue-800 border-blue-200'
                        }`}
                      >
                        <span>{isDelete ? '[삭제 요청 내용]' : '[수정 제안 데이터]'}</span>
                        <span className="text-[11px]">
                          {isDelete ? '이 항목 전체 영구 삭제' : updates.date || orig.date}
                        </span>
                      </div>

                      {isDelete ? (
                        <div className="py-3 text-rose-700 font-medium">
                          해당 집행내역을 시스템에서 완전히 삭제합니다. 승인 시 원장의 집행액이 차감 환원됩니다.
                        </div>
                      ) : (
                        <>
                          <div>
                            과제/항목:{' '}
                            <strong className="text-blue-900">
                              {updates.task_code || orig.task_code}
                            </strong>{' '}
                            /{' '}
                            <strong className="text-blue-800">
                              {updates.item_code || orig.item_code}
                            </strong>{' '}
                            ({updates.department || orig.department})
                          </div>
                          <div>
                            적요:{' '}
                            <span className="font-bold text-blue-950">
                              {updates.content || orig.content}
                            </span>
                          </div>
                          <div>
                            비목/금액: <span>{updates.category || orig.category}</span> /{' '}
                            <strong className="text-blue-900">
                              ₩{(updates.amount !== undefined ? updates.amount : orig.amount).toLocaleString()}
                            </strong>{' '}
                            ({updates.payment_method || orig.payment_method})
                          </div>
                          <div>
                            문서번호: 결재 [
                            {updates.internal_approval_doc_number ||
                              orig.internal_approval_doc_number ||
                              '-'}
                            ] · 청구 [
                            {updates.invoice_doc_number || orig.invoice_doc_number || '-'}
                            ] · 전표 [
                            {updates.voucher_approval_number || orig.voucher_approval_number || '-'}
                            ]
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Reject Reason Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-rose-700 font-bold">
              <XCircle className="h-5 w-5" />
              <h3 className="text-base text-slate-900">승인 요청 반려</h3>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                요청자 <strong>{rejectModalReq.requested_by.name}</strong> 님에게 전달될 반려 사유를 입력하세요.
              </p>
              <textarea
                rows={3}
                placeholder="예: 예산 비목 확인 필요, 지출 증빙 미첨부 등"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                required
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs"
              >
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

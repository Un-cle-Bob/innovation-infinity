import React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  ReceiptText,
  Table,
  Target,
  LineChart,
  Printer,
  FileCheck2,
  Settings,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { pendingApprovalCount } = useApp();

  const navItems = [
    { id: 'dashboard', label: '종합 대시보드', icon: LayoutDashboard },
    { id: 'tasks', label: '예산 관리', icon: FolderTree },
    { id: 'executions', label: '집행 관리', icon: ReceiptText },
    { id: 'programs', label: '실적 관리', icon: Target },
    { id: 'summary', label: '사업비 총괄표', icon: Table },
    { id: 'kpi', label: '성과지표 (KPI)', icon: LineChart },
    { id: 'reports', label: '보고서 인쇄/PDF', icon: Printer },
    {
      id: 'approvals',
      label: '수정 요청함',
      icon: FileCheck2,
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : null,
    },
    { id: 'settings', label: '시스템 설정', icon: Settings },
  ];

  return (
    <nav className="bg-slate-900 text-slate-300 border-b border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-300 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

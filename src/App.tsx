import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ToastContainer } from './components/Toast';
import { DashboardView } from './components/DashboardView';
import { TasksView } from './components/TasksView';
import { ExecutionsView } from './components/ExecutionsView';
import { GeneralSummaryView } from './components/GeneralSummaryView';
import { ProgramsView } from './components/ProgramsView';
import { KpiView } from './components/KpiView';
import { ReportsView } from './components/ReportsView';
import { ApprovalsView } from './components/ApprovalsView';
import { SettingsView } from './components/SettingsView';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* 1. Header (Sticky) - 인쇄 시 숨김 */}
      <div className="app-no-print">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* 2. Navigation Tabs Bar - 인쇄 시 숨김 */}
      <div className="app-no-print">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* 3. Main Workspace Area */}
      <main className="app-print-area flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 print:px-0 print:py-0">
        {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'executions' && <ExecutionsView />}
        {activeTab === 'summary' && <GeneralSummaryView />}
        {activeTab === 'programs' && <ProgramsView />}
        {activeTab === 'kpi' && <KpiView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'approvals' && <ApprovalsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* 4. Global Toast Notifications */}
      <div className="app-no-print">
        <ToastContainer />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

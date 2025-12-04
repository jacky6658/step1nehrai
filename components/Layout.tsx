import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Send, 
  Users, 
  Bot, 
  Menu,
  Briefcase,
  ExternalLink,
  Settings,
  Globe2,
  UserCircle2
} from 'lucide-react';
import { RecruitmentTool } from '../types';

interface LayoutProps {
  currentTool: RecruitmentTool;
  onToolChange: (tool: RecruitmentTool) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentTool, onToolChange, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: RecruitmentTool.DASHBOARD, label: '儀表板 (Dashboard)', icon: LayoutDashboard },
    { id: RecruitmentTool.JD_GENERATOR, label: 'JD 職缺生成器', icon: FileText },
    { id: RecruitmentTool.PERSONA_GENERATOR, label: '人才畫像生成器', icon: UserCircle2 },
    { id: RecruitmentTool.TALENT_SEARCH, label: '人才搜尋與策略', icon: Globe2 },
    { id: RecruitmentTool.OUTREACH_WRITER, label: '開發信撰寫助手', icon: Send },
    { id: RecruitmentTool.INTERVIEW_COPILOT, label: '面試提問助手', icon: Users },
    { id: RecruitmentTool.AGENT_CHAT, label: '招募 AI 顧問', icon: Bot },
  ];

  return (
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-full
      `}>
        <div className="flex items-center gap-3 p-6 border-b border-slate-800 flex-shrink-0">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Briefcase size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">RecruitAI</h1>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentTool === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onToolChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <item.icon size={20} className="flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800 flex-shrink-0 space-y-2">
            <button
                onClick={() => {
                  onToolChange(RecruitmentTool.SETTINGS);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left
                  ${currentTool === RecruitmentTool.SETTINGS
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Settings size={20} className="flex-shrink-0" />
                <span className="font-medium">設定 (Settings)</span>
              </button>

          <a 
            href="https://step1ne.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 group hover:bg-slate-800 p-2 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-xs text-slate-900 group-hover:scale-105 transition-transform">
              S1
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200 group-hover:text-white">Step1ne</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 group-hover:text-slate-400">
                官方網站 <ExternalLink size={10} />
              </p>
            </div>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        {/* Top Header (Mobile - Sticky) */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 z-30 sticky top-0 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2">
             <div className="p-1 bg-indigo-600 rounded">
                <Briefcase size={16} className="text-white" />
              </div>
            <span className="font-bold text-slate-900">RecruitAI</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600">
            <Menu size={24} />
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 w-full">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
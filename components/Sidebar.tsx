
import React from 'react';
import { TabType, User } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout: () => void;
  currentUser: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, currentUser }) => {
  const menuItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'dashboard', label: '대시보드', icon: '📊' },
    { id: 'chat', label: '채팅', icon: '💬' },
    { id: 'draft', label: '결재 작성', icon: '✍️' },
    { id: 'documents', label: '결재문서함', icon: '📁' },
    { id: 'staff', label: '직원현황', icon: '👥' },
  ];

  if (currentUser?.role === 'ADMIN') {
    menuItems.push({ id: 'admin', label: '관리자 설정', icon: '⚙️' });
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col sticky top-0 z-40 flex-shrink-0">
      <div className="p-8">
        <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
          <span className="text-2xl">⚡</span> 리맨전자결재
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 translate-x-1' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all group"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">🚪</span>
          로그아웃
        </button>
        <div className="mt-4 px-4">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">
            Admin Console v1.3.0
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

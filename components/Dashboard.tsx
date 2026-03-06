
import React from 'react';
import { ApprovalDocument, ApprovalStatus, User } from '../types';

interface DashboardProps {
  documents: ApprovalDocument[];
  onSelectDoc: (doc: ApprovalDocument) => void;
  currentUser: User;
  onRecommendationClick: (templateId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ documents, onSelectDoc, currentUser, onRecommendationClick }) => {
  const stats = [
    { label: '기안한 문서', value: documents.filter(d => d.author.id === currentUser.id).length, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '승인완료', value: documents.filter(d => d.status === ApprovalStatus.APPROVED && d.author.id === currentUser.id).length, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '반려', value: documents.filter(d => d.status === ApprovalStatus.REJECTED && d.author.id === currentUser.id).length, color: 'text-red-600', bg: 'bg-red-50' },
    { label: '결재 대기중', value: documents.filter(doc => {
        const pendingStep = doc.approvalLine.find(l => l.status === 'PENDING');
        return pendingStep?.user.id === currentUser?.id;
      }).length, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const filteredDocuments = documents.filter(doc => 
    doc.author.id === currentUser.id || 
    doc.approvalLine.some(line => line.user.id === currentUser.id)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">안녕하세요, {currentUser.name} {currentUser.position}님 👋</h2>
        <p className="text-slate-500">실시간 결재 현황과 할 일을 확인하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`${stat.bg} p-6 rounded-2xl border border-white shadow-sm transition-transform hover:scale-[1.02]`}>
            <p className="text-sm font-medium text-slate-600">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">최근 결재 문서</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredDocuments.slice(0, 5).map((doc) => (
              <div 
                key={doc.id} 
                onClick={() => onSelectDoc(doc)}
                className="py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded-lg px-2 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl">
                    {doc.templateId === 't1' ? '💰' : doc.templateId === 't2' ? '🏖️' : doc.templateId === 't3' ? '✈️' : '📄'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{doc.title}</p>
                    <p className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString()} · 기안자: {doc.author.name}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  doc.status === ApprovalStatus.APPROVED ? 'bg-green-100 text-green-700' :
                  doc.status === ApprovalStatus.REJECTED ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {doc.status}
                </span>
              </div>
            ))}
            {filteredDocuments.length === 0 && <p className="text-center py-10 text-slate-400 italic">문서 기록이 없습니다.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span>🤖</span> 인공지능 추천 양식
          </h3>
          <div className="space-y-4">
            <div 
              onClick={() => onRecommendationClick('t2')}
              className="p-4 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-blue-700">연차 휴가 신청</p>
                <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <p className="text-xs text-blue-500 mt-1">곧 휴가 시즌입니다. 초안을 작성해보세요.</p>
            </div>
            
            <div 
              onClick={() => onRecommendationClick('t1')}
              className="p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">지출 결의서</p>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">이달의 경비 처리를 시작하세요.</p>
            </div>

            <div 
              onClick={() => onRecommendationClick('t4')}
              className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer hover:bg-indigo-100 hover:border-indigo-300 transition-all group active:scale-95"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-indigo-700">신규 사업 품의</p>
                <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <p className="text-xs text-indigo-500 mt-1">새로운 아이디어가 있으신가요?</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

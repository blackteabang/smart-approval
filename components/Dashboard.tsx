
import React, { useMemo } from 'react';
import { ApprovalDocument, ApprovalStatus, User, TabType } from '../types';

interface DashboardProps {
  documents: ApprovalDocument[];
  onSelectDoc: (doc: ApprovalDocument) => void;
  currentUser: User;
  onSelectTemplate: (templateId: string) => void;
  onNavigate: (tab: TabType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ documents, onSelectDoc, currentUser, onSelectTemplate, onNavigate }) => {
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

  // 간단한 AI 추천 로직 (부서 및 시기 기반)
  const recommendations = useMemo(() => {
    const recs = [];
    const month = new Date().getMonth() + 1;

    // 1. 시기별 추천
    if (month === 12 || month === 1) {
      recs.push({ id: 't2', title: '연차 휴가 신청', reason: '연말연시 휴가 계획을 세워보세요.', color: 'blue' });
    } else if (month === 3 || month === 4) {
      recs.push({ id: 't4', title: '품의서', reason: '새로운 분기 업무 계획 승인이 필요하신가요?', color: 'blue' });
    } else {
      recs.push({ id: 't2', title: '연차 휴가 신청', reason: '열심히 일한 당신, 휴식이 필요합니다.', color: 'blue' });
    }

    // 2. 부서별 추천
    if (currentUser.department.includes('영업') || currentUser.department.includes('마케팅')) {
      recs.push({ id: 't3', title: '출장 신청서', reason: '외부 미팅이나 출장이 잦은 부서입니다.', color: 'slate' });
    } else if (currentUser.department.includes('재무') || currentUser.department.includes('회계') || currentUser.department.includes('총무')) {
      recs.push({ id: 't1', title: '지출 결의서', reason: '비용 처리가 많은 부서입니다.', color: 'slate' });
    } else {
      recs.push({ id: 't4', title: '품의서', reason: '일반적인 업무 보고 및 승인을 위한 양식입니다.', color: 'slate' });
    }

    return recs;
  }, [currentUser]);

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
            <button 
              onClick={() => onNavigate('documents')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              전체보기 →
            </button>
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
                  doc.status === ApprovalStatus.WITHDRAWN ? 'bg-slate-100 text-slate-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {doc.status === ApprovalStatus.APPROVED ? '승인' : doc.status === ApprovalStatus.REJECTED ? '반려' : doc.status === ApprovalStatus.WITHDRAWN ? '회수' : '진행중'}
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
            {recommendations.map((rec, index) => (
              <div 
                key={index}
                onClick={() => onSelectTemplate(rec.id)}
                className={`p-4 bg-${rec.color}-50 rounded-xl border border-${rec.color}-100 cursor-pointer hover:bg-${rec.color}-100 hover:border-${rec.color}-300 transition-all group active:scale-95`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-bold text-${rec.color}-700`}>{rec.title}</p>
                  <span className={`text-${rec.color}-400 group-hover:translate-x-1 transition-transform`}>→</span>
                </div>
                <p className={`text-xs text-${rec.color}-500 mt-1`}>{rec.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


import React from 'react';
import { ApprovalDocument, ApprovalStatus, User } from '../types';

interface ApprovalDetailProps {
  doc: ApprovalDocument;
  currentUser: User;
  onProcessApproval: (docId: string, status: 'APPROVED' | 'REJECTED') => void;
  onClose: () => void;
}

const ApprovalDetail: React.FC<ApprovalDetailProps> = ({ doc, currentUser, onProcessApproval, onClose }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (data: string, name: string) => {
    const link = document.createElement('a');
    link.href = data;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeStep = doc.approvalLine?.find(line => line.status === 'PENDING');
  const isMyTurn = activeStep?.user?.id === currentUser.id && doc.status === ApprovalStatus.PENDING;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">문서번호: {doc.id}</span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{doc.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase">기안 정보</h3>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 overflow-hidden">
                  {doc.author?.avatar ? <img src={doc.author.avatar} alt="" /> : doc.author?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{doc.author?.name} {doc.author?.position}</p>
                  <p className="text-sm text-slate-500">{doc.author?.department} · {new Date(doc.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase">결재선 상태</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {doc.approvalLine?.map((line, idx) => (
                  <div key={line.id} className="relative flex flex-col items-center flex-shrink-0">
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-[10px] font-bold border-2 transition-all ${
                      line.status === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-700' :
                      line.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-700' :
                      line.role === 'AGREEMENT' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                      'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <span className="opacity-70 mb-1">{line.role === 'AGREEMENT' ? '합의' : '결재'}</span>
                      <span className="text-sm">{line.status === 'APPROVED' ? '승인' : line.status === 'REJECTED' ? '반려' : '대기'}</span>
                    </div>
                    <p className="text-xs font-bold mt-2 text-slate-900">{line.user?.name}</p>
                    <p className="text-[10px] text-slate-500">{line.user?.position}</p>
                    {doc.approvalLine && idx < doc.approvalLine.length - 1 && (
                      <div className="absolute top-7 -right-3 w-4 h-[2px] bg-slate-200" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase">본문 내용</h3>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 min-h-[200px] whitespace-pre-wrap leading-relaxed text-slate-800 shadow-inner">
              {doc.content}
            </div>
          </div>

          {doc.attachments?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase">첨부 파일 ({doc.attachments.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {doc.attachments.map((file) => (
                  <button 
                    key={file.id}
                    onClick={() => handleDownload(file.data, file.name)}
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all text-left"
                  >
                    <span className="text-2xl">📄</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                    <span className="ml-auto text-blue-500 text-lg">↓</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {doc.referenceUsers?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase">참조자</h3>
              <div className="flex flex-wrap gap-2">
                {doc.referenceUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                    <img src={user.avatar} alt="" className="w-5 h-5 rounded-full" />
                    <span className="text-xs font-medium text-slate-600">{user.name} {user.position} ({user.department})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          {isMyTurn ? (
            <>
              <button 
                onClick={() => onProcessApproval(doc.id, 'REJECTED')}
                className="px-6 py-2.5 bg-white border border-slate-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-sm"
              >
                반려하기
              </button>
              <button 
                onClick={() => onProcessApproval(doc.id, 'APPROVED')}
                className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                승인하기
              </button>
            </>
          ) : (
            <p className="mr-auto self-center text-sm font-medium text-slate-400 italic">
              {doc.status === ApprovalStatus.APPROVED ? '이미 승인 완료된 문서입니다.' : 
               doc.status === ApprovalStatus.REJECTED ? '반려된 문서입니다.' : 
               '현재 본인의 결재 순서가 아닙니다.'}
            </p>
          )}
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDetail;

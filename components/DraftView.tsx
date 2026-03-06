
import React, { useState, useRef, useEffect } from 'react';
import { TEMPLATES } from '../constants';
import { generateDocumentContent } from '../services/geminiService';
import { DocumentTemplate, User, ApprovalRole, Attachment } from '../types';
import UserPicker from './UserPicker';

interface DraftViewProps {
  onSubmit: (title: string, content: string, templateId: string, approvalLine: { user: User, role: ApprovalRole }[], referenceUsers: User[], attachments: Attachment[]) => void;
  users: User[];
  preSelectedTemplateId?: string | null;
}

const DraftView: React.FC<DraftViewProps> = ({ onSubmit, users, preSelectedTemplateId }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [approvalLine, setApprovalLine] = useState<{ user: User, role: ApprovalRole }[]>([]);
  const [referenceUsers, setReferenceUsers] = useState<User[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  const [pickerConfig, setPickerConfig] = useState<{ type: 'APPROVER' | 'AGREEMENT' | 'REFERENCE' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle pre-selection from Dashboard recommendations
  useEffect(() => {
    if (preSelectedTemplateId) {
      const template = TEMPLATES.find(t => t.id === preSelectedTemplateId);
      if (template) {
        setSelectedTemplate(template);
        setTitle(`[${template.name}] `);
      }
    } else {
      setSelectedTemplate(null);
      setTitle('');
    }
  }, [preSelectedTemplateId]);

  const handleAiAssist = async () => {
    if (!selectedTemplate) return;
    setIsGenerating(true);
    const aiContent = await generateDocumentContent(selectedTemplate.name, keywords);
    setContent(aiContent);
    setIsGenerating(false);
  };

  const removeFromLine = (userId: string) => {
    setApprovalLine(prev => prev.filter(item => item.user.id !== userId));
  };

  const removeReference = (userId: string) => {
    setReferenceUsers(prev => prev.filter(u => u.id !== userId));
  };

  const onUserSelected = (user: User) => {
    if (!pickerConfig) return;
    if (pickerConfig.type === 'REFERENCE') {
      setReferenceUsers(prev => [...prev, user]);
    } else {
      setApprovalLine(prev => [...prev, { user, role: pickerConfig.type as ApprovalRole }]);
    }
    setPickerConfig(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (attachments.length + files.length > 3) {
      alert("최대 3개의 파일까지만 첨부할 수 있습니다.");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newAttachment: Attachment = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          data: event.target?.result as string
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!selectedTemplate) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-slate-800">결재 양식 선택</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTemplate(t);
                setTitle(`[${t.name}] `);
              }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-left group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{t.icon}</div>
              <h3 className="font-bold text-slate-900 mb-1">{t.name}</h3>
              <p className="text-xs text-slate-500">{t.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden pb-12 animate-in fade-in zoom-in-95 duration-300">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedTemplate(null)}
            className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-800"
          >
            ←
          </button>
          <h2 className="text-lg font-bold text-slate-800">{selectedTemplate.name} 작성</h2>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white rounded-lg border border-slate-200">
            임시저장
          </button>
          <button 
            onClick={() => {
              const approvers = approvalLine.filter(l => l.role === 'APPROVER');
              if (approvers.length === 0) {
                alert('최소 1명 이상의 최종 결재자를 지정해야 합니다.');
                return;
              }
              if (!title.trim()) {
                alert('제목을 입력해주세요.');
                return;
              }
              onSubmit(title, content, selectedTemplate.id, approvalLine, referenceUsers, attachments);
            }}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-100 transition-all hover:-translate-y-0.5"
          >
            결재요청
          </button>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-[100px_1fr] items-center gap-4">
          <label className="text-sm font-bold text-slate-400 uppercase tracking-tight">문서 제목</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
          />
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <span className="text-sm font-bold text-blue-700">AI 기안 도우미</span>
            </div>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Powered by Gemini</span>
          </div>
          <div className="flex gap-3">
            <input 
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="예: 2024년 여름 휴가, 제주도 가족 여행"
              className="flex-1 text-sm px-4 py-3 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            />
            <button 
              onClick={handleAiAssist}
              disabled={isGenerating || !keywords}
              className={`px-6 py-3 text-sm font-bold rounded-xl transition-all ${
                isGenerating || !keywords 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
              }`}
            >
              {isGenerating ? '작성중...' : 'AI 초안 생성'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-400 uppercase tracking-tight block">결재 본문</label>
          <textarea 
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-6 py-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm leading-relaxed min-h-[300px]"
            placeholder="문서의 세부 내용을 입력하세요."
          />
        </div>

        <div className="pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-tight">첨부 파일 (최대 3개)</h3>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= 3}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${
                attachments.length >= 3 
                ? 'text-slate-300 border-slate-100 bg-slate-50 cursor-not-allowed' 
                : 'text-slate-600 hover:bg-slate-50 border-slate-200'
              }`}
            >
              📂 파일 선택
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
              multiple 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {attachments.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">📄</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeAttachment(file.id)}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-tight">결재선 (결재/합의)</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setPickerConfig({ type: 'AGREEMENT' })}
                className="text-xs font-bold text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors border border-amber-100"
              >
                + 합의자 추가
              </button>
              <button 
                onClick={() => setPickerConfig({ type: 'APPROVER' })}
                className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
              >
                + 결재자 추가
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center min-h-[60px] p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-bold">ME</div>
              <div>
                <p className="text-xs font-bold text-slate-900">기안</p>
                <p className="text-[10px] text-slate-500">본인</p>
              </div>
            </div>

            {approvalLine.length > 0 && <span className="text-slate-300 text-xl">→</span>}

            {approvalLine.map((item, index) => (
              <React.Fragment key={item.user.id}>
                <div className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm transition-all ${
                  item.role === 'AGREEMENT' ? 'bg-amber-50 border-amber-200' : 'bg-white border-blue-200'
                }`}>
                  <div className={`w-8 h-8 rounded-full ${item.role === 'AGREEMENT' ? 'bg-amber-200' : 'bg-blue-100'}`}>
                    <img src={item.user.avatar} alt="" className="w-full h-full rounded-full" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-slate-900">{item.user.name} {item.user.position}</p>
                      <span className={`text-[9px] px-1 rounded font-bold ${
                        item.role === 'AGREEMENT' ? 'bg-amber-200 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.role === 'AGREEMENT' ? '합의' : '결재'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{index + 1}차 단계</p>
                  </div>
                  <button 
                    onClick={() => removeFromLine(item.user.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    ✕
                  </button>
                </div>
                {index < approvalLine.length - 1 && <span className="text-slate-300 text-xl">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-tight">참조자</h3>
            <button 
              onClick={() => setPickerConfig({ type: 'REFERENCE' })}
              className="text-xs font-bold text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
            >
              + 참조자 추가
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center min-h-[50px] p-4 bg-slate-50/30 rounded-2xl border border-slate-100">
            {referenceUsers.map((user) => (
              <div key={user.id} className="group relative flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-slate-100">
                  <img src={user.avatar} alt="" className="w-full h-full rounded-full" />
                </div>
                <span className="text-xs font-medium text-slate-700">{user.name} {user.position}</span>
                <button 
                  onClick={() => removeReference(user.id)}
                  className="w-4 h-4 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-[10px] hover:bg-red-100 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {pickerConfig && (
        <UserPicker 
          onClose={() => setPickerConfig(null)} 
          onSelect={onUserSelected}
          users={users}
          excludeIds={[
            ...approvalLine.map(l => l.user.id),
            ...referenceUsers.map(u => u.id)
          ]}
        />
      )}
    </div>
  );
};

export default DraftView;

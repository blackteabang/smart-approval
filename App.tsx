import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DraftView from './components/DraftView';
import ApprovalDetail from './components/ApprovalDetail';
import AuthScreen from './components/AuthScreen';
import StaffStatus from './components/StaffStatus';
import ChatRoomList from './components/ChatRoomList';
import ChatRoomDetail from './components/ChatRoomDetail';
import AdminUserManagement from './components/AdminUserManagement';
import { TabType, ApprovalDocument, ApprovalStatus, User, ApprovalLine, ApprovalRole, Attachment, ChatRoom } from './types';
import { MOCK_DOCUMENTS, MOCK_USERS, TEMPLATES } from './constants';
import { getUsers, getDocuments, createDocument, updateDocumentStatus, saveUser, deleteUser } from './services/dbService';
import { formatUserNameWithPosition, positionIfNotDuplicated } from './utils/userDisplay';

const STORAGE_KEY_CHATS = 'smartapprove_chats';

/**
 * 애플리케이션 최상위 컴포넌트
 * - 상태 관리: 사용자, 문서, 채팅방, 탭 전환 등 전역 상태 관리
 * - 라우팅: 현재 선택된 탭(activeTab)에 따라 화면 렌더링
 * - 초기화: 로컬 저장소 또는 DB에서 초기 데이터 로드
 */
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mockUsers, setMockUsers] = useState<User[]>(MOCK_USERS);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeDocTab, setActiveDocTab] = useState<'drafts' | 'approvals' | 'references' | 'withdrawn' | 'all'>('approvals'); // 문서함 서브 탭
  const [documents, setDocuments] = useState<ApprovalDocument[]>(MOCK_DOCUMENTS);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CHATS);
    if (saved) return JSON.parse(saved);
    return [];
  });
  const [selectedDoc, setSelectedDoc] = useState<ApprovalDocument | null>(null);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [preSelectedTemplateId, setPreSelectedTemplateId] = useState<string | null>(null);
  const [staffEditUserId, setStaffEditUserId] = useState<string | null>(null);

  // 초기 데이터 로드 (DB 또는 LocalStorage)
  useEffect(() => {
    const loadData = async () => {
      const users = await getUsers();
      // 데이터가 없거나 데모 데이터가 누락된 경우 병합
      const hasMockData = users.some(u => u.id === 'u1');
      if (!hasMockData) {
        const existingIds = new Set(users.map(u => u.id));
        const missingMocks = MOCK_USERS.filter(m => !existingIds.has(m.id));
        setMockUsers([...users, ...missingMocks]);
      } else {
        setMockUsers(users.length > 0 ? users : MOCK_USERS);
      }
      
      const docs = await getDocuments();
      const resolvedDocs = docs.length > 0 ? docs : MOCK_DOCUMENTS;
      setDocuments(resolvedDocs);

      const urlDocId = new URLSearchParams(window.location.search).get('docId');
      if (urlDocId) {
        const found = resolvedDocs.find(d => d.id === urlDocId);
        if (found) {
          setSelectedDoc(found);
          const url = new URL(window.location.href);
          url.searchParams.delete('docId');
          window.history.replaceState({}, '', url.toString());
        }
      }
    };
    loadData();
  }, []);

  // 채팅 데이터 로컬 저장소 동기화
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chatRooms));
  }, [chatRooms]);

  /**
   * 채팅방 생성 또는 기존 채팅방 이동
   */
  const handleCreateChatRoom = (participants: User[], name?: string) => {
    if (!currentUser) return;
    
    // 1:1 채팅방 중복 확인
    if (participants.length === 2) {
      const otherUser = participants.find(p => p.id !== currentUser.id);
      const existingRoom = chatRooms.find(r => 
        r.participants.length === 2 && 
        r.participants.some(p => p.id === otherUser?.id) &&
        r.participants.some(p => p.id === currentUser.id)
      );
      
      if (existingRoom) {
        setActiveChatRoomId(existingRoom.id);
        setActiveTab('chat');
        return;
      }
    }

    const newRoom: ChatRoom = {
      id: `chat-${Date.now()}`,
      name: name || '새로운 채팅',
      participants,
      messages: [],
      createdAt: new Date().toISOString(),
      unreadCount: 0
    };

    setChatRooms(prev => [newRoom, ...prev]);
    setActiveChatRoomId(newRoom.id);
    setActiveTab('chat');
  };

  const ensureApprovalChatRoom = (doc: ApprovalDocument) => {
    const roomId = `docchat-${doc.id}`;
    const existing = chatRooms.find(r => r.id === roomId);
    if (existing) return existing.id;

    const participantMap = new Map<string, User>();
    participantMap.set(doc.author.id, doc.author);
    doc.approvalLine.forEach(line => participantMap.set(line.user.id, line.user));
    const participants = Array.from(participantMap.values());

    const createdAt = new Date().toISOString();
    const docLink = `${window.location.origin}${window.location.pathname}?docId=${encodeURIComponent(doc.id)}`;
    const systemMsg: any = {
      id: `msg-${Date.now()}`,
      senderId: 'system',
      content: `[${doc.title}] 의 기안이 작성되었습니다.\n${docLink}`,
      timestamp: createdAt,
      type: 'system'
    };

    const newRoom: ChatRoom = {
      id: roomId,
      name: `${doc.title} 결재 채팅`,
      participants,
      messages: [systemMsg],
      relatedDocId: doc.id,
      createdAt,
      lastMessage: systemMsg.content,
      lastMessageTime: createdAt,
      unreadCount: 0
    };

    setChatRooms(prev => [newRoom, ...prev]);
    return newRoom.id;
  };

  /**
   * 채팅 메시지 전송
   */
  const handleSendMessage = (roomId: string, content: string, type: 'text' | 'system' | 'file' | 'image', attachment?: Attachment) => {
    if (!currentUser) return;

    const newMessage: any = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      content,
      timestamp: new Date().toISOString(),
      type,
      attachment
    };

    setChatRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        messages: [...room.messages, newMessage],
        lastMessage: content,
        lastMessageTime: new Date().toISOString()
      };
    }));
  };

  const withdrawDocument = async (docId: string) => {
    if (!currentUser) return;
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    const canWithdraw =
      doc.author.id === currentUser.id &&
      doc.status === ApprovalStatus.PENDING &&
      doc.approvalLine.every(l => l.status === 'PENDING');
    if (!canWithdraw) {
      alert('첫 결재가 진행된 문서는 기안취소할 수 없습니다.');
      return;
    }
    const ok = window.confirm('기안취소 하시겠습니까?');
    if (!ok) return;
    await updateDocumentStatus(docId, ApprovalStatus.WITHDRAWN, doc.approvalLine);
    const docs = await getDocuments();
    setDocuments(docs);
  };

  /**
   * 채팅방 초대 처리
   */
  const handleInviteUser = (roomId: string, user: User) => {
    setChatRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      if (room.participants.some(p => p.id === user.id)) return room;
      
      const systemMsg: any = {
        id: `msg-${Date.now()}`,
        senderId: 'system',
        content: `${user.name}님이 초대되었습니다.`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };

      return {
        ...room,
        participants: [...room.participants, user],
        messages: [...room.messages, systemMsg]
      };
    }));
  };

  /**
   * 로그인 처리
   */
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  /**
   * 로그아웃 처리
   */
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleMyInfoEdit = () => {
    if (!currentUser) return;
    setIsProfileMenuOpen(false);
    setActiveTab('staff');
    setStaffEditUserId(currentUser.id);
  };

  /**
   * 회원가입 처리
   */
  const handleSignUp = async (newUser: User) => {
    await saveUser(newUser);
    const users = await getUsers();
    
    // 데모 데이터 병합 로직 적용
    const hasMockData = users.some(u => u.id === 'u1');
    if (!hasMockData) {
      const existingIds = new Set(users.map(u => u.id));
      const missingMocks = MOCK_USERS.filter(m => !existingIds.has(m.id));
      setMockUsers([...users, ...missingMocks]);
    } else {
      setMockUsers(users);
    }
    
    handleLogin(newUser);
  };

  /**
   * 결재 문서 생성 (기안)
   */
  const handleCreateDocument = async (doc: ApprovalDocument): Promise<boolean> => {
    const success = await createDocument(doc);
    if (success) {
      const docs = await getDocuments();
      setDocuments(docs);
      setActiveTab('documents');
      setActiveDocTab('drafts'); // 내가 쓴 문서함으로 이동
    }
    return success;
  };

  /**
   * 사용자 정보 업데이트
   */
  const handleUpdateUser = async (updatedUser: User) => {
    await saveUser(updatedUser);
    const users = await getUsers();
    setMockUsers(users);
    
    // 현재 로그인한 사용자 정보도 업데이트
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  /**
   * 사용자 삭제
   */
  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
    const users = await getUsers();
    setMockUsers(users);
  };

  // 로그인 전이면 인증 화면 표시
  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} mockUsers={mockUsers} onSignUp={handleSignUp} />;
  }

  // 문서 상세 보기 모드
  if (selectedDoc) {
    return (
      <ApprovalDetail 
        document={selectedDoc} 
        currentUser={currentUser}
        onClose={() => setSelectedDoc(null)}
        onApprove={async (docId, comment) => {
          // 승인 처리 로직
          const doc = documents.find(d => d.id === docId);
          if (!doc) return;

          const updatedLine = doc.approvalLine.map(line => {
            if (line.user.id === currentUser.id && line.status === 'PENDING') {
              return { ...line, status: 'APPROVED' as const, processedAt: new Date().toISOString(), comment };
            }
            return line;
          });

          // 모든 결재자가 승인했는지 확인
          const allApproved = updatedLine.every(line => line.status === 'APPROVED');
          const newStatus = allApproved ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING;

          await updateDocumentStatus(docId, newStatus, updatedLine);
          const docs = await getDocuments();
          setDocuments(docs);
          setSelectedDoc(null);
        }}
        onReject={async (docId, comment) => {
          // 반려 처리 로직
          const doc = documents.find(d => d.id === docId);
          if (!doc) return;

          const updatedLine = doc.approvalLine.map(line => {
            if (line.user.id === currentUser.id && line.status === 'PENDING') {
              return { ...line, status: 'REJECTED' as const, processedAt: new Date().toISOString(), comment };
            }
            return line;
          });

          await updateDocumentStatus(docId, ApprovalStatus.REJECTED, updatedLine);
          const docs = await getDocuments();
          setDocuments(docs);
          setSelectedDoc(null);
        }}
        onWithdraw={async (docId) => {
          if (!currentUser) return;
          const doc = documents.find(d => d.id === docId);
          if (!doc) return;
          const canWithdraw =
            doc.author.id === currentUser.id &&
            doc.status === ApprovalStatus.PENDING &&
            doc.approvalLine.every(l => l.status === 'PENDING');
          if (!canWithdraw) {
            alert('첫 결재가 진행된 문서는 기안취소할 수 없습니다.');
            return;
          }
          await updateDocumentStatus(docId, ApprovalStatus.WITHDRAWN, doc.approvalLine);
          const docs = await getDocuments();
          setDocuments(docs);
          setSelectedDoc(null);
        }}
      />
    );
  }

  const mobileNavItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'dashboard', label: '대시보드', icon: '📊' },
    { id: 'documents', label: '문서함', icon: '📁' },
    { id: 'draft', label: '작성', icon: '✍️' },
    { id: 'chat', label: '채팅', icon: '💬' },
    { id: 'staff', label: '직원', icon: '👥' }
  ];
  if (currentUser?.role === 'ADMIN') {
    mobileNavItems.push({ id: 'admin', label: '관리', icon: '⚙️' });
  }

  const contentClass =
    activeTab === 'chat'
      ? 'flex-1 min-h-0 overflow-hidden pb-16 md:pb-0'
      : 'flex-1 min-h-0 overflow-y-auto pb-24 md:pb-0';

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (tab !== 'draft') setPreSelectedTemplateId(null);
          setActiveTab(tab);
        }} 
        onLogout={handleLogout}
        currentUser={currentUser}
      />
      
      <main className="flex-1 p-4 md:p-8 md:h-screen h-[100dvh] flex flex-col overflow-hidden">
        <header className="mb-6 md:mb-8">
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-slate-800">
                {activeTab === 'dashboard' && '대시보드'}
                {activeTab === 'chat' && '채팅'}
                {activeTab === 'draft' && '전자결재 작성'}
                {activeTab === 'documents' && '전자결재 문서함'}
                {activeTab === 'staff' && '직원현황'}
                {activeTab === 'admin' && '관리자 설정'}
              </h2>
              <p className="hidden md:block text-slate-500 text-sm mt-1">
                오늘도 좋은 하루 되세요, <span className="font-bold text-blue-600">{formatUserNameWithPosition(currentUser)}님</span>!
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative">
               <button className="p-2 bg-white rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors relative">
                 🔔
                 <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
               </button>
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 md:gap-3 bg-white pl-2 pr-3 md:pr-4 py-1.5 rounded-full border border-slate-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
              >
                <img 
                  src={currentUser.avatar} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full bg-slate-200 object-cover"
                />
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-700">{currentUser.name}</div>
                  <div className="hidden md:block text-[10px] text-slate-400 font-medium">{currentUser.department}</div>
                </div>
                <span className="text-slate-300 text-xs">▼</span>
              </button>
              
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <button onClick={handleMyInfoEdit} className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 font-medium">내 정보 수정</button>
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 font-medium">환경설정</button>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 font-bold">로그아웃</button>
                </div>
              )}
            </div>
          </div>
          </div>
          <p className="md:hidden text-slate-500 text-xs mt-2">
            오늘도 좋은 하루 되세요, <span className="font-bold text-blue-600">{formatUserNameWithPosition(currentUser)}님</span>!
          </p>
        </header>

        <div className={contentClass}>
          {/* 탭별 컨텐츠 렌더링 */}
          {activeTab === 'dashboard' && (
            <Dashboard 
              currentUser={currentUser}
              documents={documents}
              onNavigate={(tab) => setActiveTab(tab)}
              onSelectDoc={(doc) => setSelectedDoc(doc)}
              onSelectTemplate={(templateId) => {
                setPreSelectedTemplateId(templateId);
                setActiveTab('draft');
              }}
            />
          )}

          {activeTab === 'draft' && (
            <DraftView 
              users={mockUsers}
              preSelectedTemplateId={preSelectedTemplateId}
              onSubmit={async (title, content, templateId, approvalLine, referenceUsers, attachments) => {
                if (!currentUser) return;

                const newDoc: ApprovalDocument = {
                  id: `doc-${Date.now()}`,
                  title,
                  templateId,
                  content,
                  author: currentUser,
                  status: ApprovalStatus.PENDING,
                  createdAt: new Date().toISOString(),
                  approvalLine: approvalLine.map((item, index) => ({
                    id: `line-${Date.now()}-${index}`,
                    user: item.user,
                    status: 'PENDING',
                    role: item.role
                  })),
                  referenceUsers,
                  attachments
                };

                const success = await handleCreateDocument(newDoc);
                if (success) {
                  ensureApprovalChatRoom(newDoc);
                }
                setPreSelectedTemplateId(null);
              }}
            />
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* 문서함 탭 */}
              <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl w-full overflow-x-auto whitespace-nowrap">
                <button 
                  onClick={() => setActiveDocTab('approvals')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                    activeDocTab === 'approvals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📥 결재대기문서
                </button>
                <button 
                  onClick={() => setActiveDocTab('drafts')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                    activeDocTab === 'drafts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📤 기안문서함
                </button>
                <button 
                  onClick={() => setActiveDocTab('references')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                    activeDocTab === 'references' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  👀 참조문서함
                </button>
                <button 
                  onClick={() => setActiveDocTab('withdrawn')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                    activeDocTab === 'withdrawn' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  🗂 회수문서함
                </button>
                {currentUser?.role === 'ADMIN' && (
                  <button 
                    onClick={() => setActiveDocTab('all')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                      activeDocTab === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🔐 전체 문서
                  </button>
                )}
              </div>

              {/* 문서 목록 */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="hidden md:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold">
                        <th className="p-4 w-20 text-center">상태</th>
                        <th className="p-4">제목</th>
                        <th className="p-4 w-32">기안자</th>
                        <th className="p-4 w-32">기안일</th>
                        <th className="p-4 w-24 text-center">결재진행</th>
                        <th className="p-4 w-28 text-center">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        let filteredDocs = [];

                        if (activeDocTab === 'approvals') {
                          filteredDocs = documents.filter(doc => 
                            doc.approvalLine.some(line => line.user.id === currentUser?.id)
                          );
                        } else if (activeDocTab === 'references') {
                          filteredDocs = documents.filter(d => 
                            d.referenceUsers.some(u => u.id === currentUser?.id)
                          );
                        } else if (activeDocTab === 'withdrawn') {
                          filteredDocs = documents.filter(d => d.status === ApprovalStatus.WITHDRAWN && d.author.id === currentUser?.id);
                        } else if (activeDocTab === 'all') {
                          filteredDocs = documents;
                        } else {
                          filteredDocs = documents.filter(d => d.author.id === currentUser?.id && d.status !== ApprovalStatus.WITHDRAWN);
                        }

                        if (filteredDocs.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                                문서가 없습니다.
                              </td>
                            </tr>
                          );
                        }

                        return filteredDocs.map(doc => (
                          <tr 
                            key={doc.id} 
                            onClick={() => setSelectedDoc(doc)}
                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                          >
                            <td className="p-4 text-center">
                              <span className={`
                                px-2 py-1 rounded-md text-[10px] font-bold border
                                ${doc.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-100' : 
                                  doc.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 
                                  doc.status === 'WITHDRAWN' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                  'bg-yellow-50 text-yellow-600 border-yellow-100'}
                              `}>
                                {doc.status === 'APPROVED' ? '승인완료' : doc.status === 'REJECTED' ? '반려됨' : doc.status === 'WITHDRAWN' ? '회수' : '진행중'}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                              {doc.title}
                            </td>
                          <td className="p-4 text-sm text-slate-600">
                            {doc.author.name}
                            {positionIfNotDuplicated(doc.author) ? (
                              <span className="text-xs text-slate-400"> {positionIfNotDuplicated(doc.author)}</span>
                            ) : null}
                          </td>
                            <td className="p-4 text-sm text-slate-500">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center -space-x-2">
                                {doc.approvalLine.map((line, i) => (
                                  <div 
                                    key={i} 
                                    className={`
                                      w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold
                                      ${line.status === 'APPROVED' ? 'bg-green-500' : line.status === 'REJECTED' ? 'bg-red-500' : 'bg-slate-300'}
                                    `}
                                    title={`${line.user.name} (${line.status})`}
                                  >
                                    {line.user.name[0]}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              {(() => {
                                const canWithdraw =
                                  doc.author.id === currentUser?.id &&
                                  doc.status === ApprovalStatus.PENDING &&
                                  doc.approvalLine.every(l => l.status === 'PENDING');
                                if (!canWithdraw) return null;
                                return (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); withdrawDocument(doc.id); }}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                  >
                                    기안취소
                                  </button>
                                );
                              })()}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-slate-100">
                  {(() => {
                    let filteredDocs = [];

                    if (activeDocTab === 'approvals') {
                      filteredDocs = documents.filter(doc => 
                        doc.approvalLine.some(line => line.user.id === currentUser?.id)
                      );
                    } else if (activeDocTab === 'references') {
                      filteredDocs = documents.filter(d => 
                        d.referenceUsers.some(u => u.id === currentUser?.id)
                      );
                    } else if (activeDocTab === 'withdrawn') {
                      filteredDocs = documents.filter(d => d.status === ApprovalStatus.WITHDRAWN && d.author.id === currentUser?.id);
                    } else if (activeDocTab === 'all') {
                      filteredDocs = documents;
                    } else {
                      filteredDocs = documents.filter(d => d.author.id === currentUser?.id && d.status !== ApprovalStatus.WITHDRAWN);
                    }

                    if (filteredDocs.length === 0) {
                      return (
                        <div className="p-10 text-center text-slate-400 font-medium">
                          문서가 없습니다.
                        </div>
                      );
                    }

                    return filteredDocs.map(doc => {
                      const canWithdraw =
                        doc.author.id === currentUser?.id &&
                        doc.status === ApprovalStatus.PENDING &&
                        doc.approvalLine.every(l => l.status === 'PENDING');

                      return (
                        <button
                          key={doc.id}
                          onClick={() => setSelectedDoc(doc)}
                          className="w-full text-left p-4 active:bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`
                                  px-2 py-0.5 rounded-md text-[10px] font-bold border
                                  ${doc.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-100' : 
                                    doc.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 
                                    doc.status === 'WITHDRAWN' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                    'bg-yellow-50 text-yellow-600 border-yellow-100'}
                                `}>
                                  {doc.status === 'APPROVED' ? '승인완료' : doc.status === 'REJECTED' ? '반려됨' : doc.status === 'WITHDRAWN' ? '회수' : '진행중'}
                                </span>
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="font-bold text-slate-800 truncate">
                                {doc.title}
                              </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {formatUserNameWithPosition(doc.author)}
                            </div>
                            </div>

                            {canWithdraw && (
                              <button
                                onClick={(e) => { e.stopPropagation(); withdrawDocument(doc.id); }}
                                className="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                              >
                                기안취소
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex -space-x-2">
                              {doc.approvalLine.slice(0, 6).map((line, i) => (
                                <div 
                                  key={i} 
                                  className={`
                                    w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold
                                    ${line.status === 'APPROVED' ? 'bg-green-500' : line.status === 'REJECTED' ? 'bg-red-500' : 'bg-slate-300'}
                                  `}
                                  title={`${line.user.name} (${line.status})`}
                                >
                                  {line.user.name[0]}
                                </div>
                              ))}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {doc.approvalLine.filter(l => l.status === 'APPROVED').length}/{doc.approvalLine.length}
                            </div>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <StaffStatus 
              users={mockUsers} 
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              currentUser={currentUser!}
              onStartChat={(user) => handleCreateChatRoom([user, currentUser!])}
              editUserId={staffEditUserId}
              onEditUserIdConsumed={() => setStaffEditUserId(null)}
            />
          )}
          
          {activeTab === 'chat' && (
            <div className="h-full min-h-0 flex flex-col md:flex-row gap-6">
              <div className={`${activeChatRoomId ? 'hidden md:block' : 'block'} md:block h-full`}>
                <ChatRoomList 
                  currentUser={currentUser!}
                  chatRooms={chatRooms}
                  activeRoomId={activeChatRoomId}
                  onSelectRoom={setActiveChatRoomId}
                  users={mockUsers}
                  onCreateRoom={handleCreateChatRoom}
                />
              </div>

              {activeChatRoomId && chatRooms.find(r => r.id === activeChatRoomId) ? (
                <ChatRoomDetail
                  currentUser={currentUser!}
                  users={mockUsers}
                  room={chatRooms.find(r => r.id === activeChatRoomId)!}
                  onSendMessage={handleSendMessage}
                  onInviteUser={handleInviteUser}
                  onClose={() => setActiveChatRoomId(null)}
                />
              ) : (
                <div className="hidden md:flex flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm items-center justify-center text-slate-400">
                  채팅방을 선택하세요
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin' && (
            <AdminUserManagement />
          )}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className={`grid ${mobileNavItems.length > 5 ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {mobileNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id !== 'draft') setPreSelectedTemplateId(null);
                setActiveTab(item.id);
              }}
              className={`py-2 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${
                activeTab === item.id ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="truncate w-full text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;

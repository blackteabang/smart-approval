import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DraftView from './components/DraftView';
import ApprovalDetail from './components/ApprovalDetail';
import AuthScreen from './components/AuthScreen';
import StaffStatus from './components/StaffStatus';
import ChatRoomList from './components/ChatRoomList';
import ChatRoomDetail from './components/ChatRoomDetail';
import { TabType, ApprovalDocument, ApprovalStatus, User, ApprovalLine, ApprovalRole, Attachment, ChatRoom } from './types';
import { MOCK_DOCUMENTS, MOCK_USERS, TEMPLATES } from './constants';
import { getUsers, getDocuments, createDocument, updateDocumentStatus, saveUser, deleteUser } from './services/dbService';

const STORAGE_KEY_CHATS = 'smartapprove_chats';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mockUsers, setMockUsers] = useState<User[]>(MOCK_USERS);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeDocTab, setActiveDocTab] = useState<'drafts' | 'approvals' | 'references'>('approvals'); // Sub-tab for documents
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

  // Load initial data from DB or LocalStorage
  useEffect(() => {
    const loadData = async () => {
      const users = await getUsers();
      setMockUsers(users.length > 0 ? users : MOCK_USERS);
      
      const docs = await getDocuments();
      setDocuments(docs.length > 0 ? docs : MOCK_DOCUMENTS);
    };
    loadData();
  }, []);

  // Persistence Sync: Save chats (Local only for now)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chatRooms));
  }, [chatRooms]);

  const handleCreateChatRoom = (participants: User[], name?: string) => {
    if (!currentUser) return;
    
    // Check if 1:1 room exists
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
        lastMessageTime: newMessage.timestamp
      };
    }));
  };

  const handleInviteUser = (roomId: string, user: User) => {
    setChatRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      
      const updatedParticipants = [...room.participants, user];
      const systemMessage: any = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        content: `${user.name}님이 초대되었습니다.`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };

      // Rename room if it's becoming a group chat
      let newName = room.name;
      if (updatedParticipants.length > 2 && !room.name.includes('외')) {
        newName = `${updatedParticipants[0].name} 외 ${updatedParticipants.length - 1}명`;
      }

      return {
        ...room,
        participants: updatedParticipants,
        name: newName,
        messages: [...room.messages, systemMessage]
      };
    }));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
    setIsProfileMenuOpen(false);
  };

  const handleSignUp = async (newUser: User) => {
    await saveUser(newUser);
    setMockUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    setActiveTab('dashboard');
    setIsProfileMenuOpen(false);
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      setCurrentUser(null);
      setActiveTab('dashboard');
      setIsProfileMenuOpen(false);
      setPreSelectedTemplateId(null);
    }
  };

  const handleRecommendationClick = (templateId: string) => {
    setPreSelectedTemplateId(templateId);
    setActiveTab('draft');
  };

  const handleNewRequest = async (
    title: string, 
    content: string, 
    templateId: string, 
    lineItems: { user: User, role: ApprovalRole }[], 
    references: User[],
    attachments: Attachment[]
  ) => {
    if (!currentUser) return;

    const approvalLine: ApprovalLine[] = lineItems.map((item, idx) => ({
      id: `al-${Date.now()}-${item.user.id}-${idx}`,
      user: item.user,
      status: 'PENDING',
      role: item.role
    }));

    const newDoc: ApprovalDocument = {
      id: `APP-${Math.floor(Math.random() * 100000)}`,
      title,
      content,
      templateId,
      author: currentUser,
      status: ApprovalStatus.PENDING,
      createdAt: new Date().toISOString(),
      approvalLine,
      referenceUsers: references,
      attachments: attachments
    };
    
    const success = await createDocument(newDoc);
    if (success) {
      setDocuments(prev => [newDoc, ...prev]);
      setActiveTab('documents');
      setActiveDocTab('drafts');
      setPreSelectedTemplateId(null);
    } else {
      alert('문서 저장에 실패했습니다.');
    }
  };

  const handleProcessApproval = async (docId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!currentUser) return;

    // Optimistic UI update
    let updatedApprovalLine: ApprovalLine[] = [];
    let newDocStatus = '';

    setDocuments(prevDocs => prevDocs.map(doc => {
      if (doc.id !== docId) return doc;

      const updatedLine = [...doc.approvalLine];
      const userStepIndex = updatedLine.findIndex(line => line.user.id === currentUser.id && line.status === 'PENDING');
      
      if (userStepIndex === -1) return doc;

      updatedLine[userStepIndex] = {
        ...updatedLine[userStepIndex],
        status: status,
        processedAt: new Date().toISOString()
      };

      newDocStatus = doc.status;
      if (status === 'REJECTED') {
        newDocStatus = ApprovalStatus.REJECTED;
      } else {
        const isLastStep = updatedLine.every(line => line.status === 'APPROVED');
        if (isLastStep) {
          newDocStatus = ApprovalStatus.APPROVED;
        }
      }

      updatedApprovalLine = updatedLine;
      const updatedDoc = { ...doc, approvalLine: updatedLine, status: newDocStatus as ApprovalStatus };
      if (selectedDoc?.id === docId) {
        setSelectedDoc(updatedDoc);
      }
      return updatedDoc;
    }));

    if (updatedApprovalLine.length > 0) {
      await updateDocumentStatus(docId, newDocStatus, updatedApprovalLine);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    await saveUser(updatedUser);
    setMockUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      await deleteUser(userId);
      setMockUsers(prev => prev.filter(u => u.id !== userId));
      if (currentUser?.id === userId) {
        handleLogout();
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            documents={documents} 
            onSelectDoc={setSelectedDoc} 
            currentUser={currentUser!}
            onRecommendationClick={handleRecommendationClick}
          />
        );
      case 'draft':
        return (
          <DraftView 
            onSubmit={handleNewRequest} 
            users={mockUsers} 
            preSelectedTemplateId={preSelectedTemplateId} 
          />
        );
      case 'staff':
        return (
          <StaffStatus 
            users={mockUsers} 
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            currentUser={currentUser!}
            onStartChat={(user) => handleCreateChatRoom([user, currentUser!])}
          />
        );
      case 'chat':
        return (
          <div className="flex h-full bg-white border-l border-slate-200 overflow-hidden shadow-sm">
            <ChatRoomList 
              currentUser={currentUser!} 
              users={mockUsers}
              chatRooms={chatRooms.filter(r => r.participants.some(p => p.id === currentUser?.id))}
              onSelectRoom={setActiveChatRoomId}
              onCreateRoom={handleCreateChatRoom}
              activeRoomId={activeChatRoomId || undefined}
            />
            {activeChatRoomId ? (
              <ChatRoomDetail 
                currentUser={currentUser!}
                users={mockUsers}
                room={chatRooms.find(r => r.id === activeChatRoomId)!}
                onSendMessage={(roomId, content, type, attachment) => handleSendMessage(roomId, content, type, attachment)}
                onInviteUser={handleInviteUser}
                onClose={() => setActiveChatRoomId(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                <span className="text-6xl mb-4">💬</span>
                <p>채팅방을 선택하거나 새로운 대화를 시작하세요.</p>
              </div>
            )}
          </div>
        );
      case 'documents':
        let filteredDocs: ApprovalDocument[] = [];
        let titleText = '';

        if (activeDocTab === 'approvals') {
          titleText = '결재문서함';
          filteredDocs = documents.filter(doc => 
            doc.approvalLine.some(line => line.user.id === currentUser?.id)
          );
        } else if (activeDocTab === 'references') {
          titleText = '참조문서함';
          filteredDocs = documents.filter(d => 
            d.referenceUsers.some(u => u.id === currentUser?.id)
          );
        } else {
          titleText = '기안문서함';
          filteredDocs = documents.filter(d => d.author.id === currentUser?.id);
        }

        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm min-h-[500px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl font-bold text-slate-800">{titleText}</h2>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button 
                  onClick={() => setActiveDocTab('drafts')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                    activeDocTab === 'drafts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📤 기안문서함
                </button>
                <button 
                  onClick={() => setActiveDocTab('approvals')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                    activeDocTab === 'approvals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📥 결재문서함
                </button>
                <button 
                  onClick={() => setActiveDocTab('references')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                    activeDocTab === 'references' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  👀 참조문서함
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <div 
                  key={doc.id} 
                  onClick={() => setSelectedDoc(doc)}
                  className={`py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer px-4 rounded-xl transition-all hover:pl-6 mb-2 ${
                    // Highlight if it's my turn to approve
                    activeDocTab === 'approvals' && doc.approvalLine.find(l => l.status === 'PENDING')?.user.id === currentUser?.id 
                      ? 'border-l-4 border-l-blue-500 bg-blue-50/30' 
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shadow-sm border border-slate-100">
                      {TEMPLATES.find(t => t.id === doc.templateId)?.icon || '📄'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{doc.title}</p>
                      <p className="text-sm text-slate-500">{new Date(doc.createdAt).toLocaleDateString()} · 기안자: {doc.author.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Show "Waiting" badge only in My Approvals if it's my turn */}
                    {activeDocTab === 'approvals' && doc.approvalLine.find(l => l.status === 'PENDING')?.user.id === currentUser?.id && (
                       <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold animate-pulse">
                        결재 대기
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                      doc.status === ApprovalStatus.APPROVED ? 'bg-green-100 text-green-700' :
                      doc.status === ApprovalStatus.REJECTED ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
              {filteredDocs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <span className="text-4xl mb-4">📂</span>
                  <p>문서가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <div>준비 중입니다.</div>;
    }
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} onSignUp={handleSignUp} mockUsers={mockUsers} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-900 relative">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (tab !== 'draft') setPreSelectedTemplateId(null);
          setActiveTab(tab);
        }} 
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-end z-30 flex-shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
              <span className="text-lg">🔔</span>
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {documents.filter(doc => {
                  const pendingStep = doc.approvalLine.find(l => l.status === 'PENDING');
                  return pendingStep?.user.id === currentUser?.id;
                }).length}
              </span>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-200" />
            
            <div className="relative">
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-3 cursor-pointer group hover:bg-slate-100/50 p-1 pr-3 rounded-full transition-all"
              >
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{currentUser.name} {currentUser.position}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{currentUser.department}</p>
                </div>
                <img 
                  src={currentUser.avatar} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full border-2 border-white shadow-md group-hover:scale-105 transition-transform"
                />
              </div>

              {isProfileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-black/5" 
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-3 w-64 bg-white border border-slate-200 shadow-2xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">Signed in as</p>
                      <p className="text-sm font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-500">{currentUser.phone}</p>
                    </div>
                    <div className="py-2">
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <span className="text-lg">🚪</span>
                        시스템 로그아웃
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto ${activeTab === 'chat' ? 'p-0 overflow-hidden' : 'p-8'}`}>
          <div className={`${activeTab === 'chat' ? 'h-full' : 'max-w-7xl mx-auto'}`}>
            {renderContent()}
          </div>
        </main>
      </div>

      {selectedDoc && (
        <ApprovalDetail 
          doc={selectedDoc} 
          currentUser={currentUser}
          onProcessApproval={handleProcessApproval}
          onClose={() => setSelectedDoc(null)} 
        />
      )}
    </div>
  );
};

export default App;

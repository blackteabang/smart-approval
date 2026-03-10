import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getUsers, saveUser, deleteUser, resetToMockData } from '../services/dbService';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiSave, FiX, FiKey, FiSettings, FiUsers } from 'react-icons/fi';

import { MOCK_USERS } from '../constants';

/**
 * 관리자용 직원 관리 및 시스템 설정 페이지 컴포넌트
 * - 직원 관리 탭: 직원 목록 조회 (부서별 트리 구조), 추가, 수정, 삭제, 비밀번호 초기화
 * - 시스템 설정 탭: AI API Key 설정 등
 */
const AdminUserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [aiKey, setAiKey] = useState('');
  
  // 폼 상태 관리
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    position: '',
    department: '',
    phone: '',
    role: 'USER',
    password: 'password123' // 기본 비밀번호
  });

  /**
   * 사용자 목록 및 설정 불러오기
   */
  const fetchUsers = async () => {
    setLoading(true);
    const data = await getUsers();
    setUsers(data);
    
    // AI Key 로드 (로컬 스토리지)
    const savedKey = localStorage.getItem('smartapprove_ai_key');
    if (savedKey) setAiKey(savedKey);
    
    setLoading(false);
  };

  /**
   * AI Key 저장 핸들러
   */
  const handleSaveAiKey = () => {
    localStorage.setItem('smartapprove_ai_key', aiKey);
    alert('AI 설정이 저장되었습니다.');
  };

  /**
   * 데이터 초기화 핸들러 (데모 데이터로 복구)
   */
  const handleInitializeData = async () => {
    if (confirm('모든 데이터를 초기화하고 기본 데이터를 복구하시겠습니까?')) {
      await resetToMockData();
      await fetchUsers();
      alert('데이터가 초기화되었습니다.');
    }
  };

  /**
   * 데모 데이터 로드 핸들러 (데이터가 없을 때 사용)
   */
  const handleLoadDemoData = async () => {
    await resetToMockData();
    await fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /**
   * 모달 열기 핸들러 (추가/수정 공용)
   */
  const handleOpenModal = (user?: User) => {
    if (user) {
      // 수정 모드
      setEditingUser(user);
      setFormData({ ...user });
    } else {
      // 추가 모드
      setEditingUser(null);
      setFormData({
        name: '',
        position: '',
        department: '',
        phone: '',
        role: 'USER',
        password: 'password123',
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  /**
   * 폼 제출 핸들러 (저장)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const userToSave: User = {
      id: editingUser ? editingUser.id : `u${Date.now()}`,
      name: formData.name || '',
      position: formData.position || '',
      department: formData.department || '',
      phone: formData.phone || '',
      role: formData.role as 'ADMIN' | 'USER',
      password: formData.password || editingUser?.password,
      avatar: formData.avatar || editingUser?.avatar || `https://i.pravatar.cc/150?u=${Date.now()}`
    };

    await saveUser(userToSave);
    await fetchUsers();
    handleCloseModal();
  };

  /**
   * 사용자 삭제 핸들러
   */
  const handleDelete = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteUser(id);
      await fetchUsers();
    }
  };

  /**
   * 비밀번호 초기화 핸들러
   */
  const handleResetPassword = async (user: User) => {
    const newPassword = window.prompt('새로운 비밀번호를 입력하세요:', 'password123');
    if (newPassword) {
      await saveUser({ ...user, password: newPassword });
      alert('비밀번호가 변경되었습니다.');
      await fetchUsers();
    }
  };

  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // 부서 목록 추출
  const departments = Array.from(new Set(users.map(u => u.department))).sort();
  
  // 선택된 부서에 따라 사용자 필터링
  const filteredUsers = selectedDept 
    ? users.filter(u => u.department === selectedDept)
    : users;

  // 트리 노드 컴포넌트 (부서 표시용)
  const DeptTreeNode = ({ dept, isSelected, onClick }: { dept: string, isSelected: boolean, onClick: () => void }) => {
    const count = users.filter(u => u.department === dept).length;
    return (
      <div 
        onClick={onClick}
        className={`
          flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all mb-1
          ${isSelected ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}
        `}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg opacity-70">📂</span>
          <span className="text-sm">{dept}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
          {count}
        </span>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center">로딩 중...</div>;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-6">
      {/* 상단 탭 메뉴 */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FiUsers /> 직원 관리
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FiSettings /> 시스템 설정
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* 좌측: 부서별 조직도 트리 */}
          <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span>🌳</span> 조직도
              </h3>
            </div>
            <div className="p-3 overflow-y-auto flex-1">
              <div 
                onClick={() => setSelectedDept(null)}
                className={`
                  flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all mb-1
                  ${selectedDept === null ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🏢</span>
                  <span className="text-sm">전체 조직</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedDept === null ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                  {users.length}
                </span>
              </div>
              
              <div className="mt-2 pl-4 border-l-2 border-slate-100 ml-4 space-y-0.5">
                {departments.map(dept => (
                  <DeptTreeNode 
                    key={dept} 
                    dept={dept} 
                    isSelected={selectedDept === dept} 
                    onClick={() => setSelectedDept(dept)} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 우측: 직원 목록 및 관리 액션 */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="text-2xl font-bold text-gray-800">{selectedDept || '전체 직원'} 관리</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleInitializeData}
                  className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-200 transition-colors text-sm font-bold"
                  title="데이터 초기화"
                >
                  <FiRefreshCw /> 초기화
                </button>
                <button
                  onClick={() => handleOpenModal()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                >
                  <FiPlus /> 직원 추가
                </button>
              </div>
            </div>

            {users.length <= 1 ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <span className="text-6xl mb-4">👥</span>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">등록된 직원이 없습니다</h2>
                <p className="text-slate-500 mb-8">새로운 직원을 등록하거나 데모 데이터를 불러오세요.</p>
                <div className="flex gap-4">
                  <button
                    onClick={handleLoadDemoData}
                    className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                  >
                    <FiRefreshCw /> 데모 직원 불러오기
                  </button>
                  <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center gap-2"
                  >
                    <FiPlus /> 직접 추가하기
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-auto flex-1 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="group relative p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all bg-white">
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={() => handleResetPassword(user)} className="p-1.5 bg-white text-yellow-600 hover:text-yellow-900 border border-slate-200 rounded-lg shadow-sm hover:shadow" title="비밀번호 초기화">
                          <FiKey size={16} />
                        </button>
                        <button onClick={() => handleOpenModal(user)} className="p-1.5 bg-white text-indigo-600 hover:text-indigo-900 border border-slate-200 rounded-lg shadow-sm hover:shadow" title="수정">
                          <FiEdit2 size={16} />
                        </button>
                        {user.id !== 'admin' && (
                          <button onClick={() => handleDelete(user.id)} className="p-1.5 bg-white text-red-600 hover:text-red-900 border border-slate-200 rounded-lg shadow-sm hover:shadow" title="삭제">
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <img className="h-14 w-14 rounded-full border-2 border-slate-50" src={user.avatar} alt="" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-base font-bold text-gray-900 truncate">{user.name}</div>
                            <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>
                              {user.role === 'ADMIN' ? '관리자' : '직원'}
                            </span>
                          </div>
                          <div className="text-sm text-blue-600 font-medium">{user.department} {user.position}</div>
                          <div className="text-xs text-gray-400 mt-1">{user.phone}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-3xl">🤖</span> AI 기능 설정
          </h2>
          
          <div className="max-w-2xl space-y-8">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
              <h3 className="font-bold text-blue-800 mb-2">OpenAI API 설정</h3>
              <p className="text-sm text-blue-600 mb-4">
                AI 기능을 사용하기 위해 OpenAI API Key가 필요합니다. 입력된 키는 브라우저에만 안전하게 저장됩니다.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    * 키는 'sk-'로 시작하는 문자열입니다. 
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">
                      키 발급받기
                    </a>
                  </p>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveAiKey}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center gap-2"
                  >
                    <FiSave /> 설정 저장
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="font-bold text-slate-800 mb-4">기타 설정</h3>
              <div className="space-y-4 opacity-50 pointer-events-none">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                  <div>
                    <div className="font-bold text-slate-700">시스템 알림</div>
                    <div className="text-xs text-slate-500">주요 이벤트 발생 시 알림을 받습니다.</div>
                  </div>
                  <div className="w-10 h-6 bg-slate-200 rounded-full relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                  <div>
                    <div className="font-bold text-slate-700">다크 모드</div>
                    <div className="text-xs text-slate-500">어두운 테마를 사용합니다.</div>
                  </div>
                  <div className="w-10 h-6 bg-slate-200 rounded-full relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">* 기타 설정은 준비 중입니다.</p>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingUser ? '직원 정보 수정' : '새 직원 추가'}</h3>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">이름</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">직급</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">부서</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">연락처</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">권한</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'USER' })}
                >
                  <option value="USER">일반 사용자</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">비밀번호</label>
                  <input
                    type="password"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              )}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;

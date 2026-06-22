import React, { useEffect, useState } from 'react';
import { User } from '../types';

interface StaffStatusProps {
  users: User[];
  currentUser: User;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onStartChat: (user: User) => void;
  editUserId?: string | null;
  onEditUserIdConsumed?: () => void;
}

interface EditUserModalProps {
  user: User;
  currentUser: User;
  onClose: () => void;
  onSave: (user: User) => void;
  onDelete?: (userId: string) => void;
}

/**
 * 직원 정보 수정 모달 컴포넌트
 */
const EditUserModal: React.FC<EditUserModalProps> = ({ user, currentUser, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    position: user.position,
    department: user.department,
    phone: user.phone,
    password: '',
    joinDate: user.joinDate ? user.joinDate.substring(0, 10) : '',
    status: user.status || 'ACTIVE',
    avatar: user.avatar || '',
    signature: user.signature || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  /**
   * 수정 사항 저장 핸들러
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 비밀번호가 변경된 경우에만 포함 (필드가 존재하는 경우)
    const updatedUser = { ...user, ...formData };
    if (!formData.password) {
      delete updatedUser.password;
    }
    onSave(updatedUser);
  };

  /**
   * 비밀번호 초기화 핸들러 (관리자 전용)
   */
  const handleResetPassword = () => {
    if (confirm('비밀번호를 초기화 하시겠습니까? 초기 비밀번호는 "1234" 입니다.')) {
      onSave({ ...user, password: '1234' });
      alert('비밀번호가 "1234"로 초기화 되었습니다.');
      onClose();
    }
  };

  /**
   * 사용자 퇴사처리 핸들러 (관리자 전용)
   */
  const handleRetire = () => {
    if (confirm(`${user.name} 직원을 퇴사 처리하시겠습니까?`)) {
      onSave({
        ...user,
        ...formData,
        status: 'RETIRED'
      });
      onClose();
    }
  };

  /**
   * 사용자 삭제 핸들러 (관리자 전용)
   */
  const handleDeleteClick = () => {
    if (confirm(`${user.name} 직원을 정말 삭제하시겠습니까?`)) {
      if (onDelete) {
        onDelete(user.id);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">직원 정보 수정</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold text-slate-500 uppercase">이름</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full mt-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            
            {/* 사진 선택 */}
            <div className="flex flex-col items-center">
              <label htmlFor="staff-avatar-upload" className="cursor-pointer flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center hover:border-blue-500 transition-colors">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-450">사진</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">사진 선택</span>
              </label>
              <input
                type="file"
                id="staff-avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'avatar')}
              />
            </div>

            {/* 서명 선택 */}
            <div className="flex flex-col items-center">
              <label htmlFor="staff-signature-upload" className="cursor-pointer flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center hover:border-blue-500 transition-colors">
                  {formData.signature ? (
                    <img src={formData.signature} alt="Signature" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-450">서명</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">서명 선택</span>
              </label>
              <input
                type="file"
                id="staff-signature-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'signature')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">부서</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full mt-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">직급</label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full mt-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
              >
                <option>사원</option>
                <option>대리</option>
                <option>과장</option>
                <option>차장</option>
                <option>부장</option>
                <option>이사</option>
                <option>상무</option>
                <option>대표이사</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">연락처</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full mt-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">입사일</label>
              <input
                type="date"
                name="joinDate"
                value={formData.joinDate}
                onChange={handleChange}
                className="w-full mt-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          {/* 비밀번호 변경 필드 */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              {currentUser.role === 'ADMIN' ? '비밀번호 관리' : '비밀번호 변경'}
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="password"
                name="password"
                placeholder="새 비밀번호 입력"
                value={formData.password}
                onChange={handleChange}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {currentUser.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * 변경할 경우에만 입력하세요. {currentUser.role === 'ADMIN' && '초기화 시 "1234"로 설정됩니다.'}
            </p>
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * 직원 현황 및 조직도 컴포넌트
 */
const StaffStatus: React.FC<StaffStatusProps> = ({ users, currentUser, onUpdateUser, onDeleteUser, onStartChat, editUserId, onEditUserIdConsumed }) => {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (!editUserId) return;
    const target = users.find(u => u.id === editUserId);
    if (!target) {
      onEditUserIdConsumed?.();
      return;
    }
    setSelectedDept(target.department);
    setEditingUser(target);
    onEditUserIdConsumed?.();
  }, [editUserId, users, onEditUserIdConsumed]);

  // 부서 목록 추출
  const departments = Array.from(new Set(users.map(u => u.department))).sort();
  
  // 선택된 부서에 따라 필터링
  const filteredUsers = selectedDept 
    ? users.filter(u => u.department === selectedDept)
    : users;

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-[calc(100vh-100px)]">
      {/* 좌측: 조직도 트리 */}
      <div className="w-full md:w-72 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
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
            {departments.map(dept => {
              const count = users.filter(u => u.department === dept).length;
              const isSelected = selectedDept === dept;
              
              return (
                <div 
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
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
            })}
          </div>
        </div>
      </div>

      {/* 우측: 직원 카드 리스트 */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {selectedDept || '전체 직원'} 
            <span className="text-slate-400 font-normal text-sm">({filteredUsers.length}명)</span>
          </h2>
        </div>
        
        <div className="overflow-auto flex-1 p-6 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            {filteredUsers.map(user => (
              <div key={user.id} className={`group relative p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 ${user.status === 'RETIRED' ? 'bg-slate-50/70 opacity-60' : 'bg-white'}`}>
                
                {/* 본인일 경우에만 수정 버튼 표시 */}
                <div className={`absolute top-3 right-3 flex gap-1 transition-opacity z-10 ${
                      currentUser.id === user.id ? 'opacity-0 group-hover:opacity-100' : 'hidden'
                    }`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingUser(user); }}
                        className="p-1.5 bg-white text-slate-500 hover:text-blue-600 border border-slate-200 rounded-lg shadow-sm hover:shadow"
                        title="수정"
                      >
                        ✏️
                      </button>
                </div>

                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-16 h-16 rounded-2xl object-cover bg-slate-100 shadow-inner"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 truncate">{user.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">
                        {user.position}
                      </span>
                      {user.status === 'RETIRED' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-650 text-[10px] font-bold" style={{ color: '#ef4444', backgroundColor: '#fee2e2' }}>
                          퇴사
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-500 mb-2 font-medium flex justify-between items-center">
                      <span>{user.department}</span>
                      {user.joinDate && <span className="text-[10px] text-slate-400">입사일: {user.joinDate}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <a href={`tel:${user.phone}`} className="flex items-center gap-2 text-xs text-slate-400 hover:text-blue-500 transition-colors">
                        <span>📞</span> {user.phone}
                      </a>
                      <button 
                        onClick={() => onStartChat(user)}
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-blue-500 transition-colors text-left"
                      >
                        <span>💬</span> 메시지 보내기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editingUser && (
        <EditUserModal 
          user={editingUser} 
          currentUser={currentUser}
          onClose={() => setEditingUser(null)} 
          onSave={(updatedUser) => {
            onUpdateUser(updatedUser);
            setEditingUser(null);
          }} 
          onDelete={(userId) => {
            onDeleteUser(userId);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

export default StaffStatus;

import React, { useState } from 'react';
import { User } from '../types';

interface StaffStatusProps {
  users: User[];
  currentUser: User;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onStartChat: (user: User) => void;
}

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSave: (user: User) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    position: user.position,
    department: user.department,
    phone: user.phone,
    password: user.password || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...user, ...formData });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">직원 정보 수정</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
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
            <label className="text-xs font-bold text-slate-500 uppercase">비밀번호</label>
            <input
              type="text"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full mt-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100 transition-colors"
            >
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StaffStatus: React.FC<StaffStatusProps> = ({ users, currentUser, onUpdateUser, onDeleteUser, onStartChat }) => {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Extract departments
  const departments = Array.from(new Set(users.map(u => u.department))).sort();
  
  // Filter users based on selection
  const filteredUsers = selectedDept 
    ? users.filter(u => u.department === selectedDept)
    : users;

  // Tree Node Component
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

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-2xl font-bold text-slate-800">직원현황 / 조직도</h2>
        <p className="text-slate-500">전체 부서별 조직 구성 및 연락처를 확인하고 관리할 수 있습니다.</p>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Left: Organization Tree */}
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

        {/* Right: User Grid */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span>👥</span> {selectedDept || '전체 직원'} 목록
              <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full ml-2">
                {filteredUsers.length}
              </span>
            </h3>
            {/* Optional: Add User Button could go here */}
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            {filteredUsers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <span className="text-4xl mb-4">👻</span>
                <p>소속된 직원이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.sort((a, b) => a.name.localeCompare(b.name)).map(user => (
                  <div key={user.id} className="group relative p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all bg-white hover:bg-blue-50/10">
                    
                    {/* Admin Actions */}
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingUser(user); }}
                        className="p-1.5 bg-white text-slate-500 hover:text-blue-600 border border-slate-200 rounded-lg shadow-sm hover:shadow"
                        title="수정"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteUser(user.id); }}
                        className="p-1.5 bg-white text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg shadow-sm hover:shadow"
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover bg-slate-100"
                        />
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-slate-900 truncate text-base">{user.name}</p>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {user.position}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-blue-600 mb-2 truncate">{user.department}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span>📱</span>
                          <span className="truncate">{user.phone}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onStartChat(user)}
                      className="w-full mt-3 py-1.5 text-[10px] font-bold text-blue-600 border border-blue-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 hover:text-white"
                    >
                      메시지 보내기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingUser && (
        <EditUserModal 
          user={editingUser} 
          onClose={() => setEditingUser(null)} 
          onSave={(updatedUser) => {
            onUpdateUser(updatedUser);
            setEditingUser(null);
          }} 
        />
      )}
    </div>
  );
};

export default StaffStatus;

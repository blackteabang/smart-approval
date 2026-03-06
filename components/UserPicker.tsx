
import React, { useState } from 'react';
import { User } from '../types';

interface UserPickerProps {
  onSelect: (user: User) => void;
  onClose: () => void;
  users: User[];
  excludeIds?: string[];
}

const UserPicker: React.FC<UserPickerProps> = ({ onSelect, onClose, users, excludeIds = [] }) => {
  const [search, setSearch] = useState('');
  
  const filteredUsers = users.filter(user => 
    !excludeIds.includes(user.id) && 
    (user.name.includes(search) || user.department.includes(search))
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-96 rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">결재자 추가</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-4">
          <input 
            type="text" 
            placeholder="이름 또는 부서 검색..." 
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-4"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredUsers.length > 0 ? filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => {
                  onSelect(user);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0">
                  <img src={user.avatar} alt="" className="w-full h-full rounded-full" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.name} {user.position}</p>
                  <p className="text-xs text-slate-500">{user.department}</p>
                </div>
              </button>
            )) : (
              <p className="text-center py-8 text-sm text-slate-400">검색 결과가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPicker;

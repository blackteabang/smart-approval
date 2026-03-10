
import React, { useState } from 'react';
import { User } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  mockUsers: User[];
  onSignUp: (newUser: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, mockUsers, onSignUp }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    position: '사원',
    department: '영업부',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // Normalize phone number (remove hyphens)
      const inputPhone = formData.phone.replace(/-/g, '');
      
      const user = mockUsers.find(u => {
        const userPhone = u.phone.replace(/-/g, '');
        return userPhone === inputPhone && u.password === formData.password;
      });

      if (user) {
        onLogin(user);
      } else {
        setError('휴대폰 번호 또는 비밀번호가 올바르지 않습니다.');
      }
    } else {
      // Basic validation for sign up
      if (!formData.name || !formData.phone || !formData.password) {
        setError('모든 필드를 입력해주세요.');
        return;
      }
      
      // Check for duplicate phone (normalized)
      const inputPhone = formData.phone.replace(/-/g, '');
      if (mockUsers.some(u => u.phone.replace(/-/g, '') === inputPhone)) {
        setError('이미 등록된 휴대폰 번호입니다.');
        return;
      }

      const newUser: User = {
        id: `u-${Date.now()}`,
        name: formData.name,
        position: formData.position,
        department: formData.department,
        phone: formData.phone, // Store as entered, or normalize if preferred
        password: formData.password,
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`
      };
      onSignUp(newUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 mb-6">
            <span className="text-3xl text-white">⚡</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">리맨전자결재</h1>
          <p className="text-slate-500 mt-2">기업용 인공지능 전자결재 시스템</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 p-8 overflow-hidden relative">
          <div className="flex mb-8 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              로그인
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">이름</label>
                  <input 
                    name="name"
                    type="text" 
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="홍길동"
                    className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">직급</label>
                    <select 
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none"
                    >
                      <option>사원</option>
                      <option>대리</option>
                      <option>과장</option>
                      <option>차장</option>
                      <option>부장</option>
                      <option>이사</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">부서</label>
                    <select 
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none"
                    >
                      <option>기획부</option>
                      <option>인사팀</option>
                      <option>마케팅팀</option>
                      <option>영업부</option>
                      <option>IT지원팀</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">휴대폰 번호</label>
              <input 
                name="phone"
                type="tel" 
                value={formData.phone}
                onChange={handleChange}
                placeholder="010-0000-0000"
                className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">비밀번호</label>
              <input 
                name="password"
                type="password" 
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-red-500 mt-2 text-center animate-pulse">
                {error}
              </p>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] mt-4"
            >
              {isLogin ? '로그인하기' : '회원가입 완료'}
            </button>
          </form>

          {isLogin && (
            <div className="mt-6 text-center">
              <button className="text-xs text-slate-400 hover:text-blue-500 transition-colors">
                비밀번호를 잊으셨나요?
              </button>
            </div>
          )}
        </div>

        <p className="text-center mt-8 text-xs text-slate-400">
          © 2024 리맨전자결재 Inc. 모든 권리 보유.
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
